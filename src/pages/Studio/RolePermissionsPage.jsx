import { useMemo, useState } from 'react'
import { Edit3, Save, ShieldCheck, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BackLink, Button, PageChrome, PageHeader } from '../../components/core'
import { notifyAction } from '../../components/core/feedback/index'
import { loadRoleConfig, ROLE_DEFINITIONS, saveRoleConfig } from '../../services/userAccountsService'
import './RolePermissionsPage.css'

const LEVELS=[
  'Χωρίς πρόσβαση',
  'Προβολή',
  'Προβολή · Καταχώρηση',
  'Προβολή · Καταχώρηση · Επεξεργασία',
  'Πλήρης λειτουργική',
  'Πλήρης',
  'Με πρόσθετη αρμοδιότητα',
  'Προβολή στο επιτρεπόμενο τμήμα',
  'Καταχώρηση στο επιτρεπόμενο τμήμα',
]

export default function RolePermissionsPage() {
  const navigate=useNavigate()
  const [rows,setRows]=useState(loadRoleConfig)
  const [editingRole,setEditingRole]=useState(null)
  const [draft,setDraft]=useState(rows)
  const [feedback,setFeedback]=useState('')

  const role=useMemo(()=>ROLE_DEFINITIONS.find(r=>r.id===editingRole),[editingRole])

  function beginEdit(roleId){
    setEditingRole(roleId)
    setDraft(rows.map(row=>({...row})))
    setFeedback('')
  }
  function cancelEdit(){setEditingRole(null);setDraft(rows.map(row=>({...row})))}
  function change(module,value){setDraft(current=>current.map(row=>row.module===module?{...row,[editingRole]:value}:row))}
  function save(){
    const saved=saveRoleConfig(draft)
    setRows(saved)
    setEditingRole(null)
    setFeedback(`Τα δικαιώματα του ρόλου «${role?.label||''}» αποθηκεύτηκαν.`)
    notifyAction('Τα δικαιώματα αποθηκεύτηκαν.')
  }

  return <PageChrome className="role-permissions-page" back={<BackLink onClick={()=>navigate('/studio')}>Πίσω στο Κέντρο Διαχείρισης</BackLink>} header={<PageHeader eyebrow="ΑΣΦΑΛΕΙΑ & ΠΡΟΣΒΑΣΗ" title="Ρόλοι & Δικαιώματα" description="Ορίστε τι μπορεί να βλέπει και να κάνει κάθε βασικός ρόλος. Η πρόσβαση σε τμήματα ρυθμίζεται ξεχωριστά στον λογαριασμό κάθε χρήστη." />}>
    <div className="role-summary"><ShieldCheck size={18}/><span>Οι τρεις βασικοί ρόλοι παραμένουν σταθεροί ώστε να μη δημιουργούνται δεκάδες παραλλαγές. Τα δικαιώματα κάθε ρόλου όμως μπορούν να τροποποιηθούν από εδώ.</span></div>
    {feedback&&<div className="role-success">{feedback}</div>}

    <div className="role-permissions-grid">
      {ROLE_DEFINITIONS.map(item=><article className={`role-permission-card ${editingRole===item.id?'is-editing':''}`} key={item.id}>
        <div className="role-permission-card__head">
          <div><span>ΒΑΣΙΚΟΣ ΡΟΛΟΣ</span><h2>{item.label}</h2></div>
          {editingRole===item.id
            ? <div className="role-card-actions"><Button size="sm" variant="secondary" icon={<X size={15}/>} onClick={cancelEdit}>Ακύρωση</Button><Button size="sm" icon={<Save size={15}/>} onClick={save}>Αποθήκευση</Button></div>
            : <Button size="sm" variant="secondary" icon={<Edit3 size={15}/>} onClick={()=>beginEdit(item.id)}>Επεξεργασία</Button>}
        </div>
        <p>{item.description}</p>
        <div className="role-permission-list">{item.permissions.map(permission=><span key={permission}>{permission}</span>)}</div>
      </article>)}
    </div>

    <section className="role-matrix-section">
      <div><h2>{editingRole?`Επεξεργασία: ${role?.label}`:'Δικαιώματα ανά περιοχή'}</h2><p>{editingRole?'Αλλάξτε το επίπεδο πρόσβασης και πατήστε Αποθήκευση.':'Επιλέξτε «Επεξεργασία» σε έναν ρόλο για να αλλάξετε τα δικαιώματά του.'}</p></div>
      <div className="role-matrix-scroll"><table className="role-matrix"><thead><tr><th>Περιοχή</th><th>Διαχειριστής</th><th>Σύνδεσμος Λοιμώξεων</th><th>Χρήστης Τμήματος</th></tr></thead><tbody>
        {(editingRole?draft:rows).map(row=><tr key={row.module}><th>{row.module}</th>{ROLE_DEFINITIONS.map(item=><td key={item.id}>{editingRole===item.id?<PermissionSelect value={row[item.id]} onChange={value=>change(row.module,value)}/>:<span className={row[item.id]==='Χωρίς πρόσβαση'?'role-none':''}>{row[item.id]}</span>}</td>)}</tr>)}
      </tbody></table></div>
    </section>
  </PageChrome>
}

function PermissionSelect({value,onChange}){
  const options=LEVELS.includes(value)?LEVELS:[value,...LEVELS]
  return <select className="role-permission-select" value={value} onChange={e=>onChange(e.target.value)}>{options.map(option=><option key={option} value={option}>{option}</option>)}</select>
}
