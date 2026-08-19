import { IS_PRODUCTION } from '../../core/runtime'
import { emitAppEvent, APP_EVENTS } from '../../core/events'
import { readJsonObject, writeJsonCache } from '../../core/storage'
import { requireSupabase } from '../../integrations/supabase'
import { loadMasterData, saveMasterData } from '../masterDataService'
import { loadAllEmployees, saveEmployees, upsertEmployee, deleteEmployee } from '../employeesService'
import {
  deleteUserAccount,
  loadUserAccounts,
  requestPasswordReset,
  saveUserAccount,
  USER_ACCOUNTS_EVENT,
} from '../userAccountsService'

export async function loadDirectoryDepartments(){
  if(!IS_PRODUCTION) return localDepartments()
  const client=requireSupabase()
  const { data,error }=await client.from('departments').select('id,code,name,active').order('name')
  if(error) throw error
  const rows=(data||[]).map(mapDepartmentFromDb)
  mirrorDepartments(rows)
  return rows
}

export async function saveDirectoryDepartment(input={}){
  if(!IS_PRODUCTION){
    const current=localDepartments()
    const row={...input,id:input.id||`department-${Date.now()}`,status:input.status||'Ενεργό'}
    const next=current.some(x=>x.id===row.id)?current.map(x=>x.id===row.id?row:x):[row,...current]
    mirrorDepartments(next)
    return row
  }
  const client=requireSupabase()
  const organizationId=await currentOrganizationId(client)
  const payload={
    organization_id:organizationId,
    code:emptyToNull(input.code),
    name:String(input.name||'').trim(),
    active:input.status!=='Ανενεργό',
  }
  if(!payload.name) throw new Error('Department name is required.')
  let query=client.from('departments')
  query=input.id
    ? query.update(payload).eq('id',input.id)
    : query.insert(payload)
  const { data,error }=await query.select('id,code,name,active').single()
  if(error) throw error
  const row=mapDepartmentFromDb(data)
  await loadDirectoryDepartments()
  return row
}

export async function deleteDirectoryDepartment(id){
  if(!IS_PRODUCTION){
    mirrorDepartments(localDepartments().filter(x=>x.id!==id))
    return true
  }
  const client=requireSupabase()
  const { error }=await client.from('departments').delete().eq('id',id)
  if(error) throw error
  await loadDirectoryDepartments()
  return true
}

export async function loadDirectoryEmployees(){
  if(!IS_PRODUCTION) return loadAllEmployees()
  const client=requireSupabase()
  const { data,error }=await client
    .from('employees')
    .select('id,employee_code,first_name,last_name,father_name,professional_category,gender,email,phone,hire_date,notes,status,department:departments(id,name,code)')
    .order('last_name')
    .order('first_name')
  if(error) throw error
  const rows=(data||[]).map(mapEmployeeFromDb)
  mirrorEmployees(rows)
  return rows
}

export async function saveDirectoryEmployee(input={}){
  if(!IS_PRODUCTION) return upsertEmployee(input)
  const client=requireSupabase()
  const organizationId=await currentOrganizationId(client)
  const departmentId=await resolveDepartmentId(client,organizationId,input.department,{requiredWhenNamed:true})
  const payload={
    organization_id:organizationId,
    employee_code:emptyToNull(input.employeeCode),
    first_name:String(input.firstName||'').trim(),
    last_name:String(input.lastName||'').trim(),
    father_name:String(input.fatherName||'').trim(),
    professional_category:String(input.professionalCategory||'').trim(),
    gender:String(input.gender||'').trim(),
    department_id:departmentId,
    email:emptyToNull(input.email),
    phone:emptyToNull(input.phone),
    hire_date:dateOrNull(input.hireDate,'Hire date'),
    notes:String(input.notes||''),
    status:input.status==='Ανενεργό'?'inactive':'active',
  }
  if(!payload.first_name || !payload.last_name) throw new Error('Employee first and last name are required.')
  if(payload.employee_code){
    let duplicateQuery=client.from('employees').select('id')
      .eq('organization_id',organizationId).eq('employee_code',payload.employee_code)
    if(input.id) duplicateQuery=duplicateQuery.neq('id',String(input.id))
    const {data:duplicateCode,error:duplicateCodeError}=await duplicateQuery.limit(1)
    if(duplicateCodeError)throw duplicateCodeError
    if(duplicateCode?.length)throw new Error('Employee code already exists.')
  }
  let query=client.from('employees')
  query=input.id
    ? query.update(payload).eq('id',input.id)
    : query.insert(payload)
  const { data,error }=await query
    .select('id,employee_code,first_name,last_name,father_name,professional_category,gender,email,phone,hire_date,notes,status,department:departments(id,name,code)')
    .single()
  if(error) throw error
  const row=mapEmployeeFromDb(data)
  await loadDirectoryEmployees()
  return row
}

