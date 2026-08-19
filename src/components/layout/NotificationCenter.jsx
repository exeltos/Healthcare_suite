import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { Bell, CheckCheck, ClipboardCheck, FileClock, FlaskConical, GraduationCap, ShieldAlert, Siren } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { loadControlPrograms, SURVEILLANCE_PROGRAMS_EVENT } from '../../services/surveillanceControlsService'
import { loadTraining, loadDocuments, loadCommittees, ORGANIZATION_EVENT } from '../../services/organizationService'
import { loadCapa, loadIncidents, loadRisks, QUALITY_EVENT } from '../../services/qualityService'
import { loadPatientSamples, PATIENT_SAMPLES_EVENT } from '../../services/patientSamplesService'
import { loadEnvironmentalSamples, loadStaffSamples, loadWaterRecords, ENVIRONMENTAL_SAMPLES_EVENT, STAFF_SAMPLES_EVENT, WATER_RECORDS_EVENT } from '../../services/laboratorySourcesService'
import { buildNotificationReviewLink } from '../../core/navigation/recordDeepLink'
import { dismissNotifications, loadReadNotificationIds, NOTIFICATION_READ_EVENT } from '../../core/notifications/notificationState'
import { GOVERNANCE_EVENT, loadNotificationPolicies } from '../../services/backend/governanceBackendService'
import { loadCurrentProfile } from '../../services/profile/profileService'
import { useI18n } from '../../i18n'
const DAY = 86400000
const isoToday = () => new Date().toISOString().slice(0, 10)
const parseDate = value => value ? new Date(`${value}T12:00:00`) : null
const daysUntil = value => {
  const date = parseDate(value)
  if (!date) return null
  const today = parseDate(isoToday())
  return Math.ceil((date - today) / DAY)
}
const displayDate = value => value ? parseDate(value)?.toLocaleDateString('el-GR') : '—'

function isTerminalStatus(value=''){
  const normalized=String(value).trim().toLocaleLowerCase('el-GR')
  return ['ολοκληρωμένη','ολοκληρωμενη','ολοκληρωμένο','ολοκληρωμενο','κλειστό','κλειστο','αρχειοθετημένο','αρχειοθετημενο','ακυρωμένη','ακυρωμενη','ακυρωμένο','ακυρωμενο'].includes(normalized)
}

