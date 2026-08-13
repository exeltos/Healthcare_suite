import { readSessionValue } from '../../core/storage'
import { loadAllEmployees } from '../employeesService'
import { EXTRA_CAPABILITIES, loadUserAccounts, roleLabel } from '../userAccountsService'
import { IS_PRODUCTION } from '../../core/runtime'

export function loadCurrentProfile(language='el'){
  let sessionUser=null
  try{ sessionUser=JSON.parse(readSessionValue('healthcare-suite.user')||'null') }catch{}
  if(!sessionUser)return null


  if(IS_PRODUCTION && sessionUser.authSource==='production-provider'){
    const capabilities=Array.isArray(sessionUser.capabilities)?sessionUser.capabilities:[]
    return {
      demo:false,
      displayName:sessionUser.displayName||sessionUser.name||'—',
      initials:sessionUser.initials||initialsOf(sessionUser.displayName||sessionUser.name||''),
      username:sessionUser.username||sessionUser.email||'',
      email:sessionUser.email||'',
      professionalCategory:sessionUser.professionalCategory||'',
      department:departmentDisplay(sessionUser.department||'',language),
      role:sessionUser.role||'department_user',
      roleLabel:roleLabel(sessionUser.role||'department_user',language),
      capabilities,
      capabilityLabels:capabilities.map(id=>{
        const c=EXTRA_CAPABILITIES.find(item=>item.id===id)
        return (language==='en'?c?.labelEn:c?.label)||id
      }),
      scopeMode:sessionUser.scopeMode||'own',
      scopeDepartments:(sessionUser.scopeDepartments||[]).map(dep=>departmentDisplay(dep,language)),
      scopeLabel:productionScopeLabel(sessionUser,language),
      languageLabel:language==='en'?'English':'Ελληνικά',
      lastLogin:sessionUser.lastLogin||null,
    }
  }

  if(sessionUser.demo){
    return {
      demo:true,
      displayName: language==='en'?'Demo User':'Χρήστης Demo',
      initials:'DEMO',
      username:'demo',
      email:'',
      professionalCategory: language==='en'?'Demonstration account':'Λογαριασμός επίδειξης',
      department: language==='en'?'Demo environment':'Περιβάλλον Demo',
      role:'demo',
      roleLabel:'Demo',
      capabilities:[],
      capabilityLabels:[],
      scopeMode:'demo',
      scopeDepartments:[],
      scopeLabel: language==='en'?'Demo data only':'Μόνο δεδομένα Demo',
      languageLabel:language==='en'?'English':'Ελληνικά',
      lastLogin:null,
    }
  }

  const accounts=loadUserAccounts()
  const account=accounts.find(row=>
    (sessionUser.username && String(row.username).toLowerCase()===String(sessionUser.username).toLowerCase()) ||
    (sessionUser.name && String(row.username).toLowerCase()===String(sessionUser.name).toLowerCase()) ||
    (sessionUser.employeeId && String(row.employeeId)===String(sessionUser.employeeId))
  )
  const employee=account?.employeeId?loadAllEmployees().find(row=>String(row.id)===String(account.employeeId)):null
  const capabilities=account?.capabilities||[]
  return {
    demo:false,
    displayName:account?.displayName||sessionUser.name||'—',
    initials:sessionUser.initials||initialsOf(account?.displayName||sessionUser.name||''),
    username:account?.username||sessionUser.username||sessionUser.name||'',
    email:account?.email||employee?.email||'',
    professionalCategory:employee?.professionalCategory||'',
    department:departmentDisplay(account?.department||employee?.department||'',language),
    role:account?.role||sessionUser.role||'department_user',
    roleLabel:roleLabel(account?.role||sessionUser.role||'department_user',language),
    capabilities,
    capabilityLabels:capabilities.map(id=>{
      const c=EXTRA_CAPABILITIES.find(item=>item.id===id)
      return (language==='en'?c?.labelEn:c?.label)||id
    }),
    scopeMode:account?.scopeMode||'own',
    scopeDepartments:(account?.scopeDepartments||[]).map(dep=>departmentDisplay(dep,language)),
    scopeLabel:scopeLabel(account,language),
    languageLabel:language==='en'?'English':'Ελληνικά',
    lastLogin:account?.lastLogin||null,
  }
}
function initialsOf(value=''){return String(value).trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function scopeLabel(account,language){
  const L=(el,en)=>language==='en'?en:el
  if(!account)return L('Βασικό τμήμα','Primary department')
  if(account.scopeMode==='all')return L('Όλα τα τμήματα','All departments')
  if(account.scopeMode==='selected'){
    const deps=(account.scopeDepartments||[]).map(dep=>departmentDisplay(dep,language))
    return deps.length?deps.join(', '):L('Συγκεκριμένα τμήματα','Selected departments')
  }
  return L('Μόνο το βασικό τμήμα','Primary department only')
}

const DEPARTMENT_EN={
  'ΜΕΘ':'ICU','Μονάδα Εντατικής Θεραπείας':'ICU','ΤΕΠ':'Emergency Department',
  'Τμήμα Επειγόντων Περιστατικών':'Emergency Department','Χειρουργείο':'Operating Theatre',
  'Χειρουργική':'Surgery','Χειρουργική Κλινική':'Surgical Ward','Παθολογική':'Internal Medicine',
  'Παθολογική Κλινική':'Internal Medicine','Παιδιατρική':'Pediatrics','Αποστείρωση':'Sterile Services',
  'Αιμοκάθαρση':'Hemodialysis','Μικροβιολογικό Εργαστήριο':'Microbiology Laboratory',
  'Τεχνική Υπηρεσία':'Technical Services'
}
function departmentDisplay(value='',language='el'){return language==='en'?(DEPARTMENT_EN[value]||value):value}

function productionScopeLabel(user,language){
  const L=(el,en)=>language==='en'?en:el
  if(user.scopeMode==='all')return L('Όλα τα τμήματα','All departments')
  if(user.scopeMode==='selected'){
    const deps=(user.scopeDepartments||[]).map(dep=>departmentDisplay(dep,language))
    return deps.length?deps.join(', '):L('Συγκεκριμένα τμήματα','Selected departments')
  }
  return L('Μόνο το βασικό τμήμα','Primary department only')
}