export async function deleteDirectoryEmployee(id){
  if(!IS_PRODUCTION) return deleteEmployee(id)
  const client=requireSupabase()
  const { error }=await client.from('employees').delete().eq('id',id)
  if(error) throw error
  await loadDirectoryEmployees()
  return true
}

export async function loadEmployeeOccupationalVisits(employeeId){
  if(!IS_PRODUCTION){
    return loadAllEmployees().find(row=>String(row.id)===String(employeeId))?.occupationalVisits||[]
  }
  const client=requireSupabase()
  const { data,error }=await client
    .from('employee_occupational_visits')
    .select('id,employee_id,visit_date,fitness,next_review_date,notes,created_at,updated_at')
    .eq('employee_id',employeeId)
    .order('visit_date',{ascending:false})
  if(error) throw error
  return (data||[]).map(row=>({
    id:row.id,
    employeeId:row.employee_id,
    date:row.visit_date||'',
    fitness:row.fitness||'',
    nextReviewDate:row.next_review_date||'',
    notes:row.notes||'',
    createdAt:row.created_at||null,
    updatedAt:row.updated_at||null,
  }))
}

export async function saveEmployeeOccupationalVisit(employeeId,input={}){
  if(!IS_PRODUCTION){
    const employee=loadAllEmployees().find(row=>String(row.id)===String(employeeId))
    if(!employee) throw new Error('Employee not found.')
    const current=Array.isArray(employee.occupationalVisits)?employee.occupationalVisits:[]
    const row={...input,id:input.id||`OH-${Date.now()}`}
    const next=current.some(item=>String(item.id)===String(row.id))
      ? current.map(item=>String(item.id)===String(row.id)?row:item)
      : [row,...current]
    const saved=upsertEmployee({...employee,occupationalVisits:next})
    return saved.occupationalVisits.find(item=>String(item.id)===String(row.id))||row
  }
  const client=requireSupabase()
  const organizationId=await currentOrganizationId(client)
  const payload={
    organization_id:organizationId,
    employee_id:employeeId,
    visit_date:input.date,
    fitness:String(input.fitness||''),
    next_review_date:emptyToNull(input.nextReviewDate),
    notes:String(input.notes||''),
  }
  if(!payload.visit_date) throw new Error('Visit date is required.')
  if(payload.next_review_date && payload.next_review_date < payload.visit_date) throw new Error('Next review date cannot precede the occupational-health visit date.')
  let query=client.from('employee_occupational_visits')
  query=input.id?query.update(payload).eq('id',input.id):query.insert(payload)
  const { data,error }=await query.select('id,employee_id,visit_date,fitness,next_review_date,notes,created_at,updated_at').single()
  if(error) throw error
  return {
    id:data.id,employeeId:data.employee_id,date:data.visit_date||'',fitness:data.fitness||'',
    nextReviewDate:data.next_review_date||'',notes:data.notes||'',createdAt:data.created_at||null,updatedAt:data.updated_at||null,
  }
}

export async function deleteEmployeeOccupationalVisit(employeeId,visitId){
  if(!IS_PRODUCTION){
    const employee=loadAllEmployees().find(row=>String(row.id)===String(employeeId))
    if(!employee) return false
    upsertEmployee({...employee,occupationalVisits:(employee.occupationalVisits||[]).filter(item=>String(item.id)!==String(visitId))})
    return true
  }
  const client=requireSupabase()
  const { error }=await client.from('employee_occupational_visits').delete().eq('id',visitId).eq('employee_id',employeeId)
  if(error) throw error
  return true
}

export async function loadDirectoryUserAccounts(){
  if(!IS_PRODUCTION) return loadUserAccounts()
  const client=requireSupabase()
  const { data,error }=await client
    .from('user_profiles')
    .select(`
      user_id,organization_id,employee_id,username,email,display_name,role,status,scope_mode,capabilities,last_login,created_at,updated_at,
      employee:employees(id,department:departments(id,name,code)),
      access:user_department_access(department_id,can_view,can_create,can_edit,department:departments(id,name,code))
    `)
    .order('display_name')
  if(error) throw error
  const rows=(data||[]).map(mapUserFromDb)
  mirrorUsers(rows)
  return rows
}

