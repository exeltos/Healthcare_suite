import { APP_ROUTES } from '../../config/routes'
import { useEffect,useMemo,useState } from 'react'
import { useAppEvents } from '../../core/events'
import { useNavigate } from 'react-router-dom'
import { ArrowRight,CalendarClock,FileWarning,FolderOpen,GraduationCap,Plus,UsersRound,UserRoundCog } from 'lucide-react'
import { loadEmployees,EMPLOYEES_EVENT } from '../../services/employeesService'
import { loadCommittees,loadDocuments,loadTraining,ORGANIZATION_EVENT } from '../../services/organizationService'
import { loadOperationalCommittees, loadOperationalDocuments, loadOperationalTraining } from '../../services/backend/organizationBackendService'
import StatCard from '../../components/core/StatCard/StatCard'
import { useI18n } from '../../i18n'
import './OrganizationPages.css'

export default function OrganizationCenterPage(){
 const {language}=useI18n(); const L=(el,en)=>language==='en'?en:el
 const navigate=useNavigate();const[v,setV]=useState(0);useAppEvents([ORGANIZATION_EVENT,EMPLOYEES_EVENT],()=>setV(x=>x+1),{includeStorage:true})
 useEffect(()=>{Promise.all([loadOperationalTraining(),loadOperationalCommittees(),loadOperationalDocuments()]).then(()=>setV(x=>x+1)).catch(()=>{})},[])
 const data=useMemo(()=>({employees:loadEmployees(),training:loadTraining(),committees:loadCommittees(),documents:loadDocuments()}),[v])
 const today=new Date().toISOString().slice(0,10);const soon=new Date(Date.now()+30*864e5).toISOString().slice(0,10)
 const active=data.employees.filter(x=>x.status!=='Ανενεργό').length
 const vaccinations=data.employees.reduce((n,x)=>n+(x.vaccinations||[]).length,0)
 const occupationalDue=data.employees.reduce((n,x)=>n+(x.occupationalVisits||[]).filter(v=>v.nextVisit&&v.nextVisit<=soon).length,0)
 const upcoming=data.training.filter(x=>x.status!=='Ολοκληρωμένη'&&x.date>=today).length
 const meetings=data.committees.filter(x=>x.nextMeeting>=today&&x.nextMeeting<=soon).length
 const reviews=data.documents.filter(x=>x.reviewDate&&x.reviewDate<=soon&&x.status!=='Καταργημένο').length
 const activity=[
   ...data.training.map(x=>({date:x.date,title:x.title,meta:`${L('Εκπαίδευση','Training')} · ${x.department||L('Όλα τα τμήματα','All departments')}`})),
   ...data.committees.map(x=>({date:x.nextMeeting,title:x.name,meta:L('Επόμενη συνεδρίαση','Next meeting')})),
   ...data.documents.map(x=>({date:x.updatedAt,title:x.title,meta:`${L('Έγγραφο','Document')} · ${x.code||'—'}`})),
 ].filter(x=>x.date).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,7)

 return <section className="organization-page">
  <header className="organization-hero"><div><div className="organization-hero__eyebrow">{L('Οργάνωση','Organization')}</div><h1>{L('Επισκόπηση Οργάνωσης','Organization Overview')}</h1><p>{L('Ενιαία εικόνα προσωπικού, εκπαιδεύσεων, επιτροπών και ελεγχόμενων εγγράφων.','Unified overview of staff, training, committees and controlled documents.')}</p></div><button type="button" className="organization-button" onClick={()=>navigate(APP_ROUTES.TRAINING)}><Plus size={18}/> {L('Νέα εκπαίδευση','New training')}</button></header>
  <div className="organization-kpis">
   <StatCard icon={UserRoundCog} label={L('Ενεργοί εργαζόμενοι','Active employees')} value={active} subtitle={`${vaccinations} ${L('εμβολιασμοί','vaccinations')} · ${occupationalDue} ${L('επανέλεγχοι','follow-ups')}`} tone="success"/>
   <StatCard icon={GraduationCap} label={L('Προσεχείς εκπαιδεύσεις','Upcoming training')} value={upcoming} subtitle={L('Προγραμματισμένες δράσεις','Scheduled activities')}/>
   <StatCard icon={UsersRound} label={L('Συνεδριάσεις 30 ημερών','Meetings within 30 days')} value={meetings} subtitle={L('Ενεργές επιτροπές και ομάδες','Active committees and groups')}/>
   <StatCard icon={FileWarning} label={L('Έγγραφα προς αναθεώρηση','Documents due for review')} value={reviews} subtitle={L('Εντός των επόμενων 30 ημερών','Within the next 30 days')} tone={reviews?"warning":"default"}/>
  </div>
  <div className="organization-grid">
   <article className="organization-card"><div className="organization-card__head"><div><h2>{L('Γρήγορες ενέργειες','Quick actions')}</h2><span>{L('Κεντρική πρόσβαση στις λειτουργίες οργάνωσης','Central access to organization functions')}</span></div></div><div className="organization-actions">
    <Action icon={<UserRoundCog/>} title={L('Εργαζόμενοι','Employees')} text={L('Καρτέλες και στοιχεία προσωπικού','Staff records and details')} onClick={()=>navigate(APP_ROUTES.EMPLOYEES)}/>
    <Action icon={<GraduationCap/>} title={L('Εκπαίδευση','Training')} text={L('Προγράμματα, συμμετοχές και ισχύς','Programs, attendance and validity')} onClick={()=>navigate(APP_ROUTES.TRAINING)}/>
    <Action icon={<UsersRound/>} title={L('Επιτροπές','Committees')} text={L('Μέλη, συνεδριάσεις και αποφάσεις','Members, meetings and decisions')} onClick={()=>navigate(APP_ROUTES.COMMITTEES)}/>
    <Action icon={<FolderOpen/>} title={L('Έγγραφα','Documents')} text={L('Εκδόσεις, ιδιοκτήτες και αναθεωρήσεις','Versions, owners and reviews')} onClick={()=>navigate(APP_ROUTES.DOCUMENTS)}/>
   </div></article>
   <article className="organization-card"><div className="organization-card__head"><div><h2>{L('Τι χρειάζεται προσοχή','What needs attention')}</h2><span>{L('Αυτόματη οργανωτική σύνοψη','Automatic organizational summary')}</span></div><CalendarClock size={21}/></div><div className="organization-list">
    <Summary title={`${reviews} ${L('έγγραφα προς αναθεώρηση','documents due for review')}`} text={L('Ελέγξτε ιδιοκτήτη, έκδοση και ημερομηνία ισχύος.','Review owner, version and validity date.')} tone={reviews?'warning':'success'} label={L('Έλεγχος','Review')}/>
    <Summary title={`${meetings} ${L('συνεδριάσεις εντός 30 ημερών','meetings within 30 days')}`} text={L('Προετοιμασία ημερήσιας διάταξης και προσκλήσεων.','Prepare agenda and invitations.')} tone="success" label={L('Έλεγχος','Review')}/>
    <Summary title={`${upcoming} ${L('προγραμματισμένες εκπαιδεύσεις','scheduled training activities')}`} text={L('Έλεγχος παρουσιολογίου, συμμετεχόντων και εκπαιδευτικού υλικού.','Review attendance, participants and training material.')} tone="success" label={L('Έλεγχος','Review')}/>
    <Summary title={`${occupationalDue} ${L('επανέλεγχοι ιατρού εργασίας','occupational-health follow-ups')}`} text={L('Επόμενες επισκέψεις που έχουν προγραμματιστεί εντός της περιόδου.','Upcoming visits scheduled within the period.')} tone={occupationalDue?'warning':'success'} label={L('Έλεγχος','Review')}/>
   </div></article>
  </div>
  <article className="organization-card"><div className="organization-card__head"><h2>{L('Πρόσφατη και προσεχής δραστηριότητα','Recent and upcoming activity')}</h2><button type="button" className="organization-button organization-button--ghost" onClick={()=>navigate(APP_ROUTES.DOCUMENTS)}>{L('Όλες οι ενότητες','All sections')} <ArrowRight size={16}/></button></div><div className="organization-list">{activity.length?activity.map((x,i)=><div className="organization-list-item" key={`${x.title}-${i}`}><div><strong>{x.title}</strong><small>{x.meta}</small></div><span className="organization-pill">{x.date}</span></div>):<div className="organization-list-item"><div><strong>{L('Δεν υπάρχει πρόσφατη δραστηριότητα','No recent activity')}</strong></div></div>}</div></article>
 </section>
}
function Action({icon,title,text,onClick}){return <button type="button" className="organization-action" onClick={onClick}><span className="organization-action__icon">{icon}</span><span><strong>{title}</strong><small>{text}</small></span></button>}
function Summary({title,text,tone,label}){return <div className="organization-list-item"><div><strong>{title}</strong><small>{text}</small></div><span className={`organization-pill organization-pill--${tone}`}>{label}</span></div>}
