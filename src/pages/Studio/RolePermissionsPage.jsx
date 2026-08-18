import { APP_ROUTES } from '../../config/routes'
import { useEffect, useMemo, useState } from 'react'
import { Edit3, Save, ShieldCheck, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BackLink, Button, PageChrome, PageHeader } from '../../components/core'
import { notifyAction } from '../../components/core/feedback/index'
import { loadRoleConfig, ROLE_DEFINITIONS } from '../../services/userAccountsService'
import { loadRoleConfiguration, saveRoleConfiguration } from '../../services/backend/roleConfigurationBackendService'
import { useI18n } from '../../i18n'
import { accessLevelLabel, moduleLabel, roleDefinitionPresentation } from './studioPresentation'
import { MODULES, PROTECTED_ROLE_RULES } from '../../services/accessControlService'
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
  'Προβολή στα επιτρεπόμενα τμήματα',
  'Καταχώρηση στο επιτρεπόμενο τμήμα',
  'Καταχώρηση στα επιτρεπόμενα τμήματα',
  'Προβολή · Διαχείριση',
  'Προβολή · Επεξεργασία στα επιτρεπόμενα τμήματα',
  'Προβολή · Διαχείριση στα επιτρεπόμενα τμήματα',
  'Περιορισμένη προβολή',
]

