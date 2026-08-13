import { APP_ROUTES } from '../../config/routes'
import { useEffect, useMemo, useRef, useState } from 'react'
import { KeyRound, Plus, ShieldCheck, Trash2, UserCheck } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { BackLink, Badge, Button, Drawer, FormActions, FormField, FormGrid, FormSection, PageChrome, PageHeader, SearchInput } from '../../components/core'
import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { employeeFullName } from '../../services/employeesService'
import { masterNames } from '../../services/masterDataService'
import { EXTRA_CAPABILITIES, ROLE_DEFINITIONS, roleLabel } from '../../services/userAccountsService'
import { deleteDirectoryUserAccount, loadDirectoryDepartments, loadDirectoryEmployees, loadDirectoryUserAccounts, resetDirectoryUserPassword, saveDirectoryUserAccount } from '../../services/backend/directoryService'
import { IS_PRODUCTION } from '../../core/runtime'
import { useI18n } from '../../i18n'
import { capabilityLabel, roleDefinitionPresentation } from './studioPresentation'
import './UserAccessPage.css'

const empty={employeeId:'',displayName:'',username:'',email:'',department:'',role:'department_user',status:'pending',capabilities:[],scopeMode:'own',scopeDepartments:[]}

export default function UserAccessPage(){
  const { language }=useI18n()
  const L=(el,en)=>language==='en'?en:el
  const navigate=useNavigate()
  const location=useLocation()
  const [searchParams]=useSearchParams()
  const [employees,setEmployees]=useState([])
  const [rows,setRows]=useState([])
  const [loading,setLoading]=useState(true)
  const [q,setQ]=useState('')
  const [editing,setEditing]=useState(undefined)
  const [form,setForm]=useState(empty)
  const [error,setError]=useState('')
  const [employeeQuery,setEmployeeQuery]=useState('')
  const [employeeMenuOpen,setEmployeeMenuOpen]=useState(false)
  const [feedback,setFeedback]=useState('')
  const employeeBoxRef=useRef(null)
  const requestedEmployeeId=searchParams.get('employeeId')

  useEffect(()=>{
    let active=true
    Promise.all([loadDirectoryDepartments(),loadDirectoryEmployees(),loadDirectoryUserAccounts()])
      .then(([,employeeRows,userRows])=>{
        if(!active)return
        setEmployees(employeeRows)
        setRows(userRows)
        setLoading(false)
      })
      .catch(err=>{
        if(!active)return
        setError(localizeAccountError(err?.message,language)||L('Δεν ήταν δυνατή η φόρτωση των χρηστών.','Users could not be loaded.'))
        setLoading(false)
      })
    return()=>{active=false}
  },[language])

  useEffect(()=>{
    function onPointerDown(event){
      if(employeeBoxRef.current && !employeeBoxRef.current.contains(event.target)) setEmployeeMenuOpen(false)
    }
    function onKeyDown(event){ if(event.key==='Escape') setEmployeeMenuOpen(false) }
    document.addEventListener('mousedown',onPointerDown)
    document.addEventListener('keydown',onKeyDown)
    return()=>{document.removeEventListener('mousedown',onPointerDown);document.removeEventListener('keydown',onKeyDown)}
  },[])

  useEffect(()=>{
    if(!requestedEmployeeId)return
    const requestedEmployee=employees.find(e=>String(e.id)===String(requestedEmployeeId))
    const requestedAccount=rows.find(r=>String(r.employeeId)===String(requestedEmployeeId))
    setError('')
    if(requestedAccount){
      setEditing(requestedAccount)
      setForm({...empty,...requestedAccount,capabilities:[...(requestedAccount.capabilities||[])],scopeDepartments:[...(requestedAccount.scopeDepartments||[])]})
      setEmployeeQuery(requestedAccount.displayName||'')
      return
    }
    if(requestedEmployee){
      const name=employeeFullName(requestedEmployee)
      setEditing(null)
      setForm({...empty,employeeId:requestedEmployee.id,displayName:name,email:requestedEmployee.email||'',department:requestedEmployee.department||'',username:suggestUsername(requestedEmployee),capabilities:[],scopeDepartments:[]})
      setEmployeeQuery(name)
    }
  },[requestedEmployeeId,employees,rows])

  const availableEmployees=useMemo(()=>{
    const used=new Set(rows.filter(r=>r.id!==editing?.id&&r.employeeId).map(r=>String(r.employeeId)))
    const needle=employeeQuery.trim().toLocaleLowerCase('el-GR')
    return employees
      .filter(e=>{
        if(used.has(String(e.id)))return false
        const hay=[employeeFullName(e),e.department,e.employeeCode,e.email].filter(Boolean).join(' ').toLocaleLowerCase('el-GR')
        return !needle || hay.includes(needle)
      })
      .sort((a,b)=>employeeFullName(a).localeCompare(employeeFullName(b),'el'))
      .slice(0,12)
  },[employees,rows,editing,employeeQuery])

  function closeEditor(){
    setEditing(undefined);setError('');setFeedback('');setEmployeeMenuOpen(false);setEmployeeQuery('')
    if(requestedEmployeeId){
      if(location.state?.fromEmployeeAccount)navigate(-1)
      else navigate(APP_ROUTES.STUDIO_USERS,{replace:true})
    }
  }

  const filtered=useMemo(()=>rows.filter(r=>[r.displayName,r.username,r.email,r.department,roleLabel(r.role,language)].join(' ').toLowerCase().includes(q.toLowerCase())),[rows,q,language])

  function open(row=null){
    setError('')
    setFeedback('')
    setEditing(row)
    const next=row?{...empty,...row,capabilities:[...(row.capabilities||[])],scopeDepartments:[...(row.scopeDepartments||[])]}:{...empty,capabilities:[],scopeDepartments:[]}
    setForm(next)
    setEmployeeQuery(row?.displayName||'')
    setEmployeeMenuOpen(false)
  }

  function chooseEmployee(e){
    if(!e)return
    const name=employeeFullName(e)
    setForm(c=>({...c,employeeId:e.id,displayName:name,email:e.email||'',department:e.department||'',username:c.username||suggestUsername(e)}))
    setEmployeeQuery(name)
    setEmployeeMenuOpen(false)
  }

  async function save(e){
    e.preventDefault()
    try{
      if(!form.employeeId) throw new Error(L('Επιλέξτε εργαζόμενο από τη λίστα Προσωπικού.','Select an employee from the Staff list.'))
      const linkedEmployee=employees.find(employee=>String(employee.id)===String(form.employeeId))
      if(!linkedEmployee) throw new Error(L('Ο συνδεδεμένος εργαζόμενος δεν βρέθηκε πλέον στο Προσωπικό.','The linked employee can no longer be found in Staff.'))
      const employeeDepartment=linkedEmployee.department||''
      if(!employeeDepartment) throw new Error(L('Ο εργαζόμενος δεν έχει βασικό τμήμα στην καρτέλα Προσωπικού. Συμπληρώστε πρώτα το τμήμα του εργαζομένου.','The employee has no primary department in the Staff record. Set the employee department first.'))
      if(IS_PRODUCTION&&!String(form.email||'').trim()) throw new Error(L('Στο Production mode απαιτείται email για την πρόσκληση χρήστη.','Production mode requires an email address for the user invitation.'))

      const isUpdate=Boolean(editing?.id)
      const saved=await saveDirectoryUserAccount({...form,department:employeeDepartment,id:editing?.id})
      const persisted=await loadDirectoryUserAccounts()
      const verified=persisted.find(row=>String(row.id)===String(saved?.id||editing?.id) || String(row.employeeId)===String(form.employeeId))
      if(!verified) throw new Error(L('Ο λογαριασμός δεν αποθηκεύτηκε στο κοινό μητρώο χρηστών. Δοκιμάστε ξανά.','The account was not saved to the shared user registry. Try again.'))
      setRows(persisted)
      setEditing(verified)
      setForm({...empty,...verified,capabilities:[...(verified.capabilities||[])],scopeDepartments:[...(verified.scopeDepartments||[])]})
      setEmployeeQuery(verified.displayName||'')
      setEmployeeMenuOpen(false)
      setError('')
      setFeedback(isUpdate
        ? L('Ο λογαριασμός ενημερώθηκε επιτυχώς.','Account updated successfully.')
        : IS_PRODUCTION
          ? L('Ο λογαριασμός δημιουργήθηκε και εστάλη πρόσκληση στο email του χρήστη.','The account was created and an invitation was sent to the user email.')
          : L('Ο λογαριασμός δημιουργήθηκε επιτυχώς και εμφανίζεται πλέον στο μητρώο Χρηστών.','Account created successfully and is now visible in the Users registry.'))
      notifyAction(isUpdate?L('Ο λογαριασμός ενημερώθηκε επιτυχώς.','Account updated successfully.'):L('Ο λογαριασμός δημιουργήθηκε επιτυχώς.','Account created successfully.'))
    }catch(err){
      setFeedback('')
      setError(localizeAccountError(err?.message,language)||L('Δεν ήταν δυνατή η αποθήκευση του λογαριασμού.','The account could not be saved.'))
    }
  }

  async function invite(){
    if(!editing)return
    if(IS_PRODUCTION){
      setFeedback(L('Η πρόσκληση αποστέλλεται αυτόματα όταν δημιουργείται ο λογαριασμός.','The invitation is sent automatically when the account is created.'))
      return
    }
    const updated=await saveDirectoryUserAccount({...editing,status:'invited',inviteSentAt:new Date().toISOString()})
    setRows(await loadDirectoryUserAccounts())
    setEditing(updated)
    setForm({...empty,...updated,capabilities:[...(updated.capabilities||[])],scopeDepartments:[...(updated.scopeDepartments||[])]})
    setFeedback(L('Η πρόσκληση ενεργοποίησης καταγράφηκε.','Activation invitation recorded.'))
    notifyAction(L('Η πρόσκληση ενεργοποίησης καταγράφηκε.','Activation invitation recorded.'))
  }
  async function reset(){
    if(!editing)return
    try{
      await resetDirectoryUserPassword(editing)
      setFeedback(IS_PRODUCTION?L('Εστάλη email επαναφοράς κωδικού.','Password reset email sent.'):L('Το αίτημα επαναφοράς κωδικού καταγράφηκε.','Password reset request recorded.'))
      notifyAction(L('Το αίτημα επαναφοράς κωδικού καταγράφηκε.','Password reset request recorded.'))
    }catch(err){setError(localizeAccountError(err?.message,language)||L('Δεν ήταν δυνατή η επαναφορά κωδικού.','Password reset could not be requested.'))}
  }
  async function remove(){
    if(!editing||!confirmAction(L('Να διαγραφεί ο λογαριασμός πρόσβασης;','Delete this access account?')))return
    try{
      await deleteDirectoryUserAccount(editing.id)
      setRows(await loadDirectoryUserAccounts())
      notifyAction(L('Ο λογαριασμός διαγράφηκε.','Account deleted.'))
      closeEditor()
    }catch(err){setError(localizeAccountError(err?.message,language)||L('Δεν ήταν δυνατή η διαγραφή του λογαριασμού.','The account could not be deleted.'))}
  }

  return <PageChrome className="ua-page" back={<BackLink onClick={()=>navigate(APP_ROUTES.STUDIO)}>{L('Πίσω στο Κέντρο Διαχείρισης','Back to Management Center')}</BackLink>} header={<PageHeader title={L('Χρήστες','Users')} description={L('Λογαριασμοί πρόσβασης συνδεδεμένοι με το Προσωπικό, βασικός ρόλος, πρόσβαση σε τμήματα και πρόσθετες αρμοδιότητες.','Access accounts linked to Staff, with a base role, department scope and additional capabilities.')} actions={<><Button variant="secondary" icon={<ShieldCheck size={16}/>} onClick={()=>navigate(APP_ROUTES.STUDIO_ROLES)}>{L('Ρόλοι & Δικαιώματα','Roles & Permissions')}</Button><Button icon={<Plus size={16}/>} onClick={()=>open()}>{L('Νέος λογαριασμός','New account')}</Button></>}/>}>
    <div className="ua-note"><ShieldCheck size={18}/><div><strong>{L('Ένας εργαζόμενος = ένας λογαριασμός','One employee = one account')}</strong><span>{IS_PRODUCTION?L('Οι λογαριασμοί και οι προσκλήσεις διαχειρίζονται μέσω Supabase Auth. Ρόλος και πρόσβαση αποθηκεύονται στο production backend.','Accounts and invitations are managed through Supabase Auth. Role and access scope are stored in the production backend.'):L('Το Demo mode χρησιμοποιεί τοπικό μητρώο χρηστών χωρίς πραγματικούς κωδικούς.','Demo mode uses a local user registry without real passwords.')}</span></div></div>
    <SearchInput value={q} onChange={setQ} placeholder={L('Αναζήτηση ονόματος, username, τμήματος ή ρόλου…','Search name, username, department or role…')} />
    <div className="ua-list">
      {loading&&<div className="ua-empty">{L('Φόρτωση χρηστών…','Loading users…')}</div>}
      {!loading&&filtered.map(row=><div role="button" tabIndex={0} className="ua-row" key={row.id} onClick={()=>open(row)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(row)}}}>
        <div className="ua-row__identity"><strong>{row.displayName||row.username}</strong><span>{row.username}{row.email?` · ${row.email}`:''}</span></div>
        <div className="ua-row__meta"><span>{row.department||L('Χωρίς τμήμα','No department')}</span><span>{departmentAccessLabel(row,language)}</span></div>
        <div className="ua-row__role"><Badge tone="neutral">{roleLabel(row.role,language)}</Badge><small>{L('Τελευταία σύνδεση:','Last login:')} {formatLastLogin(row.lastLogin,language)}</small></div>
        <Badge tone={row.status==='active'?'success':row.status==='disabled'?'neutral':'warning'}>{statusLabel(row.status,language)}</Badge>
      </div>)}
      {!loading&&!filtered.length&&<div className="ua-empty">{L("Δεν υπάρχουν λογαριασμοί.","No accounts.")}</div>}
    </div>

    <Drawer open={editing!==undefined} onClose={closeEditor} title={editing?L('Λογαριασμός χρήστη','User account'):L('Νέος λογαριασμός','New account')} footer={<FormActions form="user-account-form" onCancel={closeEditor} />}>
      <form id="user-account-form" onSubmit={save}>
        <FormSection title={L('Σύνδεση με προσωπικό','Staff link')}>
          <FormGrid columns={2}>
            <FormField label={L('Εργαζόμενος','Employee')}>
              <div className="ua-employee-combobox" ref={employeeBoxRef}>
                <input value={employeeQuery} placeholder={L('Επιλέξτε ή αναζητήστε εργαζόμενο…','Select or search employee…')} onFocus={()=>setEmployeeMenuOpen(true)} onChange={e=>{setEmployeeQuery(e.target.value);setEmployeeMenuOpen(true);if(form.employeeId)setForm(c=>({...c,employeeId:''}))}} aria-autocomplete="list" aria-expanded={employeeMenuOpen}/>
                {form.employeeId&&<div className="ua-employee-selected">{L('Επιλεγμένος εργαζόμενος:','Selected employee:')} <strong>{form.displayName}</strong></div>}
                {employeeMenuOpen&&<div className="ua-employee-options" role="listbox">
                  {availableEmployees.map(e=><button type="button" className="ua-employee-option" role="option" key={e.id} onMouseDown={ev=>ev.preventDefault()} onClick={()=>chooseEmployee(e)}><strong>{employeeFullName(e)}</strong><span>{[e.department,e.employeeCode,e.email].filter(Boolean).join(' · ')}</span></button>)}
                  {!availableEmployees.length&&<div className="ua-employee-empty">{L("Δεν βρέθηκε διαθέσιμος εργαζόμενος.","No available employee found.")}</div>}
                </div>}
              </div>
            </FormField>
            <FormField label={L('Ονοματεπώνυμο','Full name')}><input value={form.displayName||''} onChange={e=>setForm({...form,displayName:e.target.value})}/></FormField>
            <FormField label="Username *"><input required value={form.username||''} onChange={e=>setForm({...form,username:e.target.value})}/></FormField>
            <FormField label="Email"><input type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/></FormField>
          </FormGrid>
        </FormSection>

        <FormSection title={L('Πρόσβαση','Access')} description={L('Επιλέξτε σε ποια τμήματα θα μπορεί να βλέπει ή να καταχωρεί δεδομένα ο χρήστης. Τα δικαιώματα του ρόλου εξακολουθούν να ισχύουν.','Choose which departments the user can view or enter data in. Role permissions still apply.')}>
          <FormGrid columns={2}>
            <FormField label={L('Βασικός ρόλος','Base role')}><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{ROLE_DEFINITIONS.map(r=><option value={r.id} key={r.id}>{roleDefinitionPresentation(r,language).label}</option>)}</select></FormField>
            <FormField label={L('Βασικό τμήμα','Primary department')}><div className="ua-derived-field"><input value={form.department||''} readOnly disabled placeholder={L('Προκύπτει από τον εργαζόμενο','Taken from employee record')}/><small>{L('Συμπληρώνεται αυτόματα από το βασικό τμήμα στην καρτέλα Προσωπικού.','Automatically taken from the primary department in the Staff record.')}</small></div></FormField>
            <FormField label={L('Πρόσβαση σε τμήματα','Department access')}><select value={form.scopeMode||'own'} onChange={e=>setForm({...form,scopeMode:e.target.value,scopeDepartments:e.target.value==='selected'?(form.scopeDepartments||[]):[]})}><option value="own">{L("Μόνο το βασικό τμήμα","Primary department only")}</option><option value="selected">{L("Συγκεκριμένα τμήματα","Selected departments")}</option><option value="all">{L("Όλα τα τμήματα","All departments")}</option></select></FormField>
            <FormField label={L('Κατάσταση','Status')}><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="pending">{L("Εκκρεμεί ενεργοποίηση","Pending activation")}</option><option value="invited">{L("Πρόσκληση εστάλη","Invitation sent")}</option><option value="active">{L("Ενεργός","Active")}</option><option value="disabled">{L("Ανενεργός","Disabled")}</option></select></FormField>
          </FormGrid>
          {form.scopeMode==='selected'&&<DepartmentAccessSelector language={language} value={form.scopeDepartments||[]} onChange={scopeDepartments=>setForm({...form,scopeDepartments})}/>}
        </FormSection>

        <FormSection title={L('Πρόσθετες αρμοδιότητες','Additional capabilities')} description={L('Οι αρμοδιότητες προστίθενται πάνω στον βασικό ρόλο χωρίς να δημιουργούμε νέους σύνθετους ρόλους.','Capabilities are added on top of the base role without creating complex role variants.')}>
          <div className="ua-capabilities">{EXTRA_CAPABILITIES.map(c=><label key={c.id}><input type="checkbox" checked={(form.capabilities||[]).includes(c.id)} onChange={e=>setForm({...form,capabilities:e.target.checked?[...(form.capabilities||[]),c.id]:(form.capabilities||[]).filter(x=>x!==c.id)})}/><span>{capabilityLabel(c,language)}</span></label>)}</div>
        </FormSection>

        {feedback&&<div className="ua-success">{feedback}</div>}
        {error&&<div className="ua-error">{error}</div>}
        {editing&&<div className="ua-secondary-actions">{!IS_PRODUCTION&&<Button type="button" variant="secondary" icon={<UserCheck size={16}/>} onClick={invite}>{L('Αποστολή πρόσκλησης','Send invitation')}</Button>}<Button type="button" variant="secondary" icon={<KeyRound size={16}/>} onClick={reset}>{L('Επαναφορά κωδικού','Reset password')}</Button><Button type="button" variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>{L('Διαγραφή λογαριασμού','Delete account')}</Button></div>}
      </form>
    </Drawer>
  </PageChrome>
}


