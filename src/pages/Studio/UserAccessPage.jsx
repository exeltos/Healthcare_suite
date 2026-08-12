import { useEffect, useMemo, useRef, useState } from 'react'
import { KeyRound, Plus, ShieldCheck, Trash2, UserCheck } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { BackLink, Badge, Button, Drawer, FormActions, FormField, FormGrid, FormSection, PageChrome, PageHeader, SearchInput } from '../../components/core'
import LibraryField from '../../components/core/LibraryField/LibraryField'
import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { loadAllEmployees, employeeFullName } from '../../services/employeesService'
import { masterNames } from '../../services/masterDataService'
import { deleteUserAccount, EXTRA_CAPABILITIES, loadUserAccounts, requestPasswordReset, ROLE_DEFINITIONS, roleLabel, saveUserAccount, sendAccountInvite } from '../../services/userAccountsService'
import './UserAccessPage.css'

const empty={employeeId:'',displayName:'',username:'',email:'',department:'',role:'department_user',status:'pending',capabilities:[],scopeMode:'own',scopeDepartments:[]}

export default function UserAccessPage(){
  const navigate=useNavigate()
  const location=useLocation()
  const [searchParams]=useSearchParams()
  const employees=useMemo(()=>loadAllEmployees(),[])
  const [rows,setRows]=useState(loadUserAccounts)
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
    const requestedAccount=loadUserAccounts().find(r=>String(r.employeeId)===String(requestedEmployeeId))
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
  },[requestedEmployeeId,employees])

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
      else navigate('/studio/users',{replace:true})
    }
  }

  const filtered=useMemo(()=>rows.filter(r=>[r.displayName,r.username,r.email,r.department,roleLabel(r.role)].join(' ').toLowerCase().includes(q.toLowerCase())),[rows,q])

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

  function save(e){
    e.preventDefault()
    try{
      if(!form.employeeId) throw new Error('Επιλέξτε εργαζόμενο από τη λίστα Προσωπικού.')
      const isUpdate=Boolean(editing?.id)
      const saved=saveUserAccount({...form,id:editing?.id})
      const persisted=loadUserAccounts()
      const verified=persisted.find(row=>String(row.id)===String(saved.id) && String(row.employeeId)===String(saved.employeeId))
      if(!verified) throw new Error('Ο λογαριασμός δεν αποθηκεύτηκε στο κοινό μητρώο χρηστών. Δοκιμάστε ξανά.')
      setRows(persisted)
      setEditing(verified)
      setForm({...empty,...verified,capabilities:[...(verified.capabilities||[])],scopeDepartments:[...(verified.scopeDepartments||[])]})
      setEmployeeQuery(verified.displayName||'')
      setEmployeeMenuOpen(false)
      setError('')
      setFeedback(isUpdate?'Ο λογαριασμός ενημερώθηκε επιτυχώς.':'Ο λογαριασμός δημιουργήθηκε επιτυχώς και εμφανίζεται πλέον στο μητρώο Χρηστών.')
      notifyAction(isUpdate?'Ο λογαριασμός ενημερώθηκε επιτυχώς.':'Ο λογαριασμός δημιουργήθηκε επιτυχώς.')
    }catch(err){
      setFeedback('')
      setError(err?.message||'Δεν ήταν δυνατή η αποθήκευση του λογαριασμού.')
    }
  }

  function invite(){if(!editing)return;const r=sendAccountInvite(editing.id);setRows(loadUserAccounts());setEditing(r);setForm({...empty,...r});setFeedback('Η πρόσκληση ενεργοποίησης καταγράφηκε.');notifyAction('Η πρόσκληση ενεργοποίησης καταγράφηκε.')}
  function reset(){if(!editing)return;const r=requestPasswordReset(editing.id);setRows(loadUserAccounts());setEditing(r);setForm({...empty,...r});setFeedback('Το αίτημα επαναφοράς κωδικού καταγράφηκε.');notifyAction('Το αίτημα επαναφοράς κωδικού καταγράφηκε.')}
  function remove(){if(!editing||!confirmAction('Να διαγραφεί ο λογαριασμός πρόσβασης;'))return;deleteUserAccount(editing.id);setRows(loadUserAccounts());notifyAction('Ο λογαριασμός διαγράφηκε.');closeEditor()}

  return <PageChrome className="ua-page" back={<BackLink onClick={()=>navigate('/studio')}>Πίσω στο Κέντρο Διαχείρισης</BackLink>} header={<PageHeader title="Χρήστες" description="Λογαριασμοί πρόσβασης συνδεδεμένοι με το Προσωπικό, βασικός ρόλος, πρόσβαση σε τμήματα και πρόσθετες αρμοδιότητες." actions={<><Button variant="secondary" icon={<ShieldCheck size={16}/>} onClick={()=>navigate('/studio/roles')}>Ρόλοι & Δικαιώματα</Button><Button icon={<Plus size={16}/>} onClick={()=>open()}>Νέος λογαριασμός</Button></>}/>}>
    <div className="ua-note"><ShieldCheck size={18}/><div><strong>Ένας εργαζόμενος = ένας λογαριασμός</strong><span>Το Healthcare Suite δεν αποθηκεύει εμφανείς κωδικούς. Η πραγματική authentication, invitation και password reset θα συνδεθούν με το production backend.</span></div></div>
    <SearchInput value={q} onChange={setQ} placeholder="Αναζήτηση ονόματος, username, τμήματος ή ρόλου…" />
    <div className="ua-list">
      {filtered.map(row=><div role="button" tabIndex={0} className="ua-row" key={row.id} onClick={()=>open(row)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(row)}}}>
        <div className="ua-row__identity"><strong>{row.displayName||row.username}</strong><span>{row.username}{row.email?` · ${row.email}`:''}</span></div>
        <div className="ua-row__meta"><span>{row.department||'Χωρίς τμήμα'}</span><span>{departmentAccessLabel(row)}</span></div>
        <div className="ua-row__role"><Badge tone="neutral">{roleLabel(row.role)}</Badge><small>Τελευταία σύνδεση: {formatLastLogin(row.lastLogin)}</small></div>
        <Badge tone={row.status==='active'?'success':row.status==='disabled'?'neutral':'warning'}>{statusLabel(row.status)}</Badge>
      </div>)}
      {!filtered.length&&<div className="ua-empty">Δεν υπάρχουν λογαριασμοί.</div>}
    </div>

    <Drawer open={editing!==undefined} onClose={closeEditor} title={editing?'Λογαριασμός χρήστη':'Νέος λογαριασμός'} footer={<FormActions form="user-account-form" onCancel={closeEditor} />}>
      <form id="user-account-form" onSubmit={save}>
        <FormSection title="Σύνδεση με προσωπικό">
          <FormGrid columns={2}>
            <FormField label="Εργαζόμενος">
              <div className="ua-employee-combobox" ref={employeeBoxRef}>
                <input value={employeeQuery} placeholder="Επιλέξτε ή αναζητήστε εργαζόμενο…" onFocus={()=>setEmployeeMenuOpen(true)} onChange={e=>{setEmployeeQuery(e.target.value);setEmployeeMenuOpen(true);if(form.employeeId)setForm(c=>({...c,employeeId:''}))}} aria-autocomplete="list" aria-expanded={employeeMenuOpen}/>
                {form.employeeId&&<div className="ua-employee-selected">Επιλεγμένος εργαζόμενος: <strong>{form.displayName}</strong></div>}
                {employeeMenuOpen&&<div className="ua-employee-options" role="listbox">
                  {availableEmployees.map(e=><button type="button" className="ua-employee-option" role="option" key={e.id} onMouseDown={ev=>ev.preventDefault()} onClick={()=>chooseEmployee(e)}><strong>{employeeFullName(e)}</strong><span>{[e.department,e.employeeCode,e.email].filter(Boolean).join(' · ')}</span></button>)}
                  {!availableEmployees.length&&<div className="ua-employee-empty">Δεν βρέθηκε διαθέσιμος εργαζόμενος.</div>}
                </div>}
              </div>
            </FormField>
            <FormField label="Ονοματεπώνυμο"><input value={form.displayName||''} onChange={e=>setForm({...form,displayName:e.target.value})}/></FormField>
            <FormField label="Username *"><input required value={form.username||''} onChange={e=>setForm({...form,username:e.target.value})}/></FormField>
            <FormField label="Email"><input type="email" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/></FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Πρόσβαση" description="Επιλέξτε σε ποια τμήματα θα μπορεί να βλέπει ή να καταχωρεί δεδομένα ο χρήστης. Τα δικαιώματα του ρόλου εξακολουθούν να ισχύουν.">
          <FormGrid columns={2}>
            <FormField label="Βασικός ρόλος"><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{ROLE_DEFINITIONS.map(r=><option value={r.id} key={r.id}>{r.label}</option>)}</select></FormField>
            <FormField label="Βασικό τμήμα"><LibraryField hideLabel libraryKey="departments" value={form.department||''} onChange={value=>setForm({...form,department:value})} placeholder="Επιλέξτε τμήμα"/></FormField>
            <FormField label="Πρόσβαση σε τμήματα"><select value={form.scopeMode||'own'} onChange={e=>setForm({...form,scopeMode:e.target.value,scopeDepartments:e.target.value==='selected'?(form.scopeDepartments||[]):[]})}><option value="own">Μόνο το βασικό τμήμα</option><option value="selected">Συγκεκριμένα τμήματα</option><option value="all">Όλα τα τμήματα</option></select></FormField>
            <FormField label="Κατάσταση"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="pending">Εκκρεμεί ενεργοποίηση</option><option value="invited">Πρόσκληση εστάλη</option><option value="active">Ενεργός</option><option value="disabled">Ανενεργός</option></select></FormField>
          </FormGrid>
          {form.scopeMode==='selected'&&<DepartmentAccessSelector value={form.scopeDepartments||[]} onChange={scopeDepartments=>setForm({...form,scopeDepartments})}/>}
        </FormSection>

        <FormSection title="Πρόσθετες αρμοδιότητες" description="Οι αρμοδιότητες προστίθενται πάνω στον βασικό ρόλο χωρίς να δημιουργούμε νέους σύνθετους ρόλους.">
          <div className="ua-capabilities">{EXTRA_CAPABILITIES.map(c=><label key={c.id}><input type="checkbox" checked={(form.capabilities||[]).includes(c.id)} onChange={e=>setForm({...form,capabilities:e.target.checked?[...(form.capabilities||[]),c.id]:(form.capabilities||[]).filter(x=>x!==c.id)})}/><span>{c.label}</span></label>)}</div>
        </FormSection>

        {feedback&&<div className="ua-success">{feedback}</div>}
        {error&&<div className="ua-error">{error}</div>}
        {editing&&<div className="ua-secondary-actions"><Button type="button" variant="secondary" icon={<UserCheck size={16}/>} onClick={invite}>Αποστολή πρόσκλησης</Button><Button type="button" variant="secondary" icon={<KeyRound size={16}/>} onClick={reset}>Επαναφορά κωδικού</Button><Button type="button" variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>Διαγραφή λογαριασμού</Button></div>}
      </form>
    </Drawer>
  </PageChrome>
}