function buildNotifications(policies=[],currentRole=''){
  const items=[]

  // Bell policy: only items that are already overdue. Future reminders belong in the
  // relevant module/dashboard, not in the global alert badge.
  loadControlPrograms().filter(row=>row.active && row.nextDueDate).forEach(row=>{
    const days=daysUntil(row.nextDueDate)
    if(days===null || days>=0) return
    items.push({
      id:`control:${row.id}:${row.nextDueDate}`,
      title:'Εκπρόθεσμος έλεγχος',
      message:`${row.title} · ${displayDate(row.nextDueDate)}`,
      tone:'danger', path:'/surveillance', recordId:row.id, module:'controls', icon:ClipboardCheck, date:row.nextDueDate,
    })
  })

  // A training is an alert only when its scheduled date has passed and it still has
  // not been completed/cancelled.
  loadTraining().filter(row=>row.date && !isTerminalStatus(row.status)).forEach(row=>{
    const days=daysUntil(row.date)
    if(days===null || days>=0) return
    items.push({id:`training:${row.id}:${row.date}`,title:'Εκπρόθεσμη εκπαίδευση',message:`${row.title} · ${displayDate(row.date)}`,tone:'danger',path:'/training',recordId:row.id,module:'training',icon:GraduationCap,date:row.date})
  })

  loadDocuments().filter(row=>row.reviewDate && !isTerminalStatus(row.status)).forEach(row=>{
    const days=daysUntil(row.reviewDate)
    if(days===null || days>=0) return
    items.push({id:`document:${row.id}:${row.reviewDate}`,title:'Εκπρόθεσμη αναθεώρηση εγγράφου',message:`${row.title} · ${displayDate(row.reviewDate)}`,tone:'danger',path:'/documents',recordId:row.id,module:'documents',icon:FileClock,date:row.reviewDate,policyKey:'document_review_overdue'})
  })

  loadCapa().filter(row=>row.dueDate && !isTerminalStatus(row.status)).forEach(row=>{
    const days=daysUntil(row.dueDate)
    if(days===null || days>=0) return
    items.push({id:`capa:${row.id}:${row.dueDate}`,title:'Εκπρόθεσμη CAPA',message:`${row.title} · ${displayDate(row.dueDate)}`,tone:'danger',path:'/quality/capa',recordId:row.id,module:'capa',icon:ShieldAlert,date:row.dueDate,policyKey:'overdue_capa'})
  })

  loadRisks().filter(row=>row.reviewDate && !['Κλειστός','Ακυρωμένος'].includes(row.status)).forEach(row=>{
    const days=daysUntil(row.reviewDate)
    if(days===null || days>=0) return
    items.push({id:`risk:${row.id}:${row.reviewDate}`,title:'Εκπρόθεσμος επανέλεγχος κινδύνου',message:`${row.title} · ${displayDate(row.reviewDate)}`,tone:Number(row.riskScore)>=10?'danger':'warning',path:'/quality/risks',recordId:row.id,module:'risks',icon:ShieldAlert,date:row.reviewDate})
  })

  // Serious safety events stay visible until the investigation has moved beyond the initial report.
  loadIncidents().filter(row=>['Σοβαρή βλάβη','Θάνατος'].includes(row.outcome) && row.status==='Νέα αναφορά').forEach(row=>{
    items.push({id:`incident-serious:${row.id}:${row.date||''}`,title:'Σοβαρό συμβάν προς διερεύνηση',message:`${row.title||row.id} · ${row.department||'—'}`,tone:'danger',path:'/quality/incidents',recordId:row.id,module:'incidents',icon:Siren,date:row.date||isoToday(),policyKey:'serious_incident'})
  })

  // Critical laboratory results are alerts only while closed-loop communication is incomplete.
  const laboratoryRows=[...loadPatientSamples(),...loadStaffSamples(),...loadEnvironmentalSamples(),...loadWaterRecords()]
  laboratoryRows.filter(row=>row.criticalResult && (!row.criticalCommunicatedTo || !row.criticalCommunicatedAt)).forEach(row=>{
    items.push({id:`lab-critical:${row.id}:${row.resultDate||''}`,title:'Κρίσιμο εργαστηριακό αποτέλεσμα',message:`${row.patientCode||row.subjectCode||row.employeeCode||row.id} · απαιτείται γνωστοποίηση`,tone:'danger',path:'/laboratory',recordId:row.id,module:'laboratory',icon:FlaskConical,date:row.resultDate||isoToday(),policyKey:'critical_lab_result'})
  })

  // Competency follow-up includes incomplete/retraining assessments and expired validity.
  loadTraining().filter(row=>row.status==='Ολοκληρωμένη' && row.competencyRequired).forEach(row=>{
    const today=new Date().toISOString().slice(0,10)
    const pending=(row.attendance||[]).filter(a=>{
      if(!['Παρών','Online'].includes(a.status))return false
      const validUntil=a.competencyValidUntil||row.validUntil||''
      return a.competencyResult!=='Επαρκής'||(validUntil&&validUntil<today)
    })
    if(!pending.length)return
    items.push({id:`competency:${row.id}:${pending.map(a=>a.employeeId||a.employeeName).join('-')}`,title:'Εκκρεμής επάρκεια / επανεκπαίδευση',message:`${row.title} · ${pending.length} ${pending.length===1?'εργαζόμενος':'εργαζόμενοι'}`,tone:'warning',path:'/training',recordId:row.id,module:'training',icon:GraduationCap,date:row.date||isoToday(),policyKey:'competency_followup'})
  })

  // Finalized committee decisions with an owner and overdue due date are actionable
  // governance obligations, not merely historical minutes.
  loadCommittees().forEach(committee=>{
    ;(committee.meetings||[]).filter(meeting=>meeting.status==='Οριστικοποιημένη').forEach(meeting=>{
      ;(meeting.actions||[]).filter(action=>action.title && action.dueDate && action.status!=='Ολοκληρωμένη').forEach(action=>{
        const days=daysUntil(action.dueDate)
        if(days===null || days>=0)return
        items.push({
          id:`committee-action:${committee.id}:${meeting.id}:${action.id}:${action.dueDate}`,
          title:'Εκπρόθεσμη ενέργεια επιτροπής',
          message:`${committee.name} · ${action.title}${action.owner?` · ${action.owner}`:''}`,
          tone:'warning',path:'/committees',recordId:committee.id,module:'committees',icon:ClipboardCheck,date:action.dueDate,policyKey:'committee_action_overdue',
        })
      })
    })
  })

  const policyMap=new Map((policies||[]).map(row=>[row.policy_key,row]))
  const governed=items.filter(item=>{
    if(!item.policyKey)return true
    const policy=policyMap.get(item.policyKey)
    if(!policy)return true
    if(policy.enabled===false)return false
    const roles=Array.isArray(policy.settings?.recipientRoles)?policy.settings.recipientRoles:[]
    if(roles.length && currentRole && currentRole!=='admin' && !roles.includes(currentRole))return false
    item.tone=policy.severity||item.tone
    item.governancePolicy=policy
    return true
  })
  return governed.sort((a,b)=>{
    const priority={danger:0,warning:1,info:2,default:3}
    return (priority[a.tone]??3)-(priority[b.tone]??3) || (a.date||'').localeCompare(b.date||'')
  })
}

