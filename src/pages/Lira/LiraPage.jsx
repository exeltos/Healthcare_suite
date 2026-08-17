import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertTriangle, ArrowRight, Bot, Database, RefreshCw, Send, ShieldAlert, Sparkles } from 'lucide-react'
import { APP_ROUTES } from '../../config/routes'
import { loadPatientRegistry } from '../../services/patientService'
import { loadPatientSamples } from '../../services/patientSamplesService'
import { loadInfections } from '../../services/infectionsService'
import { loadCapa, loadIncidents, loadAuditExecutions, loadRisks } from '../../services/qualityService'
import { loadIndicatorsSnapshot } from '../../services/indicatorsService'
import { loadHandHygieneSessions, loadPromotedAntibiotics } from '../../services/preventionService'
import { loadAntibioticDDD, loadDailyCensus } from '../../services/indicatorSourceDataService'
import { loadDocuments, loadTraining } from '../../services/organizationService'
import { Button, PageChrome, PageHeader } from '../../components/core'
import { useI18n } from '../../i18n'
import { studioDisplayValue } from '../Studio/studioPresentation'
import './LiraPage.css'

const CLOSED = new Set(['Κλειστή','Κλειστό','Ολοκληρωμένη','Ολοκληρωμένο','Completed','Closed','Αρχειοθετημένο','Archived'])
const norm = (value='') => String(value).trim().toLocaleLowerCase('el-GR')
const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0
const dateOnly = (value) => value ? String(value).slice(0,10) : ''
const isPast = (value) => Boolean(value && dateOnly(value) < new Date().toISOString().slice(0,10))

