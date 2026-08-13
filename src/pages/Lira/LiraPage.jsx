import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bot, Send, ShieldAlert, Sparkles } from 'lucide-react'
import { APP_ROUTES } from '../../config/routes'
import { loadPatientRegistry } from '../../services/patientService'
import { loadPatientSamples } from '../../services/patientSamplesService'
import { loadInfections } from '../../services/infectionsService'
import { loadCapa } from '../../services/qualityService'
import { loadIndicatorsSnapshot } from '../../services/indicatorsService'
import { loadHandHygieneSessions } from '../../services/preventionService'
import { PageChrome, PageHeader } from '../../components/core'
import { useI18n } from '../../i18n'
import { studioDisplayValue } from '../Studio/studioPresentation'
import './LiraPage.css'

export default function LiraPage(){
 const {language}=useI18n(), L=(el,en)=>language==='en'?en:el
 const d=useMemo(snapshot,[])
 const welcome=()=>L(
   'Είμαι η LIRA. Μπορώ να συνοψίσω τα διαθέσιμα δεδομένα του Limoxis και να σας οδηγήσω στις σχετικές εγγραφές.',
   'I am LIRA. I can summarize available Limoxis data and guide you to related records.'
 )
 const [messages,setMessages]=useState([{id:1,role:'assistant',text:welcome()}])
 const [input,setInput]=useState('')
 useEffect(()=>{
   setMessages([{id:`welcome-${language}`,role:'assistant',text:welcome()}])
   setInput('')
 },[language])
 const prompts=[['summary',L('Σύνοψη τελευταίων δεδομένων','Summary of current data')],['mdr',L('MDR/XDR που χρειάζονται προσοχή','MDR/XDR requiring attention')],['departments',L('Τμήματα με αυξημένη επιτήρηση','Departments with increased surveillance')],['who',L('Συμμόρφωση Υγιεινής Χεριών','Hand hygiene compliance')],['capa',L('Εκκρεμείς CAPA','Open CAPA')],['microbes',L('Συχνότεροι μικροοργανισμοί','Most frequent microorganisms')]]
 const ask=(text,key)=>{if(!text.trim())return;const a=answer(key||classify(text),d,L,language);setMessages(m=>[...m,{id:Date.now(),role:'user',text},{id:Date.now()+1,role:'assistant',text:a.text,links:a.links}]);setInput('')}
 return <PageChrome className="lira-page" header={<PageHeader eyebrow="LIRA AI" title="Limoxis Intelligent Reporting Assistant" description={L('Αναλυτική εικόνα και συνομιλία πάνω στα διαθέσιμα δεδομένα του Limoxis.','Analytics and conversation over available Limoxis data.')}/>}>
  <div className="lira-notice"><ShieldAlert size={17}/>{L('Η LIRA υποστηρίζει επιτήρηση και αναφορά. Δεν αντικαθιστά κλινική κρίση, διάγνωση ή θεραπευτική απόφαση.','LIRA supports surveillance and reporting. It does not replace clinical judgement, diagnosis or treatment decisions.')}</div>
  <div className="lira-layout">
   <main className="lira-chat lira-chat--primary"><header><Bot size={20}/><div><strong>LIRA Chat</strong><small>{L('Ανάλυση των διαθέσιμων δεδομένων Limoxis','Analysis of available Limoxis data')}</small></div></header><div className="lira-messages">{messages.map(m=><div key={m.id} className={`lira-message ${m.role}`}><div>{m.text}</div>{m.links?.map(x=><Link key={x.path} to={x.path}>{x.label}<ArrowRight size={12}/></Link>)}</div>)}</div><form onSubmit={e=>{e.preventDefault();ask(input)}}><textarea rows="2" value={input} onChange={e=>setInput(e.target.value)} placeholder={L('Ρωτήστε τη LIRA για τα δεδομένα…','Ask LIRA about the data…')}/><button type="submit" disabled={!input.trim()} aria-label={L("Αποστολή","Send")} title={L("Αποστολή","Send")}><Send size={18}/></button></form><p>{L('Οι απαντήσεις αυτής της έκδοσης παράγονται τοπικά από τα δεδομένα της εφαρμογής. Πραγματικό AI model θα συνδεθεί μέσω production backend.','Answers in this version are generated locally from application data. A real AI model will be connected through the production backend.')}</p></main>
   <aside className="lira-main lira-side">
    <section className="lira-panel"><div className="lira-head"><div><span>{L('ΓΡΗΓΟΡΗ ΑΝΑΛΥΣΗ','QUICK ANALYSIS')}</span><h2>{L('Ρωτήστε τη LIRA','Ask LIRA')}</h2></div></div><div className="lira-prompts">{prompts.map(([k,t])=><button type="button" key={k} onClick={()=>ask(t,k)}>{t}<ArrowRight size={14}/></button>)}</div></section>
    <section className="lira-panel"><div className="lira-head"><div><span>{L('ΣΗΜΑΤΑ','SIGNALS')}</span><h2>{L('Τι χρειάζεται προσοχή','What needs attention')}</h2></div><Sparkles size={20}/></div>
     <Insight title={L('Εργαστηριακά ευρήματα','Laboratory findings')} text={d.positive.length?L(`Υπάρχουν ${d.positive.length} θετικά αποτελέσματα για αναλυτικό έλεγχο.`,`There are ${d.positive.length} positive results available for detailed review.`):L('Δεν υπάρχουν θετικά αποτελέσματα στα διαθέσιμα δεδομένα.','No positive results are present in the available data.')} path={APP_ROUTES.LABORATORY} L={L}/>
     <Insight title={L('Αντοχή μικροοργανισμών','Antimicrobial resistance')} text={d.resistant.length?L(`${d.resistant.length} ευρήματα έχουν σήμανση MDR/XDR και χρειάζονται συσχέτιση με την ενεργή επιτήρηση.`,`${d.resistant.length} findings are flagged MDR/XDR and should be correlated with active surveillance.`):L('Δεν εντοπίζεται σήμανση MDR/XDR στα διαθέσιμα θετικά δείγματα.','No MDR/XDR flags are detected in available positive samples.')} path={APP_ROUTES.LABORATORY} L={L}/>
     <Insight title={L('Ενέργειες ποιότητας','Quality actions')} text={d.openCapa.length?L(`Υπάρχουν ${d.openCapa.length} ανοικτές CAPA που χρειάζονται παρακολούθηση.`,`${d.openCapa.length} open CAPA require follow-up.`):L('Δεν υπάρχουν ανοικτές CAPA.','There are no open CAPA.')} path={APP_ROUTES.QUALITY_CAPA} L={L}/>
    </section>
   </aside>
  </div>
 </PageChrome>
}
function Insight({title,text,path,L}){return <article className="lira-insight"><div><strong>{title}</strong><p>{text}</p></div><Link to={path}>{L('Άνοιγμα','Open')}<ArrowRight size={13}/></Link></article>}
function snapshot(){const patients=loadPatientRegistry(),samples=loadPatientSamples(),infections=loadInfections(),capa=loadCapa(),indicators=loadIndicatorsSnapshot(),hh=loadHandHygieneSessions();const positive=samples.filter(x=>x.status==='Θετικό'||String(x.result||'').toLowerCase()==='positive');const resistant=positive.filter(x=>x.mdr||x.xdr||x.isMDR||x.isXDR||/MDR|XDR/i.test(String(x.resistance||'')));const active=infections.filter(x=>!['Κλειστή','Κλειστό','Ολοκληρωμένη','Ολοκληρωμένο','Closed'].includes(x.status));const openCapa=capa.filter(x=>!['Ολοκληρωμένο','Κλειστό','Completed','Closed'].includes(x.status));const attention=indicators.filter(x=>['danger','warning'].includes(x.status?.tone)).length;return{patients,samples,positive,resistant,active,openCapa,attention,hh}}
function classify(q){q=q.toLocaleLowerCase('el-GR');if(/mdr|xdr|αντοχ/.test(q))return'mdr';if(/τμήμ|department/.test(q))return'departments';if(/who|χερι|hand/.test(q))return'who';if(/capa/.test(q))return'capa';if(/μικρο|micro/.test(q))return'microbes';return'summary'}
function answer(k,d,L,language='el'){
 const links=(label,path)=>[{label,path}]
 if(k==='mdr')return{text:d.resistant.length?L(`Εντοπίζονται ${d.resistant.length} θετικά δείγματα με σήμανση MDR/XDR. Ελέγξτε τις αντίστοιχες εργαστηριακές εγγραφές.`,`There are ${d.resistant.length} positive samples flagged MDR/XDR. Review the corresponding laboratory records.`):L('Δεν εντοπίζονται επισημασμένα MDR/XDR στα διαθέσιμα δεδομένα.','No flagged MDR/XDR were found.'),links:links(L('Εργαστήριο','Laboratory'),APP_ROUTES.LABORATORY)}
 if(k==='capa')return{text:L(`Υπάρχουν ${d.openCapa.length} ανοικτές CAPA. Ελέγξτε προθεσμίες, υπευθύνους και αποτελεσματικότητα.`,`There are ${d.openCapa.length} open CAPA. Review due dates, owners and effectiveness.`),links:links('CAPA',APP_ROUTES.QUALITY_CAPA)}
 if(k==='who'){const obs=d.hh.flatMap(x=>x.observations||[]),good=obs.filter(x=>x.compliant===true||x.result==='Συμμόρφωση'||x.status==='Compliant').length,p=obs.length?Math.round(good/obs.length*100):null;return{text:p==null?L('Δεν υπάρχουν αρκετές παρατηρήσεις για υπολογισμό συμμόρφωσης.','There are not enough observations to calculate compliance.'):L(`Η διαθέσιμη συμμόρφωση είναι περίπου ${p}% (${good}/${obs.length}).`,`Available compliance is approximately ${p}% (${good}/${obs.length}).`),links:links(L('Υγιεινή Χεριών','Hand hygiene'),APP_ROUTES.HAND_HYGIENE)}}
 if(k==='departments'){const m={};d.positive.forEach(x=>{const dep=x.department||x.patientDepartment;if(dep)m[dep]=(m[dep]||0)+1});const top=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,3);const shown=top.map(([x,n])=>`${studioDisplayValue(x,language)} (${n})`).join(', ');return{text:top.length?L(`Περισσότερα θετικά δείγματα καταγράφονται στα: ${top.map(([x,n])=>`${x} (${n})`).join(', ')}. Πρόκειται για σήμα επιτήρησης, όχι σύγκριση κινδύνου χωρίς παρονομαστές.`,`More positive samples are recorded in: ${shown}. This is a surveillance signal, not a risk comparison without denominators.`):L('Δεν υπάρχουν αρκετά δεδομένα τμήματος για σύγκριση.','There is not enough department data for comparison.'),links:links(L('Λοιμώξεις','Infections'),APP_ROUTES.INFECTIONS)}}
 if(k==='microbes'){const m={};d.positive.forEach(x=>{const v=x.microorganism||x.organism;if(v)m[v]=(m[v]||0)+1});const top=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5);return{text:top.length?L(`Συχνότερα ευρήματα: ${top.map(([x,n])=>`${x} (${n})`).join(', ')}. Για πραγματική τάση απαιτείται χρονική σύγκριση και κατάλληλος παρονομαστής.`,`Most frequent findings: ${top.map(([x,n])=>`${x} (${n})`).join(', ')}. A true trend requires time comparison and an appropriate denominator.`):L('Δεν υπάρχουν αρκετά θετικά δείγματα με μικροοργανισμό.','There are not enough positive samples with a microorganism.'),links:links(L('Εργαστήριο','Laboratory'),APP_ROUTES.LABORATORY)}}
 return{text:L(`Διαθέσιμα: ${d.patients.length} ασθενείς, ${d.positive.length} θετικά δείγματα, ${d.resistant.length} MDR/XDR, ${d.active.length} ενεργές λοιμώξεις και ${d.openCapa.length} ανοικτές CAPA.`,`Available: ${d.patients.length} patients, ${d.positive.length} positive samples, ${d.resistant.length} MDR/XDR, ${d.active.length} active infections and ${d.openCapa.length} open CAPA.`),links:links(L('Dashboard','Dashboard'),APP_ROUTES.DASHBOARD)}
}