export async function saveDirectoryUserAccount(input={}){
  if(!IS_PRODUCTION) return saveUserAccount(input)
  if(input.id) return updateProductionUserAccount(input)
  return createProductionUserAccount(input)
}

export async function deleteDirectoryUserAccount(id){
  if(!IS_PRODUCTION){
    deleteUserAccount(id)
    return true
  }
  const client=requireSupabase()
  const { data,error }=await client.functions.invoke('admin-user-account',{
    body:{ action:'delete', userId:id },
  })
  if(error) throw error
  if(data?.error) throw new Error(data.error)
  await loadDirectoryUserAccounts()
  return true
}

export async function resetDirectoryUserPassword(row){
  if(!IS_PRODUCTION) return requestPasswordReset(row.id)
  const email=String(row?.email||'').trim()
  if(!email) throw new Error('User email is required.')
  const client=requireSupabase()
  const { error }=await client.auth.resetPasswordForEmail(email,{
    redirectTo:typeof window!=='undefined'?`${window.location.origin}/reset-password` : undefined,
  })
  if(error) throw error
  return row
}

async function createProductionUserAccount(input){
  const client=requireSupabase()
  const organizationId=await currentOrganizationId(client)
  const departments=await loadDirectoryDepartments()
  const departmentIds=scopeDepartmentIds(input,departments)
  if(input.scopeMode==='selected'&&departmentIds.length!==(input.scopeDepartments||[]).length)throw new Error('One or more selected departments are not valid for this organization.')
  if(!input.employeeId)throw new Error('A staff record must be linked to the user account.')
  const {data:linkedEmployee,error:employeeError}=await client.from('employees').select('id,department_id,status').eq('organization_id',organizationId).eq('id',String(input.employeeId)).maybeSingle()
  if(employeeError)throw employeeError
  if(!linkedEmployee)throw new Error('The linked employee was not found in this organization.')
  const {data:existingAccount,error:existingError}=await client.from('user_profiles').select('user_id').eq('organization_id',organizationId).eq('employee_id',String(input.employeeId)).limit(1)
  if(existingError)throw existingError
  if(existingAccount?.length)throw new Error('This employee already has an access account.')
  const { data,error }=await client.functions.invoke('admin-user-account',{
    body:{
      action:'create',
      email:String(input.email||'').trim(),
      username:String(input.username||'').trim(),
      displayName:String(input.displayName||'').trim(),
      role:input.role||'department_user',
      employeeId:input.employeeId||null,
      scopeMode:input.scopeMode||'own',
      capabilities:Array.isArray(input.capabilities)?input.capabilities:[],
      departmentIds,
    },
  })
  if(error) throw error
  if(data?.error) throw new Error(data.error)
  const rows=await loadDirectoryUserAccounts()
  return rows.find(x=>x.id===data.userId)||rows.find(x=>x.employeeId===input.employeeId)||null
}

async function updateProductionUserAccount(input){
  const client=requireSupabase()
  const organizationId=await currentOrganizationId(client)
  const departments=await loadDirectoryDepartments()
  const departmentIds=scopeDepartmentIds(input,departments)
  if(input.scopeMode==='selected'&&departmentIds.length!==(input.scopeDepartments||[]).length)throw new Error('One or more selected departments are not valid for this organization.')
  if(!input.employeeId)throw new Error('A staff record must be linked to the user account.')
  const {data:linkedEmployee,error:employeeError}=await client.from('employees').select('id').eq('organization_id',organizationId).eq('id',String(input.employeeId)).maybeSingle()
  if(employeeError)throw employeeError
  if(!linkedEmployee)throw new Error('The linked employee was not found in this organization.')
  const { data,error }=await client.functions.invoke('admin-user-account',{
    body:{
      action:'update',
      userId:input.id,
      email:String(input.email||'').trim(),
      username:String(input.username||'').trim(),
      displayName:String(input.displayName||'').trim(),
      role:input.role||'department_user',
      status:input.status||'active',
      scopeMode:input.scopeMode||'own',
      capabilities:Array.isArray(input.capabilities)?input.capabilities:[],
      departmentIds,
    },
  })
  if(error) throw error
  if(data?.error) throw new Error(data.error)
  const rows=await loadDirectoryUserAccounts()
  return rows.find(x=>x.id===input.id)||null
}

function scopeDepartmentIds(input,departments){
  if(input.scopeMode!=='selected') return []
  const byName=new Map(departments.map(dep=>[normalize(dep.name),dep.id]))
  return (input.scopeDepartments||[]).map(name=>byName.get(normalize(name))).filter(Boolean)
}