export default function LiraPage(){
 const {language}=useI18n(), L=(el,en)=>language==='en'?en:el
 const [version,setVersion]=useState(0)
 const d=useMemo(()=>snapshot(),[version])
 const welcome=()=>L(
   'Είμαι η LIRA. Αναλύω τα διαθέσιμα δεδομένα του Healthcare Suite και σας οδηγώ στις πρωτογενείς εγγραφές που στηρίζουν κάθε σύνοψη.',
   'I am LIRA. I analyse available Healthcare Suite data and guide you to the source records supporting each summary.'
 )
 const [messages,setMessages]=useState([{id:1,role:'assistant',text:welcome(),evidence:[]}])
 const [input,setInput]=useState('')
 useEffect(()=>{setMessages([{id:`welcome-${language}`,role:'assistant',text:welcome(),evidence:[]}]);setInput('')},[language])
 const refresh=()=>setVersion(x=>x+1)
 const prompts=[
   ['summary',L('Σύνοψη σημάτων που χρειάζονται προσοχή','Summary of signals requiring attention')],
   ['mdr',L('MDR/XDR και θετικά εργαστηριακά ευρήματα','MDR/XDR and positive laboratory findings')],
   ['antimicrobials',L('Κατανάλωση αντιμικροβιακών / DDD','Antimicrobial consumption / DDD')],
   ['departments',L('Τμήματα με αυξημένη επιτήρηση','Departments with increased surveillance')],
   ['who',L('Συμμόρφωση Υγιεινής Χεριών','Hand hygiene compliance')],
   ['quality',L('Ανοικτές ενέργειες Ποιότητας','Open Quality actions')],
   ['training',L('Εκπαίδευση και επάρκεια προσωπικού','Training and staff competency')],
   ['documents',L('Έγγραφα προς αναθεώρηση','Documents due for review')],
 ]
 const ask=(text,key)=>{if(!text.trim())return;const a=answer(key||classify(text),d,L,language);setMessages(m=>[...m,{id:Date.now(),role:'user',text},{id:Date.now()+1,role:'assistant',text:a.text,links:a.links,evidence:a.evidence}]);setInput('')}
 const critical=d.signals.filter(x=>x.tone==='danger').length
 const warning=d.signals.filter(x=>x.tone==='warning').length
 return <PageChrome className="lira-page" header={<PageHeader eyebrow="LIRA AI" title="LIRA — Healthcare Intelligence Assistant" description={L('Εξηγήσιμη υποστήριξη επιτήρησης, ποιότητας και διοικητικής ανάλυσης πάνω στα πραγματικά δεδομένα της εφαρμογής.','Explainable surveillance, quality and operational decision support over the application’s actual data.')} actions={<Button type="button" className="lira-refresh" icon={<RefreshCw size={15}/>} onClick={refresh}>{L('Ανανέωση','Refresh')}</Button>}/> }>
  <div className="lira-notice"><ShieldAlert size={17}/><div><strong>{L('Υποστηρικτικό εργαλείο — όχι αυτόνομη απόφαση','Decision support — not autonomous decision-making')}</strong><span>{L('Η LIRA συνοψίζει και συσχετίζει διαθέσιμα δεδομένα. Η κλινική ή διοικητική απόφαση παραμένει στον αρμόδιο επαγγελματία και οι πρωτογενείς εγγραφές είναι η πηγή αλήθειας.','LIRA summarizes and correlates available data. Clinical or operational decisions remain with the responsible professional, and source records remain the system of record.')}</span></div></div>
  <div className="lira-status-strip">
   <StatusCard icon={Database} label={L('Πηγές δεδομένων','Data domains')} value={d.domainCount} detail={L('συνδεδεμένες ενότητες','connected modules')}/>
   <StatusCard icon={Activity} label={L('Δείκτες','Indicators')} value={d.indicators.length} detail={L(`${d.attentionIndicators.length} χρειάζονται προσοχή`,`${d.attentionIndicators.length} require attention`)} tone={d.attentionIndicators.length?'warning':'success'}/>
   <StatusCard icon={AlertTriangle} label={L('Σήματα','Signals')} value={critical+warning} detail={L(`${critical} υψηλής · ${warning} μέτριας προτεραιότητας`,`${critical} high · ${warning} medium priority`)} tone={critical?'danger':warning?'warning':'success'}/>
   <StatusCard icon={Sparkles} label={L('Ενημέρωση δεδομένων','Data refreshed')} value={d.generatedAt} detail={L('τοπικό snapshot','local snapshot')}/>
  </div>
  <div className="lira-layout">
   <main className="lira-chat lira-chat--primary"><header><Bot size={20}/><div><strong>LIRA Assistant</strong><small>{L('Κάθε απάντηση συνοδεύεται από πηγές και σύνδεση στις σχετικές εγγραφές.','Each response includes evidence sources and links to the relevant records.')}</small></div></header><div className="lira-messages">{messages.map(m=><div key={m.id} className={`lira-message ${m.role}`}><div>{m.text}</div>{m.evidence?.length>0&&<div className="lira-evidence">{m.evidence.map((x,i)=><span key={`${x}-${i}`}>{x}</span>)}</div>}{m.links?.map(x=><Link key={`${m.id}-${x.path}`} to={x.path}>{x.label}<ArrowRight size={12}/></Link>)}</div>)}</div><form onSubmit={e=>{e.preventDefault();ask(input)}}><textarea rows="2" value={input} onChange={e=>setInput(e.target.value)} placeholder={L('Ρωτήστε για επιτήρηση, εργαστήριο, αντιμικροβιακά, ποιότητα, εκπαίδευση ή έγγραφα…','Ask about surveillance, laboratory, antimicrobials, quality, training or documents…')}/><button type="submit" disabled={!input.trim()} aria-label={L('Αποστολή','Send')} title={L('Αποστολή','Send')}><Send size={18}/></button></form><p>{L('Η τρέχουσα έκδοση χρησιμοποιεί ελεγχόμενους τοπικούς υπολογισμούς και κανόνες πάνω στα δεδομένα της εφαρμογής. Δεν αποστέλλονται δεδομένα σε εξωτερικό AI model από αυτή τη σελίδα.','This version uses controlled local calculations and rules over application data. No data are sent to an external AI model from this page.')}</p></main>
   <aside className="lira-main lira-side">
    <section className="lira-panel lira-quick"><div className="lira-head"><div><span>{L('ΓΡΗΓΟΡΗ ΑΝΑΛΥΣΗ','QUICK ANALYSIS')}</span><h2>{L('Ερωτήσεις με ένα πάτημα','One-click questions')}</h2></div></div><div className="lira-prompts">{prompts.map(([k,t])=><button type="button" key={k} onClick={()=>ask(t,k)}>{t}<ArrowRight size={14}/></button>)}</div></section>
    <section className="lira-panel lira-signals"><div className="lira-head"><div><span>{L('ΣΗΜΑΤΑ','SIGNALS')}</span><h2>{L('Τι χρειάζεται προσοχή','What needs attention')}</h2></div><Sparkles size={20}/></div><div className="lira-signal-list">{d.signals.length?d.signals.slice(0,5).map(x=><Insight key={x.id} {...x} L={L}/>):<div className="lira-clear-state">{L('Δεν εντοπίζονται ενεργά σήματα στα διαθέσιμα δεδομένα.','No active signals are detected in the available data.')}</div>}</div></section>
   </aside>
  </div>
 </PageChrome>
}

