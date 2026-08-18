import { useEffect, useMemo, useState } from 'react'
import { Activity, BellRing, DatabaseBackup, FileClock, GraduationCap, LockKeyhole, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import { BackLink, Badge, Button, FormField, FormGrid, FormSection, PageChrome } from '../../components/core'
import PageHeader from '../../components/core/PageHeader/PageHeader'
import { APP_ROUTES } from '../../config/routes'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { notifyAction } from '../../components/core/feedback'
import {
  loadAuditTrail,loadSecurityEvents,loadNotificationPolicies,saveNotificationPolicy,
  loadRetentionPolicies,saveRetentionPolicy,loadContinuityProfile,saveContinuityProfile,
  loadRecoveryTests,saveRecoveryTest,loadPrivacyProfile,savePrivacyProfile,loadCompetencyGaps
} from '../../services/backend/governanceBackendService'
import './GovernancePage.css'

const TABS=[
  ['audit',Activity,'Audit Trail','Audit Trail'],
  ['notifications',BellRing,'Ειδοποιήσεις & κλιμάκωση','Notifications & Escalation'],
  ['retention',FileClock,'Διατήρηση δεδομένων','Data Retention'],
  ['continuity',DatabaseBackup,'Συνέχεια λειτουργίας','Business Continuity'],
  ['security',LockKeyhole,'Ασφάλεια & Privacy','Security & Privacy'],
  ['competency',GraduationCap,'Κενά επάρκειας','Competency Gaps'],
]
const POLICY_LABELS={
  critical_lab_result:['Κρίσιμο εργαστηριακό αποτέλεσμα','Critical laboratory result'],
  serious_incident:['Σοβαρό συμβάν','Serious incident'],
  overdue_capa:['Ληξιπρόθεσμο CAPA','Overdue CAPA'],
  document_review_overdue:['Ληξιπρόθεσμη αναθεώρηση εγγράφου','Overdue document review'],
  competency_followup:['Παρακολούθηση επάρκειας','Competency follow-up'],
  committee_action_overdue:['Εκπρόθεσμη ενέργεια επιτροπής','Overdue committee action'],
}
const EVENT_LABELS={
  profile_activated:['Ενεργοποίηση λογαριασμού','Account activated'],
  account_disabled:['Απενεργοποίηση λογαριασμού','Account disabled'],
  account_enabled:['Ενεργοποίηση λογαριασμού','Account enabled'],
  privilege_changed:['Αλλαγή δικαιωμάτων','Privileges changed'],
  department_access_changed:['Αλλαγή πρόσβασης τμήματος','Department access changed'],
}

function dt(value,lang){if(!value)return'—';try{return new Date(value).toLocaleString(lang==='en'?'en-GB':'el-GR')}catch{return value}}
function shortJson(v){if(!v)return'—';const s=JSON.stringify(v);return s.length>150?`${s.slice(0,147)}…`:s}

export default function GovernancePage(){
  const navigate=useNavigate()
  const {language}=useI18n()
  const L=(el,en)=>language==='en'?en:el
  const [tab,setTab]=useState('audit')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [audit,setAudit]=useState([])
  const [events,setEvents]=useState([])
  const [policies,setPolicies]=useState([])
  const [retention,setRetention]=useState([])
  const [continuity,setContinuity]=useState({})
  const [tests,setTests]=useState([])
  const [privacy,setPrivacy]=useState({})
  const [gaps,setGaps]=useState([])
  const [auditSearch,setAuditSearch]=useState('')
  const [testForm,setTestForm]=useState({test_type:'restore',result:'passed',scope:'',tested_at:new Date().toISOString().slice(0,16),actual_rpo_hours:'',actual_rto_hours:'',evidence_reference:'',findings:'',corrective_action_reference:''})

  async function reload(){
    setBusy(true);setError('')
    try{
      const [a,e,p,r,c,t,pr,g]=await Promise.all([
        loadAuditTrail(),loadSecurityEvents(),loadNotificationPolicies(),loadRetentionPolicies(),
        loadContinuityProfile(),loadRecoveryTests(),loadPrivacyProfile(),loadCompetencyGaps()
      ])
      setAudit(a);setEvents(e);setPolicies(p);setRetention(r);setContinuity(c||{});setTests(t);setPrivacy(pr||{});setGaps(g)
    }catch(err){console.error(err);setError(err?.message||L('Αποτυχία φόρτωσης governance δεδομένων.','Governance data could not be loaded.'))}
    finally{setBusy(false)}
  }
  useEffect(()=>{reload()},[]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredAudit=useMemo(()=>{
    const q=auditSearch.trim().toLowerCase()
    if(!q)return audit
    return audit.filter(x=>[x.entity_type,x.entity_id,x.action,x.actor_role,(x.changed_fields||[]).join(' '),x.reason].join(' ').toLowerCase().includes(q))
  },[audit,auditSearch])

  const readiness=useMemo(()=>{
    const enabledPolicies=policies.filter(row=>row.enabled!==false).length
    const closedLoop=policies.filter(row=>row.enabled!==false&&row.settings?.closedLoop).length
    const retentionReady=retention.filter(row=>row.active!==false&&Number(row.retention_years)>0&&String(row.owner||'').trim()).length
    const continuityReady=Boolean(String(continuity.backup_provider||'').trim()&&String(continuity.backup_frequency||'').trim()&&continuity.rpo_hours!==''&&continuity.rto_hours!=='')
    const privacyKeys=['controller_name','dpo_owner']
    const privacyReady=privacyKeys.every(key=>String(privacy[key]||'').trim())&&['processor_contract_confirmed','hosting_region_confirmed','breach_process_confirmed','dsar_process_confirmed','retention_policy_confirmed'].every(key=>privacy[key]===true)
    const recoveryRecent=tests.some(row=>{const d=new Date(row.tested_at||0);return !Number.isNaN(d.getTime())&&(Date.now()-d.getTime())<=365*86400000&&row.result==='passed'})
    return {enabledPolicies,closedLoop,retentionReady,continuityReady,privacyReady,recoveryRecent,gaps:gaps.length}
  },[policies,retention,continuity,privacy,tests,gaps])

  async function savePolicy(row){setBusy(true);try{await saveNotificationPolicy(row);setPolicies(await loadNotificationPolicies());notifyAction(L('Η πολιτική αποθηκεύτηκε.','Policy saved.'))}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function saveRetention(row){setBusy(true);try{await saveRetentionPolicy(row);setRetention(await loadRetentionPolicies());notifyAction(L('Η πολιτική διατήρησης αποθηκεύτηκε.','Retention policy saved.'))}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function saveContinuity(){setBusy(true);try{await saveContinuityProfile(continuity);setContinuity(await loadContinuityProfile());notifyAction(L('Το προφίλ συνέχειας λειτουργίας αποθηκεύτηκε.','Continuity profile saved.'))}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function addTest(){setBusy(true);try{await saveRecoveryTest({...testForm,tested_at:testForm.tested_at?new Date(testForm.tested_at).toISOString():new Date().toISOString()});setTests(await loadRecoveryTests());setTestForm({...testForm,scope:'',evidence_reference:'',findings:'',corrective_action_reference:''});notifyAction(L('Η δοκιμή καταγράφηκε.','Recovery test recorded.'))}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function savePrivacy(){setBusy(true);try{await savePrivacyProfile(privacy);setPrivacy(await loadPrivacyProfile());notifyAction(L('Το privacy checklist αποθηκεύτηκε.','Privacy checklist saved.'))}catch(e){setError(e.message)}finally{setBusy(false)}}

  return <PageChrome className="governance-page"
    back={<BackLink onClick={()=>navigate(APP_ROUTES.STUDIO)}>{L('Πίσω στο Κέντρο Διαχείρισης','Back to Management Center')}</BackLink>}
    header={<PageHeader eyebrow={L('ΔΙΑΚΥΒΕΡΝΗΣΗ & ΣΥΜΜΟΡΦΩΣΗ','GOVERNANCE & COMPLIANCE')} title={L('Governance Center','Governance Center')} description={L('Auditability, escalation, retention, continuity, privacy και competency oversight σε ένα σημείο, χωρίς να επιβαρύνεται η καθημερινή ροή.','Auditability, escalation, retention, continuity, privacy and competency oversight in one place without burdening daily workflows.')} />}
  >
    <div className="gov-topbar">
      <div className="gov-tabs">{TABS.map(([id,Icon,el,en])=><Button key={id} size="sm" variant={tab===id?'primary':'secondary'} className={tab===id?'is-active':''} icon={<Icon size={16}/>} onClick={()=>setTab(id)}>{L(el,en)}</Button>)}</div>
      <Button size="sm" variant="secondary" icon={<RefreshCw size={15}/>} onClick={reload} disabled={busy}>{L('Ανανέωση','Refresh')}</Button>
    </div>
    {error&&<div className="gov-error">{error}</div>}
    <div className="gov-readiness" aria-label={L('Σύνοψη ετοιμότητας governance','Governance readiness summary')}>
      <article><span>{L('Πολιτικές ειδοποίησης','Notification policies')}</span><strong>{readiness.enabledPolicies}/{policies.length||0}</strong><small>{readiness.closedLoop} closed-loop</small></article>
      <article><span>{L('Πολιτικές διατήρησης','Retention policies')}</span><strong>{readiness.retentionReady}/{retention.length||0}</strong><small>{L('με υπεύθυνο και διάρκεια','with owner and duration')}</small></article>
      <article className={readiness.continuityReady&&readiness.recoveryRecent?'is-ready':'needs-attention'}><span>{L('Backup / ανάκτηση','Backup / recovery')}</span><strong>{readiness.continuityReady&&readiness.recoveryRecent?L('Έτοιμο','Ready'):L('Έλεγχος','Review')}</strong><small>{readiness.recoveryRecent?L('restore test ≤ 12 μήνες','restore test ≤ 12 months'):L('απαιτείται πρόσφατο restore test','recent restore test required')}</small></article>
      <article className={readiness.privacyReady?'is-ready':'needs-attention'}><span>Privacy</span><strong>{readiness.privacyReady?L('Τεκμηριωμένο','Documented'):L('Εκκρεμεί','Pending')}</strong><small>{readiness.gaps} {L('κενά επάρκειας','competency gaps')}</small></article>
    </div>

    {tab==='audit'&&<section className="gov-panel">
      <div className="gov-panel__head"><div><h2>{L('Αμετάβλητο Audit Trail','Immutable Audit Trail')}</h2><p>{L('Ποιος άλλαξε τι, πότε και σε ποια εγγραφή. Το ιστορικό είναι μόνο για ανάγνωση.','Who changed what, when and on which record. History is read-only.')}</p></div><input value={auditSearch} onChange={e=>setAuditSearch(e.target.value)} placeholder={L('Αναζήτηση οντότητας, ενέργειας, ρόλου…','Search entity, action, role…')}/></div>
      <div className="gov-table-wrap"><table className="gov-table"><thead><tr><th>{L('Χρόνος','Time')}</th><th>{L('Οντότητα','Entity')}</th><th>{L('Ενέργεια','Action')}</th><th>{L('Ρόλος','Role')}</th><th>{L('Πεδία','Fields')}</th><th>{L('Αιτία / πηγή','Reason / source')}</th></tr></thead><tbody>
        {filteredAudit.length?filteredAudit.map(row=><tr key={row.audit_id}><td>{dt(row.occurred_at,language)}</td><td><strong>{row.entity_type}</strong><small>{row.entity_id||'—'}</small></td><td><Badge tone={row.action==='DELETE'?'danger':row.action==='INSERT'?'success':'neutral'}>{row.action}</Badge></td><td>{row.actor_role||'—'}</td><td>{(row.changed_fields||[]).join(', ')||'—'}</td><td><span>{row.reason||row.source||'—'}</span></td></tr>):<tr><td colSpan="6" className="gov-empty">{L('Δεν υπάρχουν καταγραφές για εμφάνιση.','No audit records to display.')}</td></tr>}
      </tbody></table></div>
    </section>}

    {tab==='notifications'&&<section className="gov-panel">
      <div className="gov-panel__head"><div><h2>{L('Πολιτικές ειδοποίησης & κλιμάκωσης','Notification & escalation policies')}</h2><p>{L('Κεντρικά όρια, σοβαρότητα και closed-loop παρακολούθηση για κρίσιμες εκκρεμότητες.','Central thresholds, severity and closed-loop follow-up for critical pending actions.')}</p></div></div>
      <div className="gov-card-list">{policies.map((row,index)=><article className="gov-edit-card" key={row.policy_key}>
        <div className="gov-edit-card__title"><div><strong>{L(...(POLICY_LABELS[row.policy_key]||[row.policy_key,row.policy_key]))}</strong><small>{row.policy_key}</small></div><label className="gov-switch"><input type="checkbox" checked={row.enabled!==false} onChange={e=>setPolicies(v=>v.map((x,i)=>i===index?{...x,enabled:e.target.checked}:x))}/><span>{L('Ενεργή','Enabled')}</span></label></div>
        <div className="gov-inline-grid">
          <label><span>{L('Σοβαρότητα','Severity')}</span><select value={row.severity||'warning'} onChange={e=>setPolicies(v=>v.map((x,i)=>i===index?{...x,severity:e.target.value}:x))}><option value="info">Info</option><option value="warning">Warning</option><option value="danger">Danger</option></select></label>
          <label><span>{L('Κλιμάκωση μετά από ώρες','Escalate after hours')}</span><input type="number" min="1" value={row.escalation_after_hours??''} onChange={e=>setPolicies(v=>v.map((x,i)=>i===index?{...x,escalation_after_hours:e.target.value}:x))}/></label>
          <label><span>{L('Ρόλοι αποδεκτών','Recipient roles')}</span><input value={(row.settings?.recipientRoles||[]).join(', ')} onChange={e=>setPolicies(v=>v.map((x,i)=>i===index?{...x,settings:{...(x.settings||{}),recipientRoles:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}}:x))}/></label>
          <label className="gov-switch gov-switch--inline"><input type="checkbox" checked={!!row.settings?.closedLoop} onChange={e=>setPolicies(v=>v.map((x,i)=>i===index?{...x,settings:{...(x.settings||{}),closedLoop:e.target.checked}}:x))}/><span>Closed loop</span></label>
        </div>
        <div className="gov-card-actions"><Button size="sm" icon={<Save size={15}/>} onClick={()=>savePolicy(row)} disabled={busy}>{L('Αποθήκευση','Save')}</Button></div>
      </article>)}</div>
    </section>}

    {tab==='retention'&&<section className="gov-panel">
      <div className="gov-panel__head"><div><h2>{L('Διατήρηση & αρχειοθέτηση δεδομένων','Data retention & archiving')}</h2><p>{L('Η λήξη περιόδου δημιουργεί υποχρέωση αναθεώρησης· δεν προκαλεί αυτόματη καταστροφή δεδομένων.','Expiry creates review eligibility; it never causes automatic destructive deletion.')}</p></div></div>
      <div className="gov-card-list">{retention.map((row,index)=><article className="gov-edit-card" key={row.policy_key}>
        <div className="gov-edit-card__title"><div><strong>{row.record_category}</strong><small>{row.policy_key}</small></div><label className="gov-switch"><input type="checkbox" checked={row.active!==false} onChange={e=>setRetention(v=>v.map((x,i)=>i===index?{...x,active:e.target.checked}:x))}/><span>{L('Ενεργή','Active')}</span></label></div>
        <div className="gov-inline-grid gov-inline-grid--wide">
          <label><span>{L('Έτη διατήρησης','Retention years')}</span><input type="number" min="1" max="100" value={row.retention_years} onChange={e=>setRetention(v=>v.map((x,i)=>i===index?{...x,retention_years:e.target.value}:x))}/></label>
          <label><span>{L('Διάθεση','Disposition')}</span><select value={row.disposition} onChange={e=>setRetention(v=>v.map((x,i)=>i===index?{...x,disposition:e.target.value}:x))}><option value="archive">{L('Αρχειοθέτηση','Archive')}</option><option value="review_before_delete">{L('Αναθεώρηση πριν διαγραφή','Review before deletion')}</option></select></label>
          <label><span>{L('Υπεύθυνος','Owner')}</span><input value={row.owner||''} onChange={e=>setRetention(v=>v.map((x,i)=>i===index?{...x,owner:e.target.value}:x))}/></label>
          <label className="gov-span-2"><span>{L('Νομική / οργανωτική βάση','Legal / organizational basis')}</span><input value={row.legal_basis||''} onChange={e=>setRetention(v=>v.map((x,i)=>i===index?{...x,legal_basis:e.target.value}:x))}/></label>
        </div>
        <div className="gov-card-actions"><Button size="sm" onClick={()=>saveRetention(row)} disabled={busy}>{L('Αποθήκευση','Save')}</Button></div>
      </article>)}</div>
    </section>}

    {tab==='continuity'&&<section className="gov-panel">
      <FormSection title={L('Προφίλ backup & recovery','Backup & recovery profile')} description={L('Governance evidence για backup, RPO/RTO και restore testing. Τα πραγματικά backups παραμένουν ευθύνη της υποδομής.','Governance evidence for backup, RPO/RTO and restore testing. Actual backups remain an infrastructure responsibility.')}>
        <FormGrid columns={3}>
          <FormField label={L('Πάροχος backup','Backup provider')}><input value={continuity.backup_provider||''} onChange={e=>setContinuity({...continuity,backup_provider:e.target.value})}/></FormField>
          <FormField label={L('Συχνότητα','Frequency')}><input value={continuity.backup_frequency||''} onChange={e=>setContinuity({...continuity,backup_frequency:e.target.value})}/></FormField>
          <FormField label={L('Υπεύθυνος','Owner')}><input value={continuity.responsible_owner||''} onChange={e=>setContinuity({...continuity,responsible_owner:e.target.value})}/></FormField>
          <FormField label="RPO (hours)"><input type="number" min="0" value={continuity.rpo_hours??''} onChange={e=>setContinuity({...continuity,rpo_hours:e.target.value})}/></FormField>
          <FormField label="RTO (hours)"><input type="number" min="0" value={continuity.rto_hours??''} onChange={e=>setContinuity({...continuity,rto_hours:e.target.value})}/></FormField>
          <FormField label={L('Επόμενο restore test','Next restore test')}><input type="date" value={continuity.next_restore_test_due||''} onChange={e=>setContinuity({...continuity,next_restore_test_due:e.target.value})}/></FormField>
          <FormField label={L('Scope backup','Backup scope')}><input value={continuity.backup_scope||''} onChange={e=>setContinuity({...continuity,backup_scope:e.target.value})}/></FormField>
          <FormField label={L('Runbook / τοποθεσία','Runbook / location')}><input value={continuity.recovery_runbook_location||''} onChange={e=>setContinuity({...continuity,recovery_runbook_location:e.target.value})}/></FormField>
          <FormField label={L('Τελευταίο αποτέλεσμα restore','Last restore result')}><select value={continuity.last_restore_test_result||'not_tested'} onChange={e=>setContinuity({...continuity,last_restore_test_result:e.target.value})}><option value="not_tested">Not tested</option><option value="passed">Passed</option><option value="partial">Partial</option><option value="failed">Failed</option></select></FormField>
        </FormGrid>
        <FormField label={L('Σημειώσεις','Notes')}><textarea rows="3" value={continuity.notes||''} onChange={e=>setContinuity({...continuity,notes:e.target.value})}/></FormField>
        <div className="gov-card-actions"><Button onClick={saveContinuity} disabled={busy}>{L('Αποθήκευση προφίλ','Save profile')}</Button></div>
      </FormSection>

      <FormSection title={L('Καταγραφή δοκιμής ανάκτησης','Record recovery test')}>
        <FormGrid columns={3}>
          <FormField label={L('Τύπος','Type')}><select value={testForm.test_type} onChange={e=>setTestForm({...testForm,test_type:e.target.value})}><option value="restore">Restore</option><option value="failover">Failover</option><option value="downtime_procedure">Downtime procedure</option><option value="tabletop">Tabletop</option></select></FormField>
          <FormField label={L('Αποτέλεσμα','Result')}><select value={testForm.result} onChange={e=>setTestForm({...testForm,result:e.target.value})}><option value="passed">Passed</option><option value="partial">Partial</option><option value="failed">Failed</option></select></FormField>
          <FormField label={L('Ημερομηνία','Date')}><input type="datetime-local" value={testForm.tested_at} onChange={e=>setTestForm({...testForm,tested_at:e.target.value})}/></FormField>
          <FormField label={L('Scope','Scope')}><input value={testForm.scope} onChange={e=>setTestForm({...testForm,scope:e.target.value})}/></FormField>
          <FormField label="Actual RPO"><input type="number" min="0" step="0.1" value={testForm.actual_rpo_hours} onChange={e=>setTestForm({...testForm,actual_rpo_hours:e.target.value})}/></FormField>
          <FormField label="Actual RTO"><input type="number" min="0" step="0.1" value={testForm.actual_rto_hours} onChange={e=>setTestForm({...testForm,actual_rto_hours:e.target.value})}/></FormField>
          <FormField label={L('Evidence reference','Evidence reference')}><input value={testForm.evidence_reference} onChange={e=>setTestForm({...testForm,evidence_reference:e.target.value})}/></FormField>
          <FormField label={L('Ευρήματα','Findings')}><input value={testForm.findings} onChange={e=>setTestForm({...testForm,findings:e.target.value})}/></FormField>
          <FormField label={L('Σχετικό CAPA / ενέργεια','Related CAPA / action')}><input value={testForm.corrective_action_reference} onChange={e=>setTestForm({...testForm,corrective_action_reference:e.target.value})}/></FormField>
        </FormGrid>
        <div className="gov-card-actions"><Button onClick={addTest} disabled={busy}>{L('Καταγραφή δοκιμής','Record test')}</Button></div>
      </FormSection>
      <div className="gov-table-wrap"><table className="gov-table"><thead><tr><th>{L('Ημερομηνία','Date')}</th><th>{L('Τύπος','Type')}</th><th>{L('Αποτέλεσμα','Result')}</th><th>RPO / RTO</th><th>{L('Evidence','Evidence')}</th><th>{L('Ευρήματα','Findings')}</th></tr></thead><tbody>{tests.length?tests.map(x=><tr key={x.id||x.tested_at}><td>{dt(x.tested_at,language)}</td><td>{x.test_type}</td><td><Badge tone={x.result==='passed'?'success':x.result==='failed'?'danger':'warning'}>{x.result}</Badge></td><td>{x.actual_rpo_hours??'—'} / {x.actual_rto_hours??'—'}</td><td>{x.evidence_reference||'—'}</td><td>{x.findings||'—'}</td></tr>):<tr><td colSpan="6" className="gov-empty">{L('Δεν έχουν καταγραφεί δοκιμές.','No tests recorded.')}</td></tr>}</tbody></table></div>
    </section>}

    {tab==='security'&&<section className="gov-panel">
      <FormSection title={L('Privacy / GDPR readiness checklist','Privacy / GDPR readiness checklist')} description={L('Εσωτερικό governance checklist. Δεν αποτελεί από μόνο του νομική πιστοποίηση συμμόρφωσης.','Internal governance checklist. It is not by itself legal certification of compliance.')}>
        <FormGrid columns={2}>
          <FormField label={L('Υπεύθυνος επεξεργασίας / οργανισμός','Controller / organization')}><input value={privacy.controller_name||''} onChange={e=>setPrivacy({...privacy,controller_name:e.target.value})}/></FormField>
          <FormField label={L('DPO / Privacy owner','DPO / Privacy owner')}><input value={privacy.dpo_owner||''} onChange={e=>setPrivacy({...privacy,dpo_owner:e.target.value})}/></FormField>
        </FormGrid>
        <div className="gov-check-grid">
          {[
            ['processor_contract_confirmed','DPA / σύμβαση εκτελούντος επεξεργασία','Processor DPA confirmed'],
            ['hosting_region_confirmed','Επιβεβαίωση περιοχής φιλοξενίας','Hosting region confirmed'],
            ['backup_region_confirmed','Επιβεβαίωση περιοχής backup','Backup region confirmed'],
            ['breach_process_confirmed','Διαδικασία παραβίασης δεδομένων','Data breach process confirmed'],
            ['dsar_process_confirmed','Διαδικασία αιτημάτων υποκειμένων','Data-subject request process'],
            ['retention_policy_confirmed','Εγκεκριμένη πολιτική διατήρησης','Retention policy approved'],
            ['attachment_access_reviewed','Έλεγχος πρόσβασης συνημμένων','Attachment access reviewed'],
            ['analytics_deidentification_reviewed','Έλεγχος de-identification analytics','Analytics de-identification reviewed'],
          ].map(([key,el,en])=><label className="gov-check" key={key}><input type="checkbox" checked={!!privacy[key]} onChange={e=>setPrivacy({...privacy,[key]:e.target.checked})}/><span>{L(el,en)}</span></label>)}
        </div>
        <FormGrid columns={2}><FormField label={L('Τελευταία αναθεώρηση','Last reviewed')}><input type="datetime-local" value={(privacy.last_reviewed_at||'').slice(0,16)} onChange={e=>setPrivacy({...privacy,last_reviewed_at:e.target.value?new Date(e.target.value).toISOString():''})}/></FormField><FormField label={L('Σημειώσεις','Notes')}><input value={privacy.notes||''} onChange={e=>setPrivacy({...privacy,notes:e.target.value})}/></FormField></FormGrid>
        <div className="gov-card-actions"><Button icon={<ShieldCheck size={16}/>} onClick={savePrivacy} disabled={busy}>{L('Αποθήκευση checklist','Save checklist')}</Button></div>
      </FormSection>
      <FormSection title={L('Security activity','Security activity')} description={L('Server-side γεγονότα λογαριασμών και δικαιωμάτων.','Server-side account and privilege events.')}>
        <div className="gov-table-wrap"><table className="gov-table"><thead><tr><th>{L('Χρόνος','Time')}</th><th>{L('Γεγονός','Event')}</th><th>User ID</th><th>{L('Λεπτομέρειες','Details')}</th></tr></thead><tbody>{events.length?events.map(x=><tr key={x.id}><td>{dt(x.occurred_at,language)}</td><td>{L(...(EVENT_LABELS[x.event_type]||[x.event_type,x.event_type]))}</td><td>{x.user_id||'—'}</td><td><code>{shortJson(x.details)}</code></td></tr>):<tr><td colSpan="4" className="gov-empty">{L('Δεν υπάρχουν security events.','No security events.')}</td></tr>}</tbody></table></div>
      </FormSection>
    </section>}

    {tab==='competency'&&<section className="gov-panel">
      <div className="gov-panel__head"><div><h2>{L('Competency gaps & επανεκπαίδευση','Competency gaps & retraining')}</h2><p>{L('Συγκεντρωτική λίστα ληγμένης, ανεπαρκούς ή εκκρεμούς επάρκειας.','Consolidated list of expired, insufficient or pending competency.')}</p></div><Badge tone={gaps.length?'warning':'success'}>{gaps.length} {L('εκκρεμότητες','items')}</Badge></div>
      <div className="gov-table-wrap"><table className="gov-table"><thead><tr><th>{L('Εργαζόμενος','Employee')}</th><th>{L('Τμήμα','Department')}</th><th>{L('Εκπαίδευση','Training')}</th><th>{L('Αποτέλεσμα','Result')}</th><th>{L('Ισχύς έως','Valid until')}</th><th>{L('Αιτία','Reason')}</th></tr></thead><tbody>{gaps.length?gaps.map(x=><tr key={x.id}><td><strong>{x.employeeName}</strong></td><td>{x.department||'—'}</td><td>{x.trainingTitle}</td><td>{x.competencyResult}</td><td>{x.validUntil||'—'}</td><td><Badge tone={x.reason==='expired'?'danger':'warning'}>{x.reason}</Badge></td></tr>):<tr><td colSpan="6" className="gov-empty">{L('Δεν εντοπίζονται κενά επάρκειας στα διαθέσιμα δεδομένα.','No competency gaps detected in available data.')}</td></tr>}</tbody></table></div>
    </section>}
  </PageChrome>
}