export default function NotificationCenter(){
  const navigate=useNavigate()
  const {language}=useI18n()
  const L=(el,en)=>language==='en'?en:el
  const ref=useRef(null)
  const [open,setOpen]=useState(false)
  const [version,setVersion]=useState(0)
  const [policyVersion,setPolicyVersion]=useState(0)
  const [readIds,setReadIds]=useState(loadReadNotificationIds)
  const [policies,setPolicies]=useState([])
  const currentRole=loadCurrentProfile()?.role||''
  useAppEvents([SURVEILLANCE_PROGRAMS_EVENT, ORGANIZATION_EVENT, QUALITY_EVENT, PATIENT_SAMPLES_EVENT, STAFF_SAMPLES_EVENT, ENVIRONMENTAL_SAMPLES_EVENT, WATER_RECORDS_EVENT], () => setVersion(v => v + 1))
  useAppEvents(GOVERNANCE_EVENT, () => { setPolicyVersion(v => v + 1); setVersion(v => v + 1) })
  useAppEvents(NOTIFICATION_READ_EVENT, () => setReadIds(loadReadNotificationIds()), { includeStorage: true })
  // Governance policy reads are independent from operational data refreshes.
  // A laboratory/patient event must never cause another policy GET.
  useEffect(()=>{loadNotificationPolicies().then(setPolicies).catch(()=>setPolicies([]))},[policyVersion])
  useEffect(()=>{
    const onPointerDown=event=>{if(open && ref.current && !ref.current.contains(event.target))setOpen(false)}
    document.addEventListener('pointerdown',onPointerDown)
    return()=>document.removeEventListener('pointerdown',onPointerDown)
  },[open])
  const notifications=useMemo(()=>buildNotifications(policies,currentRole),[version,policies,currentRole])
  const visibleNotifications=notifications.filter(item=>!readIds.has(item.id)).map(item=>{
    const hours=Math.max(0,Math.floor((Date.now()-(parseDate(item.date)?.getTime()||Date.now()))/3600000))
    const threshold=Number(item.governancePolicy?.escalation_after_hours)
    return {...item,escalated:Number.isFinite(threshold)&&threshold>0&&hours>=threshold}
  })
  const unread=visibleNotifications.length
  function markAll(){dismissNotifications(notifications.map(item=>item.id));setReadIds(loadReadNotificationIds())}
  function notificationCopy(item){
    if(language!=='en')return {title:item.title,message:item.message}
    const titles={
      'Εκπρόθεσμος έλεγχος':'Overdue control',
      'Εκπρόθεσμη εκπαίδευση':'Overdue training',
      'Εκπρόθεσμη αναθεώρηση εγγράφου':'Overdue document review',
      'Εκπρόθεσμη CAPA':'Overdue CAPA',
      'Εκπρόθεσμος επανέλεγχος κινδύνου':'Overdue risk review',
      'Σοβαρό συμβάν προς διερεύνηση':'Serious incident requiring investigation',
      'Κρίσιμο εργαστηριακό αποτέλεσμα':'Critical laboratory result',
      'Εκκρεμής επάρκεια / επανεκπαίδευση':'Pending competency / retraining',
      'Εκπρόθεσμη ενέργεια επιτροπής':'Overdue committee action',
    }
    let message=item.message
    if(item.title==='Κρίσιμο εργαστηριακό αποτέλεσμα')message=String(message).replace('απαιτείται γνωστοποίηση','communication required')
    if(item.title==='Εκκρεμής επάρκεια / επανεκπαίδευση')message=String(message).replace(/εργαζόμενοι?|εργαζομενοι?/g,'staff')
    return {title:titles[item.title]||item.title,message}
  }
  function openItem(item){setOpen(false);navigate(buildNotificationReviewLink(item.path,item.recordId,item.id))}
  return <div className="notification-center" ref={ref}>
    <button type="button" className="icon-button notification-trigger" aria-label={`${L('Ειδοποιήσεις','Notifications')}${unread?` (${unread})`:''}`} title={L('Ειδοποιήσεις','Notifications')} onClick={()=>setOpen(v=>!v)}>
      <Bell size={18}/>{unread>0&&<span className="notification-badge">{unread>9?'9+':unread}</span>}
    </button>
    {open&&<div className="notification-panel" role="dialog" aria-label={L('Κέντρο ειδοποιήσεων','Notification Center')}>
      <div className="notification-panel__head"><div><strong>{L('Ειδοποιήσεις','Notifications')}</strong><span>{visibleNotifications.length?`${unread} ${L('νέες','new')}`:L('Δεν υπάρχουν νέες ειδοποιήσεις','No new notifications')}</span></div>{unread>0&&<button type="button" onClick={markAll}><CheckCheck size={15}/> {L('Όλες διαβασμένες','Mark all read')}</button>}</div>
      <div className="notification-list">
        {visibleNotifications.length===0?<div className="notification-empty"><Bell size={20}/><span>{L('Δεν υπάρχουν νέες ειδοποιήσεις.','No new notifications.')}</span></div>:visibleNotifications.map(item=>{const Icon=item.icon;const copy=notificationCopy(item);return <button type="button" key={item.id} className={`notification-item tone-${item.tone} is-unread`} onClick={()=>openItem(item)}><span className="notification-item__icon"><Icon size={16}/></span><span className="notification-item__copy"><strong>{copy.title}</strong><small>{copy.message}{item.escalated?` · ${L('Κλιμακωμένη','Escalated')}`:''}</small></span><span className="notification-unread-dot"/></button>})}
      </div>
    </div>}
  </div>
}