export default function RolePermissionsPage() {
  const { language }=useI18n()
  const L=(el,en)=>language==='en'?en:el
  const navigate=useNavigate()
  const [rows,setRows]=useState(loadRoleConfig)
  const [editingRole,setEditingRole]=useState(null)
  const [draft,setDraft]=useState(rows)
  const [feedback,setFeedback]=useState('')
  useEffect(()=>{loadRoleConfiguration().then(saved=>{setRows(saved);setDraft(saved)}).catch(()=>{})},[])

  const role=useMemo(()=>ROLE_DEFINITIONS.find(r=>r.id===editingRole),[editingRole])

  function beginEdit(roleId){
    setEditingRole(roleId)
    setDraft(rows.map(row=>({...row})))
    setFeedback('')
  }

  function cancelEdit(){
    setEditingRole(null)
    setDraft(rows.map(row=>({...row})))
  }

  function change(module,value){
    setDraft(current=>current.map(row=>row.module===module?{...row,[editingRole]:value}:row))
  }

  async function save(){
    try{
      const saved=await saveRoleConfiguration(draft)
      setRows(saved)
      setEditingRole(null)
      const roleName=roleDefinitionPresentation(role,language).label
      setFeedback(language==='en'?`Permissions for “${roleName}” were saved.`:`Τα δικαιώματα του ρόλου «${roleName}» αποθηκεύτηκαν.`)
      notifyAction(L('Τα δικαιώματα αποθηκεύτηκαν.','Permissions saved.'))
    }catch(error){
      console.error('Role permission save failed',error)
      notifyAction(L('Η αποθήκευση δικαιωμάτων απέτυχε. Ελέγξτε τους προστατευμένους κανόνες πρόσβασης.','Permission save failed. Check protected access rules.'))
    }
  }

  return <PageChrome
    className="role-permissions-page"
    back={<BackLink onClick={()=>navigate(APP_ROUTES.STUDIO)}>{L('Πίσω στο Κέντρο Διαχείρισης','Back to Management Center')}</BackLink>}
    header={<PageHeader
      eyebrow={L('ΑΣΦΑΛΕΙΑ & ΠΡΟΣΒΑΣΗ','SECURITY & ACCESS')}
      title={L('Ρόλοι & Δικαιώματα','Roles & Permissions')}
      description={L('Ορίστε τι μπορεί να βλέπει και να κάνει κάθε βασικός ρόλος. Η πρόσβαση σε τμήματα ρυθμίζεται ξεχωριστά στον λογαριασμό κάθε χρήστη.','Define what each base role can view and do. Department scope is configured separately on each user account.')}
    />}
  >
    <div className="role-summary">
      <ShieldCheck size={18}/>
      <span>{L('Οι βασικοί ρόλοι είναι προκαθορισμένοι ώστε να διατηρείται καθαρή και ελεγχόμενη πρόσβαση. Τα δικαιώματα κάθε ρόλου μπορούν να προσαρμοστούν από εδώ. Η πρόσβαση στο Κέντρο Διαχείρισης είναι προστατευμένος κανόνας: μόνο ο Διαχειριστής έχει πρόσβαση και δεν μπορεί να αφαιρεθεί από εδώ.','Base roles are predefined to keep access clear and controlled. Permissions for each role can be adjusted here. Management Center access is protected: only the Administrator can access it and this rule cannot be removed here.')}</span>
    </div>

    {feedback&&<div className="role-success">{feedback}</div>}

    <div className="role-permissions-grid">
      {ROLE_DEFINITIONS.map(item=>{
        const view=roleDefinitionPresentation(item,language)
        return <article className={`role-permission-card ${editingRole===item.id?'is-editing':''}`} key={item.id}>
          <div className="role-permission-card__head">
            <div><span>{L('ΒΑΣΙΚΟΣ ΡΟΛΟΣ','BASE ROLE')}</span><h2>{view.label}</h2></div>
            {editingRole===item.id
              ? <div className="role-card-actions">
                  <Button size="sm" variant="secondary" icon={<X size={15}/>} onClick={cancelEdit}>{L('Ακύρωση','Cancel')}</Button>
                  <Button size="sm" icon={<Save size={15}/>} onClick={save}>{L('Αποθήκευση','Save')}</Button>
                </div>
              : <Button size="sm" variant="secondary" icon={<Edit3 size={15}/>} onClick={()=>beginEdit(item.id)}>{L('Επεξεργασία','Edit')}</Button>}
          </div>
          <p>{view.description}</p>
          <div className="role-permission-list">{view.permissions.map(permission=><span key={permission}>{permission}</span>)}</div>
        </article>
      })}
    </div>

    <section className="role-matrix-section">
      <div>
        <h2>{editingRole
          ? `${L('Επεξεργασία','Editing')}: ${roleDefinitionPresentation(role,language).label}`
          : L('Δικαιώματα ανά περιοχή','Permissions by area')}</h2>
        <p>{editingRole
          ? L('Αλλάξτε το επίπεδο πρόσβασης και πατήστε Αποθήκευση.','Change the access level and select Save.')
          : L('Επιλέξτε «Επεξεργασία» σε έναν ρόλο για να αλλάξετε τα δικαιώματά του.','Select Edit on a role to change its permissions.')}</p>
      </div>

      <div className="role-matrix-scroll">
        <table className="role-matrix">
          <thead>
            <tr>
              <th>{L('Περιοχή','Area')}</th>
              {ROLE_DEFINITIONS.map(item=><th key={item.id}>{roleDefinitionPresentation(item,language).label}</th>)}
            </tr>
          </thead>
          <tbody>
            {(editingRole?draft:rows).map(row=><tr key={row.module}>
              <th>{moduleLabel(row.module,language)}</th>
              {ROLE_DEFINITIONS.map(item=><td key={item.id}>
                {editingRole===item.id
                  ? <PermissionSelect value={row[item.id]||'Χωρίς πρόσβαση'} language={language} disabled={Boolean(PROTECTED_ROLE_RULES[row.module]?.[item.id])} onChange={value=>change(row.module,value)}/>
                  : <span className={(row[item.id]||'Χωρίς πρόσβαση')==='Χωρίς πρόσβαση'?'role-none':''}>{accessLevelLabel(row[item.id]||'Χωρίς πρόσβαση',language)}</span>}
              </td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  </PageChrome>
}

function PermissionSelect({value,onChange,language,disabled=false}){
  const options=LEVELS.includes(value)?LEVELS:[value,...LEVELS]
  return <select className="role-permission-select" value={value} disabled={disabled} title={disabled?(language==='en'?'Protected platform-security rule':'Προστατευμένος κανόνας ασφάλειας πλατφόρμας'):undefined} onChange={e=>onChange(e.target.value)}>
    {options.map(option=><option key={option} value={option}>{accessLevelLabel(option,language)}</option>)}
  </select>
}