function DepartmentAccessSelector({value,onChange}){
  const departments=masterNames('departments')
  return <div className="ua-department-scope"><span>Συγκεκριμένα τμήματα</span><div>{departments.map(dep=><label key={dep}><input type="checkbox" checked={value.includes(dep)} onChange={e=>onChange(e.target.checked?[...value,dep]:value.filter(x=>x!==dep))}/><span>{dep}</span></label>)}</div></div>
}

function statusLabel(v){return ({pending:'Εκκρεμεί',invited:'Πρόσκληση',active:'Ενεργός',disabled:'Ανενεργός'})[v]||v}
function formatLastLogin(value){if(!value)return'—';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString('el-GR',{dateStyle:'short',timeStyle:'short'})}
function departmentAccessLabel(row){if(row.scopeMode==='all')return'Όλα τα τμήματα';if(row.scopeMode==='selected')return (row.scopeDepartments||[]).join(', ')||'Συγκεκριμένα τμήματα';return row.department?`Μόνο ${row.department}`:'Μόνο το βασικό τμήμα'}
function suggestUsername(e){if(!e)return'';const emailLocal=String(e.email||'').trim().split('@')[0];if(emailLocal)return emailLocal.toLowerCase().replace(/[^a-z0-9._-]/g,'');const base=[e.firstName?.[0],e.lastName].filter(Boolean).join('.').toLowerCase();return transliterateGreek(base).replace(/[^a-z0-9.]/g,'').replace(/^\.+|\.+$/g,'')}
function transliterateGreek(value=''){const map={α:'a',β:'v',γ:'g',δ:'d',ε:'e',ζ:'z',η:'i',θ:'th',ι:'i',κ:'k',λ:'l',μ:'m',ν:'n',ξ:'x',ο:'o',π:'p',ρ:'r',σ:'s',ς:'s',τ:'t',υ:'y',φ:'f',χ:'ch',ψ:'ps',ω:'o'};return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').split('').map(ch=>map[ch]??ch).join('')}