async function currentOrganizationId(client){
  const { data,error }=await client.rpc('current_organization_id')
  if(error) throw error
  if(!data) throw new Error('Organization context not found.')
  return data
}

async function resolveDepartmentId(client,organizationId,name,{requiredWhenNamed=false}={}){
  const clean=String(name||'').trim()
  if(!clean) return null
  const { data,error }=await client
    .from('departments')
    .select('id,name')
    .eq('organization_id',organizationId)
    .eq('name',clean)
    .limit(1)
  if(error) throw error
  const id=data?.[0]?.id||null
  if(requiredWhenNamed&&!id) throw new Error(`Department not found in Supabase: ${clean}`)
  return id
}

function localDepartments(){
  return (loadMasterData().departments||[]).map(row=>({
    id:row.id,
    code:row.code||'',
    name:row.name||'',
    status:row.status||'Ενεργό',
  }))
}

function mirrorDepartments(rows){
  const master=readJsonObject('limoxisMasterData',{})
  const departments=rows.map(row=>({
    id:row.id,
    code:row.code||'',
    name:row.name||'',
    status:row.status||'Ενεργό',
  }))
  if(JSON.stringify(master.departments||[])===JSON.stringify(departments)) return
  const next={...master,departments}
  writeJsonCache('limoxisMasterData',next)
  emitAppEvent(APP_EVENTS.MASTER_DATA_UPDATED,next)
}

function mirrorEmployees(rows){
  const master=readJsonObject('limoxisMasterData',{})
  const next={...master,'employees-library':rows}
  writeJsonCache('limoxisMasterData',next)
  emitAppEvent(APP_EVENTS.MASTER_DATA_UPDATED,next)
  emitAppEvent(APP_EVENTS.EMPLOYEES_UPDATED,rows)
}

function mirrorUsers(rows){
  writeJsonCache('healthcare-suite.user-accounts',rows)
  emitAppEvent(USER_ACCOUNTS_EVENT,{entityType:'user-account',source:'supabase-cache'})
}

function mapDepartmentFromDb(row={}){
  return {
    id:row.id,
    code:row.code||'',
    name:row.name||'',
    status:row.active===false?'Ανενεργό':'Ενεργό',
  }
}

function mapEmployeeFromDb(row={}){
  const department=Array.isArray(row.department)?row.department[0]:row.department
  return {
    id:row.id,
    employeeCode:row.employee_code||'',
    firstName:row.first_name||'',
    lastName:row.last_name||'',
    fatherName:row.father_name||'',
    fullName:[row.last_name,row.first_name].filter(Boolean).join(' '),
    professionalCategory:row.professional_category||'',
    gender:row.gender||'',
    department:department?.name||'',
    email:row.email||'',
    phone:row.phone||'',
    hireDate:row.hire_date||'',
    notes:row.notes||'',
    occupationalVisits:[],
    vaccinations:[],
    status:row.status==='inactive'?'Ανενεργό':'Ενεργό',
  }
}

function mapUserFromDb(row={}){
  const employee=Array.isArray(row.employee)?row.employee[0]:row.employee
  const employeeDepartment=Array.isArray(employee?.department)?employee.department[0]:employee?.department
  const access=Array.isArray(row.access)?row.access:[]
  return {
    id:row.user_id,
    organizationId:row.organization_id,
    employeeId:row.employee_id||'',
    displayName:row.display_name||'',
    username:row.username||'',
    email:row.email||'',
    department:employeeDepartment?.name||'',
    role:row.role||'department_user',
    status:row.status||'active',
    capabilities:Array.isArray(row.capabilities)?row.capabilities:[],
    scopeMode:row.scope_mode||'own',
    scopeDepartments:access.map(item=>{
      const dep=Array.isArray(item.department)?item.department[0]:item.department
      return dep?.name
    }).filter(Boolean),
    createdAt:row.created_at||null,
    updatedAt:row.updated_at||null,
    lastLogin:row.last_login||null,
  }
}

function emptyToNull(value){
  const text=String(value??'').trim()
  return text||null
}
function normalize(value=''){
  return String(value).trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el-GR')
}

function dateOrNull(value,label='Date'){
  const text=String(value??'').trim()
  if(!text)return null
  if(!/^\d{4}-\d{2}-\d{2}$/.test(text))throw new Error(`${label} must use YYYY-MM-DD format.`)
  return text
}
