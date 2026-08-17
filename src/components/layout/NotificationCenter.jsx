import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { Bell, CheckCheck, ClipboardCheck, FileClock, FlaskConical, GraduationCap, ShieldAlert, Siren } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { loadControlPrograms, SURVEILLANCE_PROGRAMS_EVENT } from '../../services/surveillanceControlsService'
import { loadTraining, loadDocuments, ORGANIZATION_EVENT } from '../../services/organizationService'
import { loadCapa, loadIncidents, loadRisks, QUALITY_EVENT } from '../../services/qualityService'
import { loadPatientSamples, PATIENT_SAMPLES_EVENT } from '../../services/patientSamplesService'
import { loadEnvironmentalSamples, loadStaffSamples, loadWaterRecords, ENVIRONMENTAL_SAMPLES_EVENT, STAFF_SAMPLES_EVENT, WATER_RECORDS_EVENT } from '../../services/laboratorySourcesService'
import { buildNotificationReviewLink } from '../../core/navigation/recordDeepLink'
import { dismissNotifications, loadReadNotificationIds, NOTIFICATION_READ_EVENT } from '../../core/notifications/notificationState'
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

function buildNotifications(){
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
    items.push({id:`document:${row.id}:${row.reviewDate}`,title:'Εκπρόθεσμη αναθεώρηση εγγράφου',message:`${row.title} · ${displayDate(row.reviewDate)}`,tone:'danger',path:'/documents',recordId:row.id,module:'documents',icon:FileClock,date:row.reviewDate})
  })

  loadCapa().filter(row=>row.dueDate && !isTerminalStatus(row.status)).forEach(row=>{
    const days=daysUntil(row.dueDate)
    if(days===null || days>=0) return
    items.push({id:`capa:${row.id}:${row.dueDate}`,title:'Εκπρόθεσμη CAPA',message:`${row.title} · ${displayDate(row.dueDate)}`,tone:'danger',path:'/quality/capa',recordId:row.id,module:'capa',icon:ShieldAlert,date:row.dueDate})
  })

  loadRisks().filter(row=>row.reviewDate && !['Κλειστός','Ακυρωμένος'].includes(row.status)).forEach(row=>{
    const days=daysUntil(row.reviewDate)
    if(days===null || days>=0) return
    items.push({id:`risk:${row.id}:${row.reviewDate}`,title:'Εκπρόθεσμος επανέλεγχος κινδύνου',message:`${row.title} · ${displayDate(row.reviewDate)}`,tone:Number(row.riskScore)>=10?'danger':'warning',path:'/quality/risks',recordId:row.id,module:'risks',icon:ShieldAlert,date:row.reviewDate})
  })

  // Serious safety events stay visible until the investigation has moved beyond the initial report.
  loadIncidents().filter(row=>['Σοβαρή βλάβη','Θάνατος'].includes(row.outcome) && row.status==='Νέα αναφορά').forEach(row=>{
    items.push({id:`incident-serious:${row.id}:${row.date||''}`,title:'Σοβαρό συμβάν προς διερεύνηση',message:`${row.title||row.id} · ${row.department||'—'}`,tone:'danger',path:'/quality/incidents',recordId:row.id,module:'incidents',icon:Siren,date:row.date||isoToday()})
  })

  // Critical laboratory results are alerts only while closed-loop communication is incomplete.
  const laboratoryRows=[...loadPatientSamples(),...loadStaffSamples(),...loadEnvironmentalSamples(),...loadWaterRecords()]
  laboratoryRows.filter(row=>row.criticalResult && (!row.criticalCommunicatedTo || !row.criticalCommunicatedAt)).forEach(row=>{
    items.push({id:`lab-critical:${row.id}:${row.resultDate||''}`,title:'Κρίσιμο εργαστηριακό αποτέλεσμα',message:`${row.patientCode||row.subjectCode||row.employeeCode||row.id} · απαιτείται γνωστοποίηση`,tone:'danger',path:'/laboratory',recordId:row.id,module:'laboratory',icon:FlaskConical,date:row.resultDate||isoToday()})
  })

  // Competency follow-up is surfaced only after completed training, avoiding noise during delivery.
  loadTraining().filter(row=>row.status==='Ολοκληρωμένη' && row.competencyRequired).forEach(row=>{
    const pending=(row.attendance||[]).filter(a=>['Παρών','Online'].includes(a.status) && a.competencyResult!=='Επαρκής')
    if(!pending.length)return
    items.push({id:`competency:${row.id}:${pending.map(a=>a.employeeId||a.employeeName).join('-')}`,title:'Εκκρεμής επάρκεια / επανεκπαίδευση',message:`${row.title} · ${pending.length} ${pending.length===1?'εργαζόμενος':'εργαζόμενοι'}`,tone:'warning',path:'/training',recordId:row.id,module:'training',icon:GraduationCap,date:row.date||isoToday()})
  })

  return items.sort((a,b)=>{
    const priority={danger:0,warning:1,default:2}
    return (priority[a.tone]??2)-(priority[b.tone]??2) || (a.date||'').localeCompare(b.date||'')
  })
}