function DepartmentAccessSelector({value,onChange,language='el'}){
  const L=(el,en)=>language==='en'?en:el
  const departments=masterNames('departments')
  return <div className="ua-department-scope"><span>{L('Συγκεκριμένα τμήματα','Selected departments')}</span><div>{departments.map(dep=><label key={dep}><input type="checkbox" checked={value.includes(dep)} onChange={e=>onChange(e.target.checked?[...value,dep]:value.filter(x=>x!==dep))}/><span>{dep}</span></label>)}</div></div>
}

function statusLabel(v,language='el'){
  const el={pending:'Εκκρεμεί',invited:'Πρόσκληση',active:'Ενεργός',disabled:'Ανενεργός'}
  const en={pending:'Pending',invited:'Invited',active:'Active',disabled:'Disabled'}
  return (language==='en'?en:el)[v]||v
}
function formatLastLogin(value,language='el'){
  if(!value)return'—'
  const d=new Date(value)
  return Number.isNaN(d.getTime())?String(value):d.toLocaleString(language==='en'?'en-GB':'el-GR',{dateStyle:'short',timeStyle:'short'})
}
function departmentAccessLabel(row,language='el'){
  const L=(el,en)=>language==='en'?en:el
  if(row.scopeMode==='all')return L('Όλα τα τμήματα','All departments')
  if(row.scopeMode==='selected')return (row.scopeDepartments||[]).join(', ')||L('Συγκεκριμένα τμήματα','Selected departments')
  return row.department?(language==='en'?`Only ${row.department}`:`Μόνο ${row.department}`):L('Μόνο το βασικό τμήμα','Primary department only')
}
function suggestUsername(e){if(!e)return'';const emailLocal=String(e.email||'').trim().split('@')[0];if(emailLocal)return emailLocal.toLowerCase().replace(/[^a-z0-9._-]/g,'');const base=[e.firstName?.[0],e.lastName].filter(Boolean).join('.').toLowerCase();return transliterateGreek(base).replace(/[^a-z0-9.]/g,'').replace(/^\.+|\.+$/g,'')}
function transliterateGreek(value=''){const map={α:'a',β:'v',γ:'g',δ:'d',ε:'e',ζ:'z',η:'i',θ:'th',ι:'i',κ:'k',λ:'l',μ:'m',ν:'n',ξ:'x',ο:'o',π:'p',ρ:'r',σ:'s',ς:'s',τ:'t',υ:'y',φ:'f',χ:'ch',ψ:'ps',ω:'o'};return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').split('').map(ch=>map[ch]??ch).join('')}

function localizeAccountError(message,language='el'){
  if(language!=='en') return message
  const map={
    'Το username είναι υποχρεωτικό.':'Username is required.',
    'Το username χρησιμοποιείται ήδη.':'Username is already in use.',
    'Ο εργαζόμενος έχει ήδη λογαριασμό πρόσβασης.':'This employee already has an access account.',
    'Επιλέξτε τουλάχιστον ένα τμήμα στην «Πρόσβαση σε τμήματα».':'Select at least one department under Department access.',
    'Δεν ήταν δυνατή η μόνιμη αποθήκευση του μητρώου Χρηστών.':'The Users registry could not be saved persistently.',
    'The last active administrator cannot be deleted.':'The last active administrator cannot be deleted.',
  }
  return map[message]||message
}