function StatusCard({icon:Icon,label,value,detail,tone='neutral'}){return <div className={`lira-status-card ${tone}`}><Icon size={18}/><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>}
function Insight({title,text,path,tone='neutral',L}){return <article className={`lira-insight ${tone}`}><div><strong>{title}</strong><p>{text}</p></div><Link to={path}>{L('Άνοιγμα','Open')}<ArrowRight size={13}/></Link></article>}

function snapshot(){
 const patients=loadPatientRegistry(),samples=loadPatientSamples(),infections=loadInfections(),capa=loadCapa(),incidents=loadIncidents(),audits=loadAuditExecutions(),risks=loadRisks(),indicators=loadIndicatorsSnapshot(),hh=loadHandHygieneSessions(),ddd=loadAntibioticDDD(),census=loadDailyCensus(),promoted=loadPromotedAntibiotics(),training=loadTraining(),documents=loadDocuments()
 const positive=samples.filter(x=>x.status==='Θετικό'||norm(x.result)==='positive'||norm(x.result)==='θετικό')
 const resistant=positive.filter(x=>x.mdr||x.xdr||x.isMDR||x.isXDR||/MDR|XDR/i.test(String(x.resistance||'')))
 const active=infections.filter(x=>!CLOSED.has(x.status))
 const openCapa=capa.filter(x=>!CLOSED.has(x.status))
 const overdueCapa=openCapa.filter(x=>isPast(x.dueDate||x.targetDate||x.deadline))
 const openIncidents=incidents.filter(x=>!CLOSED.has(x.status)&&norm(x.status)!=='ακυρωμένο')
 const openFindings=audits.flatMap(a=>(a.findings||[]).map(f=>({...f,auditId:a.id}))).filter(x=>!CLOSED.has(x.status))
 const highRisks=risks.filter(x=>{const score=num(x.residualScore||x.residualRisk||x.score);return score>=12&&!CLOSED.has(x.status)})
 const attentionIndicators=indicators.filter(x=>['danger','warning'].includes(x.status?.tone))
 const dddTotal=ddd.reduce((s,x)=>s+num(x.ddd),0)
 const patientDays=census.reduce((s,x)=>s+num(x.patientDays||x.totalPatients),0)
 const dddRate=patientDays?dddTotal/patientDays*1000:null
 const pendingRestricted=promoted.filter(x=>norm(x.approval||x.status).includes('εκκρ')||norm(x.approval||x.status).includes('pend'))
 const trainingDue=training.flatMap(t=>(t.attendance||[]).map(a=>({...a,trainingTitle:t.title||t.name,trainingId:t.id}))).filter(x=>isPast(x.validUntil||x.competencyValidUntil)||norm(x.competencyResult).includes('επανεκπα'))
 const reviewDocs=documents.filter(x=>x.status==='Σε ισχύ'&&(isPast(x.reviewDate||x.nextReviewDate)||daysUntil(x.reviewDate||x.nextReviewDate)<=30))
 const signals=[]
 if(resistant.length)signals.push({id:'mdr',title:'MDR/XDR',text:`${resistant.length} θετικά εργαστηριακά ευρήματα με σήμανση αντοχής.`,path:APP_ROUTES.LABORATORY,tone:'danger'})
 if(overdueCapa.length)signals.push({id:'capa',title:'Εκπρόθεσμες CAPA',text:`${overdueCapa.length} ανοικτές CAPA έχουν περάσει την προθεσμία τους.`,path:APP_ROUTES.QUALITY_CAPA,tone:'danger'})
 if(highRisks.length)signals.push({id:'risk',title:'Υψηλός υπολειπόμενος κίνδυνος',text:`${highRisks.length} κίνδυνοι παραμένουν σε υψηλό residual score.`,path:APP_ROUTES.QUALITY_RISKS,tone:'warning'})
 if(pendingRestricted.length)signals.push({id:'abx',title:'Εκκρεμείς εγκρίσεις αντιβιοτικών',text:`${pendingRestricted.length} αιτήματα περιορισμένης χρήσης αναμένουν απόφαση.`,path:APP_ROUTES.PROMOTED_ANTIBIOTICS,tone:'warning'})
 if(reviewDocs.length)signals.push({id:'docs',title:'Έγγραφα προς αναθεώρηση',text:`${reviewDocs.length} ελεγχόμενα έγγραφα έχουν λήξει ή πλησιάζουν την αναθεώρηση.`,path:APP_ROUTES.DOCUMENTS,tone:'warning'})
 if(trainingDue.length)signals.push({id:'training',title:'Επανεκπαίδευση / επάρκεια',text:`${trainingDue.length} εγγραφές προσωπικού χρειάζονται επανέλεγχο επάρκειας ή επανεκπαίδευση.`,path:APP_ROUTES.TRAINING,tone:'warning'})
 return{patients,samples,positive,resistant,active,openCapa,overdueCapa,openIncidents,openFindings,highRisks,attentionIndicators,indicators,hh,ddd,dddTotal,dddRate,patientDays,pendingRestricted,training,trainingDue,documents,reviewDocs,signals,domainCount:8,generatedAt:new Date().toLocaleTimeString('el-GR',{hour:'2-digit',minute:'2-digit'})}
}
function daysUntil(value){if(!value)return Infinity;const target=new Date(`${dateOnly(value)}T12:00:00`);if(Number.isNaN(target.getTime()))return Infinity;return Math.ceil((target-new Date())/86400000)}
function classify(q){q=norm(q);if(/mdr|xdr|αντοχ|εργαστηρ|θετικ/.test(q))return'mdr';if(/τμήμ|department/.test(q))return'departments';if(/who|χερι|hand/.test(q))return'who';if(/ddd|αντιμικροβ|αντιβιοτ|antimicrobial|antibiotic/.test(q))return'antimicrobials';if(/capa|ποιότη|quality|audit|κινδυν|risk|συμβάν/.test(q))return'quality';if(/εκπαίδ|training|επάρκ/.test(q))return'training';if(/έγγραφ|document|αναθεώρ/.test(q))return'documents';if(/μικρο|micro/.test(q))return'microbes';return'summary'}
function ev(...items){return items.filter(Boolean)}
function answer(k,d,L,language='el'){
 const links=(label,path)=>[{label,path}]
 if(k==='mdr')return{text:d.resistant.length?L(`Εντοπίζονται ${d.resistant.length} θετικά δείγματα με σήμανση MDR/XDR σε σύνολο ${d.positive.length} θετικών αποτελεσμάτων. Η LIRA το εμφανίζει ως σήμα για έλεγχο της επιτήρησης και όχι ως διάγνωση ή αυτόματη κλινική απόφαση.`,`There are ${d.resistant.length} positive samples flagged MDR/XDR among ${d.positive.length} positive results. LIRA presents this as a surveillance review signal, not a diagnosis or autonomous clinical decision.`):L(`Υπάρχουν ${d.positive.length} θετικά αποτελέσματα, αλλά δεν εντοπίζεται σήμανση MDR/XDR στα διαθέσιμα δεδομένα.`,`There are ${d.positive.length} positive results, but no MDR/XDR flags are detected in the available data.`),evidence:ev(L(`Εργαστήριο: ${d.samples.length} δείγματα`,`Laboratory: ${d.samples.length} samples`),L(`Θετικά: ${d.positive.length}`,`Positive: ${d.positive.length}`),L(`MDR/XDR: ${d.resistant.length}`,`MDR/XDR: ${d.resistant.length}`)),links:links(L('Άνοιγμα Εργαστηρίου','Open Laboratory'),APP_ROUTES.LABORATORY)}
 if(k==='antimicrobials')return{text:d.ddd.length?L(`Έχουν καταχωρηθεί ${d.ddd.length} εγγραφές κατανάλωσης με συνολικά ${fmt(d.dddTotal,1)} DDD.${d.patientDays?` Με ${fmt(d.patientDays,0)} ασθενείς-ημέρες, ο συνολικός δείκτης είναι ${fmt(d.dddRate,2)} DDD / 1.000 bed-days.`:''} Υπάρχουν επίσης ${d.pendingRestricted.length} εκκρεμή αιτήματα περιορισμένης χρήσης.`,`There are ${d.ddd.length} antimicrobial-consumption records totaling ${fmt(d.dddTotal,1)} DDD.${d.patientDays?` With ${fmt(d.patientDays,0)} patient-days, the overall rate is ${fmt(d.dddRate,2)} DDD / 1,000 bed-days.`:''} There are also ${d.pendingRestricted.length} pending restricted-use requests.`):L('Δεν υπάρχουν ακόμη δεδομένα DDD για αξιόπιστη σύνοψη κατανάλωσης.','There are not yet enough DDD data for a consumption summary.'),evidence:ev(L(`WHO ATC/DDD εγγραφές: ${d.ddd.length}`,`WHO ATC/DDD records: ${d.ddd.length}`),L(`Ασθενείς-ημέρες: ${fmt(d.patientDays,0)}`,`Patient-days: ${fmt(d.patientDays,0)}`),L(`Εκκρεμείς εγκρίσεις: ${d.pendingRestricted.length}`,`Pending approvals: ${d.pendingRestricted.length}`)),links:[{label:L('Κατανάλωση Αντιμικροβιακών','Antimicrobial Consumption'),path:APP_ROUTES.ANTIMICROBIAL_CONSUMPTION},{label:L('Προωθημένα Αντιβιοτικά','Restricted Antibiotics'),path:APP_ROUTES.PROMOTED_ANTIBIOTICS}]}
 if(k==='quality')return{text:L(`Στην Ποιότητα υπάρχουν ${d.openIncidents.length} ανοικτά συμβάντα, ${d.openCapa.length} ανοικτές CAPA (${d.overdueCapa.length} εκπρόθεσμες), ${d.openFindings.length} ανοικτά audit findings και ${d.highRisks.length} υψηλοί υπολειπόμενοι κίνδυνοι. Προτεραιότητα χρειάζονται οι εκπρόθεσμες CAPA και οι υψηλοί residual risks.`,`Quality currently has ${d.openIncidents.length} open incidents, ${d.openCapa.length} open CAPA (${d.overdueCapa.length} overdue), ${d.openFindings.length} open audit findings and ${d.highRisks.length} high residual risks. Overdue CAPA and high residual risks should be reviewed first.`),evidence:ev(L(`Συμβάντα: ${d.openIncidents.length}`,`Incidents: ${d.openIncidents.length}`),`CAPA: ${d.openCapa.length}`,L(`Εκπρόθεσμες: ${d.overdueCapa.length}`,`Overdue: ${d.overdueCapa.length}`),L(`Υψηλοί κίνδυνοι: ${d.highRisks.length}`,`High risks: ${d.highRisks.length}`)),links:links(L('Κέντρο Ποιότητας','Quality Hub'),APP_ROUTES.QUALITY)}
 if(k==='training')return{text:d.trainingDue.length?L(`Εντοπίζονται ${d.trainingDue.length} εγγραφές προσωπικού με ληγμένη/εκκρεμή επάρκεια ή ανάγκη επανεκπαίδευσης. Ελέγξτε την Εκπαίδευση για το άτομο, την ισχύ και την απαιτούμενη ενέργεια.`,`There are ${d.trainingDue.length} staff records with expired/pending competency or retraining needs. Review Training for the person, validity and required action.`):L(`Υπάρχουν ${d.training.length} εκπαιδευτικές δράσεις και δεν εντοπίζονται ληγμένες εγγραφές επάρκειας στα διαθέσιμα δεδομένα.`,`There are ${d.training.length} training activities and no expired competency records are detected in the available data.`),evidence:ev(L(`Εκπαιδευτικές δράσεις: ${d.training.length}`,`Training activities: ${d.training.length}`),L(`Χρειάζονται ενέργεια: ${d.trainingDue.length}`,`Require action: ${d.trainingDue.length}`)),links:links(L('Εκπαίδευση','Training'),APP_ROUTES.TRAINING)}
 if(k==='documents')return{text:d.reviewDocs.length?L(`Υπάρχουν ${d.reviewDocs.length} ελεγχόμενα έγγραφα που έχουν περάσει ή πλησιάζουν την ημερομηνία αναθεώρησης. Η LIRA δεν τα καταργεί αυτόματα· τα επισημαίνει για έλεγχο από τον υπεύθυνο εγγράφου.`,`There are ${d.reviewDocs.length} controlled documents that are past or approaching their review date. LIRA does not retire them automatically; it flags them for owner review.`):L(`Δεν εντοπίζονται έγγραφα σε ισχύ που να έχουν λήξει ή να πλησιάζουν σε αναθεώρηση εντός 30 ημερών.`,`No effective documents are detected as overdue or due for review within 30 days.`),evidence:ev(L(`Ελεγχόμενα έγγραφα: ${d.documents.length}`,`Controlled documents: ${d.documents.length}`),L(`Προς αναθεώρηση: ${d.reviewDocs.length}`,`Due for review: ${d.reviewDocs.length}`)),links:links(L('Έγγραφα','Documents'),APP_ROUTES.DOCUMENTS)}
 if(k==='who'){const obs=d.hh.flatMap(x=>x.observations||[]),good=obs.filter(x=>x.action==='HR'||x.action==='HW'||x.compliant===true||x.result==='Συμμόρφωση'||x.status==='Compliant').length,p=obs.length?Math.round(good/obs.length*1000)/10:null;return{text:p==null?L('Δεν υπάρχουν αρκετές καταγεγραμμένες ευκαιρίες WHO για υπολογισμό συμμόρφωσης.','There are not enough recorded WHO opportunities to calculate compliance.'):L(`Η διαθέσιμη συμμόρφωση WHO είναι ${p}% (${good}/${obs.length} ευκαιρίες). Το ποσοστό περιγράφει μόνο τις καταχωρημένες παρατηρήσεις της εφαρμογής.`,`Available WHO compliance is ${p}% (${good}/${obs.length} opportunities). This percentage describes only the observations recorded in the application.`),evidence:ev(L(`Συνεδρίες WHO: ${d.hh.length}`,`WHO sessions: ${d.hh.length}`),L(`Ευκαιρίες: ${obs.length}`,`Opportunities: ${obs.length}`),p!=null?L(`Συμμόρφωση: ${p}%`,`Compliance: ${p}%`):''),links:links(L('Υγιεινή Χεριών','Hand hygiene'),APP_ROUTES.HAND_HYGIENE)}}
 if(k==='departments'){const m={};d.positive.forEach(x=>{const dep=x.department||x.patientDepartment;if(dep)m[dep]=(m[dep]||0)+1});const top=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,3);const shown=top.map(([x,n])=>`${studioDisplayValue(x,language)} (${n})`).join(', ');return{text:top.length?L(`Περισσότερα θετικά δείγματα καταγράφονται στα: ${top.map(([x,n])=>`${x} (${n})`).join(', ')}. Αυτό είναι σήμα όγκου καταγραφών και όχι σύγκριση κινδύνου, επειδή χωρίς τμηματικούς παρονομαστές δεν είναι ασφαλές να συγκρίνουμε επίπτωση.`,`More positive samples are recorded in: ${shown}. This is a record-volume signal, not a risk comparison, because department-specific denominators are required for incidence comparison.`):L('Δεν υπάρχουν αρκετά δεδομένα τμήματος για σύγκριση.','There is not enough department data for comparison.'),evidence:ev(L(`Θετικά δείγματα: ${d.positive.length}`,`Positive samples: ${d.positive.length}`),L('Χωρίς προσαρμογή παρονομαστή','No denominator adjustment')),links:links(L('Επιτήρηση','Surveillance'),APP_ROUTES.SURVEILLANCE)}}
 if(k==='microbes'){const m={};d.positive.forEach(x=>{const v=x.microorganism||x.organism;if(v)m[v]=(m[v]||0)+1});const top=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5);return{text:top.length?L(`Συχνότερα θετικά ευρήματα: ${top.map(([x,n])=>`${x} (${n})`).join(', ')}. Για πραγματική επιδημιολογική τάση απαιτείται χρονική σύγκριση και κατάλληλος παρονομαστής.`,`Most frequent positive findings: ${top.map(([x,n])=>`${x} (${n})`).join(', ')}. A true epidemiological trend requires time comparison and an appropriate denominator.`):L('Δεν υπάρχουν αρκετά θετικά δείγματα με καταγεγραμμένο μικροοργανισμό.','There are not enough positive samples with a recorded microorganism.'),evidence:ev(L(`Θετικά δείγματα: ${d.positive.length}`,`Positive samples: ${d.positive.length}`)),links:links(L('Εργαστήριο','Laboratory'),APP_ROUTES.LABORATORY)}}
 const signalText=d.signals.length?d.signals.slice(0,4).map(x=>`${x.title}: ${x.text}`).join(' '):L('Δεν εντοπίζονται ενεργά σήματα προτεραιότητας στα διαθέσιμα δεδομένα.','No active priority signals are detected in the available data.')
 return{text:L(`Σύνοψη διαθέσιμων δεδομένων: ${d.patients.length} ασθενείς, ${d.samples.length} εργαστηριακά δείγματα, ${d.active.length} ενεργές λοιμώξεις/επεισόδια, ${d.openCapa.length} ανοικτές CAPA και ${d.attentionIndicators.length} δείκτες που χρειάζονται προσοχή. ${signalText}`,`Available-data summary: ${d.patients.length} patients, ${d.samples.length} laboratory samples, ${d.active.length} active infections/episodes, ${d.openCapa.length} open CAPA and ${d.attentionIndicators.length} indicators requiring attention. ${signalText}`),evidence:ev(L('Πηγή: διασυνδεδεμένα modules Healthcare Suite','Source: connected Healthcare Suite modules'),L(`Δείκτες: ${d.indicators.length}`,`Indicators: ${d.indicators.length}`),L(`Ενεργά σήματα: ${d.signals.length}`,`Active signals: ${d.signals.length}`)),links:[{label:L('Dashboard','Dashboard'),path:APP_ROUTES.DASHBOARD},{label:L('Δείκτες','Indicators'),path:APP_ROUTES.INDICATORS}]}
}
function fmt(value,digits=1){const n=Number(value);return Number.isFinite(n)?n.toLocaleString('el-GR',{maximumFractionDigits:digits,minimumFractionDigits:0}):'—'}