export default function NotificationCenter(){
  const navigate=useNavigate()
  const ref=useRef(null)
  const [open,setOpen]=useState(false)
  const [version,setVersion]=useState(0)
  const [readIds,setReadIds]=useState(loadReadNotificationIds)
  useAppEvents([SURVEILLANCE_PROGRAMS_EVENT, ORGANIZATION_EVENT, QUALITY_EVENT, PATIENT_SAMPLES_EVENT, STAFF_SAMPLES_EVENT, ENVIRONMENTAL_SAMPLES_EVENT, WATER_RECORDS_EVENT], () => setVersion(v => v + 1))
  useAppEvents(NOTIFICATION_READ_EVENT, () => setReadIds(loadReadNotificationIds()), { includeStorage: true })
  useEffect(()=>{
    const onPointerDown=event=>{if(open && ref.current && !ref.current.contains(event.target))setOpen(false)}
    document.addEventListener('pointerdown',onPointerDown)
    return()=>document.removeEventListener('pointerdown',onPointerDown)
  },[open])
  const notifications=useMemo(()=>buildNotifications(),[version])
  const visibleNotifications=notifications.filter(item=>!readIds.has(item.id))
  const unread=visibleNotifications.length
  function markAll(){dismissNotifications(notifications.map(item=>item.id));setReadIds(loadReadNotificationIds())}
  function openItem(item){setOpen(false);navigate(buildNotificationReviewLink(item.path,item.recordId,item.id))}
  return <div className="notification-center" ref={ref}>
    <button type="button" className="icon-button notification-trigger" aria-label={`Ειδοποιήσεις${unread?` (${unread} νέες)`:''}`} title="Ειδοποιήσεις" onClick={()=>setOpen(v=>!v)}>
      <Bell size={18}/>{unread>0&&<span className="notification-badge">{unread>9?'9+':unread}</span>}
    </button>
    {open&&<div className="notification-panel" role="dialog" aria-label="Κέντρο ειδοποιήσεων">
      <div className="notification-panel__head"><div><strong>Ειδοποιήσεις</strong><span>{visibleNotifications.length?`${unread} νέες`:'Δεν υπάρχουν νέες ειδοποιήσεις'}</span></div>{unread>0&&<button type="button" onClick={markAll}><CheckCheck size={15}/> Όλες διαβασμένες</button>}</div>
      <div className="notification-list">
        {visibleNotifications.length===0?<div className="notification-empty"><Bell size={20}/><span>Δεν υπάρχουν νέες ειδοποιήσεις.</span></div>:visibleNotifications.map(item=>{const Icon=item.icon;return <button type="button" key={item.id} className={`notification-item tone-${item.tone} is-unread`} onClick={()=>openItem(item)}><span className="notification-item__icon"><Icon size={16}/></span><span className="notification-item__copy"><strong>{item.title}</strong><small>{item.message}</small></span><span className="notification-unread-dot"/></button>})}
      </div>
    </div>}
  </div>
}
