import { APP_EVENTS, emitAppEvent } from '../core/events'
import { indicatorRepository } from '../repositories/indicatorRepository'
import { loadHandHygieneSessions } from './preventionService'
import { loadStaffVaccinations } from './preventionService'
import { loadAllEmployees } from './employeesService'
import { loadPatientSamples } from './patientSamplesService'
import { loadIsolations } from './isolationsService'
import { loadDailyCensus, loadAntibioticDDD, loadStructuralSnapshots, loadPrevalenceSnapshots } from './indicatorSourceDataService'
import { loadTraining } from './organizationService'

export const INDICATORS_EVENT = APP_EVENTS.INDICATORS_UPDATED

const OFFICIAL_DEFINITIONS = [
  { id:'bsi-incidence', name:'Επίπτωση Βακτηριαιμιών', category:'Κλινικός / Επιδημιολογικός', unit:'/ 1.000 ασθενείς-ημέρες', frequency:'Μηνιαία', recipient:'ΕΟΔΥ · Πρόγραμμα «Προκρούστης»', source:'Εργαστήριο + ημερήσιο νοσηλευτικό census', formula:'(Νέες βακτηριαιμίες ÷ ασθενείς-ημέρες νοσηλείας) × 1.000', mode:'automatic', description:'Υπολογίζεται από θετικές καλλιέργειες αίματος και τις ημερήσιες ασθενείς-ημέρες της ίδιας περιόδου.' },
  { id:'point-prevalence', name:'Σημειακός Επιπολασμός Λοιμώξεων & Χρήσης Αντιβιοτικών', category:'Κλινικός / Επιδημιολογικός', unit:'%', frequency:'Ανά διετία', recipient:'ΕΟΔΥ · ECDC', source:'Ημερήσια καταγραφή νοσηλευομένων', formula:'(Ασθενείς με ενεργή νοσοκομειακή λοίμωξη ÷ σύνολο νοσηλευομένων την ημέρα καταγραφής) × 100', mode:'automatic', description:'Χρησιμοποιεί την πιο πρόσφατη ολοκληρωμένη ημερήσια αποτύπωση ως φωτογραφική καταγραφή PPS.' },
  { id:'amr', name:'Μικροβιακή Αντοχή', category:'Μικροβιολογικός', unit:'%', frequency:'Εξαμηνιαία', recipient:'ΕΟΔΥ', source:'Εργαστήριο · Αντιβιογράμματα', formula:'(Ανθεκτικά αποτελέσματα R ÷ σύνολο αποτελεσμάτων S/I/R) × 100', mode:'automatic', description:'Συνοπτική εικόνα αντοχής από τα αντιβιογράμματα. Η αναλυτική αναφορά παραμένει διαθέσιμη ανά παθογόνο και αντιβιοτικό.' },
  { id:'antibiotic-consumption', name:'Κατανάλωση Αντιβιοτικών', category:'Φαρμακευτικός', unit:'DDD / 1.000 ασθενείς-ημέρες', frequency:'Εξαμηνιαία', recipient:'ΕΟΔΥ', source:'Φαρμακείο · WHO-ATC/DDD + ημερήσιο census', formula:'(Σύνολο DDD ÷ ασθενείς-ημέρες νοσηλείας) × 1.000', mode:'automatic', description:'Υπολογίζεται από εγγραφές DDD του φαρμακείου και τις ασθενείς-ημέρες της ίδιας περιόδου.' },
  { id:'hand-hygiene', name:'Συμμόρφωση Υγιεινής Χεριών', category:'Πρόληψη', unit:'%', frequency:'Συνεχής', recipient:'ΕΝΛ · Εθνικό πρόγραμμα ΕΟΔΥ', source:'Υγιεινή Χεριών · WHO 5 Moments', formula:'(Παρατηρηθείσες συμμορφώσεις ÷ σύνολο ευκαιριών) × 100', mode:'automatic', description:'Υπολογίζεται από όλες τις καταχωρημένες ευκαιρίες παρατήρησης.' },
  { id:'mdr-isolations', name:'Νέες Απομονώσεις MDR', category:'Κλινικός / Επιδημιολογικός', unit:'περιστατικά', frequency:'Μηνιαία', recipient:'ΕΟΔΥ · Πρόγραμμα «Προκρούστης»', source:'Απομονώσεις ασθενών MDR', formula:'Αριθμός νέων περιστατικών απομόνωσης ανά περίοδο, τμήμα και παθογόνο', mode:'automatic', description:'Μετρά τις νέες απομονώσεις στην επιλεγμένη περίοδο.' },
  { id:'staff-vaccination', name:'Εμβολιασμός Προσωπικού', category:'Πρόληψη', unit:'%', frequency:'Ετήσια', recipient:'ΕΟΔΥ · Υπουργείο Υγείας', source:'Εμβολιασμοί + Μητρώο Εργαζομένων', formula:'(Εμβολιασμένο προσωπικό ÷ σύνολο ενεργού προσωπικού) × 100', mode:'automatic', description:'Χρησιμοποιεί τις καταχωρήσεις αντιγριπικού εμβολιασμού της επιλεγμένης περιόδου.' },
  { id:'training-compliance', name:'Συμμόρφωση Υποχρεωτικής Εκπαίδευσης', category:'Εκπαίδευση / Επάρκεια', unit:'%', frequency:'Μηνιαία', recipient:'Διοίκηση · Ποιότητα · Εκπαίδευση', source:'Εκπαίδευση + Μητρώο Εργαζομένων', formula:'(Ενεργοί εργαζόμενοι με ισχύουσα ολοκληρωμένη υποχρεωτική εκπαίδευση ÷ ενεργοί εργαζόμενοι που έχουν ανατεθεί) × 100', mode:'automatic', description:'Παρακολουθεί την κάλυψη και την ισχύ των υποχρεωτικών εκπαιδεύσεων και αναδεικνύει ανάγκες επανεκπαίδευσης.' },
  { id:'structural-quality', name:'Δομικοί / Ποιοτικοί Δείκτες', category:'Δομικός', unit:'', frequency:'Ετήσια / σε κάθε μεταβολή', recipient:'ΕΟΔΥ · Υπουργείο Υγείας · ΕΣΥnet', source:'Δομικά στοιχεία νοσοκομείου', formula:'Καταγραφή κατάστασης — όχι αριθμητικός τύπος', mode:'automatic', description:'Παρουσιάζει την πιο πρόσφατη αποτύπωση κλινών και στελέχωσης και διατηρεί ιστορικό μεταβολών.' },
]

export function loadIndicatorSettings(){ return indicatorRepository.loadSettings() }
export function saveIndicatorSettings(settings){ const next=indicatorRepository.saveSettings(settings||{}); emitAppEvent(INDICATORS_EVENT,next); return next }
export function updateIndicatorSettings(id,patch){ const current=loadIndicatorSettings(); return saveIndicatorSettings({...current,[id]:{...(current[id]||{}),...patch}}) }
export function loadCustomIndicators(){ return indicatorRepository.loadCustom() }
export function saveCustomIndicators(rows){ const next=indicatorRepository.saveCustom(rows||[]); emitAppEvent(INDICATORS_EVENT,next); return next }

function dateValue(value){ if(!value)return null; const text=String(value); const normalized=/^\d{4}-\d{2}-\d{2}$/.test(text)?text:text.includes('/')?text.split('/').reverse().join('-'):text.slice(0,10); const date=new Date(`${normalized}T12:00:00`); return Number.isNaN(date.getTime())?null:date }
function endOfDay(date){ return new Date(date.getFullYear(),date.getMonth(),date.getDate(),23,59,59,999) }
function normalizeRange(range){ const start=dateValue(range?.from); const rawEnd=dateValue(range?.to); return start||rawEnd?{start:start||new Date(2000,0,1),end:rawEnd?endOfDay(rawEnd):new Date(2100,11,31,23,59,59),custom:true}:null }
function rangeLabel(range){ if(!range?.custom)return ''; const f=(d)=>d.toLocaleDateString('el-GR'); return `${f(range.start)} – ${f(range.end)}` }
function isCompliant(observation={}){ if(observation.action)return observation.action==='HR'||observation.action==='HW'; return observation.compliant==='Ναι' }
function percent(n,d){ return d?Math.round((n/d)*1000)/10:null }
function round(value,digits=1){ if(!Number.isFinite(value))return null; const factor=10**digits; return Math.round(value*factor)/factor }
function monthLabels(count=6, anchor=new Date()){ return Array.from({length:count},(_,index)=>{const date=new Date(anchor.getFullYear(),anchor.getMonth()-(count-1-index),1);return{key:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`,label:date.toLocaleDateString('el-GR',{month:'short'}),start:new Date(date.getFullYear(),date.getMonth(),1),end:new Date(date.getFullYear(),date.getMonth()+1,0,23,59,59)}}) }
function inRange(value,start,end){ const date=dateValue(value); return Boolean(date&&date>=start&&date<=end) }
function recentMonthsRange(months=6){ const now=new Date(); return {start:new Date(now.getFullYear(),now.getMonth()-(months-1),1),end:new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59),custom:false} }
function currentMonthRange(){ const now=new Date(); return {start:new Date(now.getFullYear(),now.getMonth(),1),end:new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59),custom:false} }
function currentYearRange(){ const now=new Date(); return {start:new Date(now.getFullYear(),0,1),end:new Date(now.getFullYear(),11,31,23,59,59),custom:false} }
function resolvedRange(custom,fallback){ return custom || fallback }
function censusPatientDays(rows,start,end){ return rows.filter((row)=>inRange(row.date,start,end)).reduce((sum,row)=>sum+Number(row.patientDays||row.totalPatients||0),0) }
function input(label,value,detail=''){ return {label,value,detail} }
function withPeriod(metric, range){ return {...metric, periodLabel: rangeLabel(range)} }

function handHygieneMetric(custom){
  const range=resolvedRange(custom,recentMonthsRange(6));
  const all=loadHandHygieneSessions();
  const sessions=all.filter((s)=>inRange(s.date,range.start,range.end));
  const observations=sessions.flatMap((s)=>s.observations||[]);
  const compliant=observations.filter(isCompliant).length;
  const history=monthLabels(6,range.end).map((slot)=>{const obs=all.filter((s)=>inRange(s.date,slot.start,slot.end)).flatMap((s)=>s.observations||[]);return{label:slot.label,value:percent(obs.filter(isCompliant).length,obs.length)}});
  return withPeriod({value:percent(compliant,observations.length),numerator:compliant,denominator:observations.length,history,inputs:[input('Συνεδρίες WHO',sessions.length),input('Ευκαιρίες παρατήρησης',observations.length),input('Συμμορφώσεις',compliant)]},range)
}
function mdrIsolationMetric(custom){
  const range=resolvedRange(custom,currentMonthRange()); const rows=loadIsolations();
  const current=rows.filter((item)=>inRange(item.startDate||item.date||item.createdAt,range.start,range.end)).length;
  const history=monthLabels(6,range.end).map((slot)=>({label:slot.label,value:rows.filter((item)=>inRange(item.startDate||item.date||item.createdAt,slot.start,slot.end)).length}));
  return withPeriod({value:current,numerator:current,denominator:null,history,inputs:[input('Σύνολο απομονώσεων περιόδου',current)]},range)
}
function vaccinationMetric(custom){
  const range=resolvedRange(custom,currentYearRange());
  const employees=loadAllEmployees().filter((item)=>item.status!=='Ανενεργό');
  const records=loadStaffVaccinations().filter((item)=>{const vaccine=String(item.vaccine||'').toLocaleLowerCase('el-GR');return inRange(item.date,range.start,range.end)&&(vaccine.includes('γρίπ')||vaccine.includes('γριπ')||vaccine.includes('influenza'))});
  const vaccinated=new Set(records.map((item)=>item.employeeId||item.employeeName).filter(Boolean)).size;
  return withPeriod({value:percent(vaccinated,employees.length),numerator:vaccinated,denominator:employees.length,history:[],inputs:[input('Ενεργό προσωπικό',employees.length),input('Εμβολιασμένοι',vaccinated),input('Εγγραφές εμβολιασμού',records.length)]},range)
}
function bacteremiaMetric(custom){
  const samples=loadPatientSamples(); const census=loadDailyCensus(); const range=resolvedRange(custom,currentMonthRange());
  const blood=(s,e)=>samples.filter((item)=>inRange(item.collectionDate,s,e)&&String(item.sampleType||'').toLocaleLowerCase('el-GR').includes('αίμα')&&item.status==='Θετικό'&&item.isBacteremia!==false);
  const current=blood(range.start,range.end); const patientDays=censusPatientDays(census,range.start,range.end);
  const history=monthLabels(6,range.end).map((slot)=>{const numerator=blood(slot.start,slot.end).length;const denominator=censusPatientDays(census,slot.start,slot.end);return{label:slot.label,value:denominator?round((numerator/denominator)*1000,2):null}});
  return withPeriod({value:patientDays?round((current.length/patientDays)*1000,2):null,numerator:current.length,denominator:patientDays||null,history,inputs:[input('Θετικές καλλιέργειες αίματος',current.length),input('Ασθενείς-ημέρες',patientDays),input('Ημερήσιες εγγραφές census',census.filter((row)=>inRange(row.date,range.start,range.end)).length)]},range)
}
function pointPrevalenceMetric(custom){
  const all=[...loadPrevalenceSnapshots()].filter((row)=>row.completed!==false).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const rows=custom?all.filter((row)=>inRange(row.date,custom.start,custom.end)):all; const latest=rows.at(-1);
  if(!latest)return withPeriod({value:null,numerator:null,denominator:null,history:[],inputs:[input('Καταγραφές PPS',0)]},custom||{custom:false});
  const total=Number(latest.totalPatients||0); const infected=Number(latest.activeHAI||0);
  const history=rows.slice(-6).map((row)=>({label:new Date(`${row.date}T12:00:00`).toLocaleDateString('el-GR',{month:'short',year:'2-digit'}),value:percent(Number(row.activeHAI||0),Number(row.totalPatients||0))}));
  return withPeriod({value:percent(infected,total),numerator:infected,denominator:total,history,inputs:[input('Καμπάνια / snapshot',latest.campaign||latest.date),input('Ημερομηνία',latest.date),input('Νοσηλευόμενοι',total),input('Ενεργές νοσοκομειακές λοιμώξεις',infected),input('Υπό αντιβιοτική αγωγή',Number(latest.patientsOnAntibiotics||0))]},custom||{custom:false})
}
function amrMetric(custom){
  const samples=loadPatientSamples(); const range=resolvedRange(custom,recentMonthsRange(6));
  const positive=samples.filter((item)=>inRange(item.collectionDate,range.start,range.end)&&item.status==='Θετικό'&&item.microorganism);
  const tests=positive.flatMap((item)=>(item.antibiogram||[]).filter((ab)=>['S','I','R'].includes(ab.sensitivity))); const resistant=tests.filter((item)=>item.sensitivity==='R').length;
  const history=monthLabels(6,range.end).map((slot)=>{const period=samples.filter((item)=>inRange(item.collectionDate,slot.start,slot.end)&&item.status==='Θετικό').flatMap((item)=>(item.antibiogram||[]).filter((ab)=>['S','I','R'].includes(ab.sensitivity)));return{label:slot.label,value:percent(period.filter((ab)=>ab.sensitivity==='R').length,period.length)}});
  return withPeriod({value:percent(resistant,tests.length),numerator:resistant,denominator:tests.length,history,inputs:[input('Θετικές απομονώσεις',positive.length),input('Αποτελέσματα αντιβιογράμματος',tests.length),input('Ανθεκτικά R',resistant)]},range)
}
function antibioticConsumptionMetric(custom){
  const ddd=loadAntibioticDDD(); const census=loadDailyCensus(); const range=resolvedRange(custom,recentMonthsRange(6));
  const current=ddd.filter((row)=>inRange(row.date,range.start,range.end)); const totalDDD=current.reduce((sum,row)=>sum+Number(row.ddd||0),0); const patientDays=censusPatientDays(census,range.start,range.end);
  const history=monthLabels(6,range.end).map((slot)=>{const n=ddd.filter((row)=>inRange(row.date,slot.start,slot.end)).reduce((sum,row)=>sum+Number(row.ddd||0),0);const d=censusPatientDays(census,slot.start,slot.end);return{label:slot.label,value:d?round((n/d)*1000,2):null}});
  return withPeriod({value:patientDays?round((totalDDD/patientDays)*1000,2):null,numerator:round(totalDDD,1),denominator:patientDays||null,history,inputs:[input('Εγγραφές φαρμακείου',current.length),input('Σύνολο DDD',round(totalDDD,1)),input('Ασθενείς-ημέρες',patientDays)]},range)
}
function trainingComplianceMetric(custom){
  const range=resolvedRange(custom,currentYearRange()); const employees=loadAllEmployees().filter(item=>item.status!=='Ανενεργό'); const activeIds=new Set(employees.map(item=>String(item.id))); const rows=loadTraining().filter(row=>row.mandatory && row.status==='Ολοκληρωμένη' && inRange(row.date,range.start,range.end)); const assigned=new Set(); const valid=new Set(); const today=new Date().toISOString().slice(0,10); rows.forEach(row=>(row.attendance||[]).forEach(att=>{const id=String(att.employeeId||''); if(!id||!activeIds.has(id))return; assigned.add(id); const completed=['Παρών','Online'].includes(att.status); const expiry=att.competencyValidUntil||row.validUntil||''; const competent=!row.competencyRequired||att.competencyResult==='Επαρκής'; if(completed&&competent&&(!expiry||expiry>=today))valid.add(id)})); return withPeriod({value:percent(valid.size,assigned.size),numerator:valid.size,denominator:assigned.size,history:[],inputs:[input('Ενεργό προσωπικό',employees.length),input('Ανατεθειμένοι σε υποχρεωτική εκπαίδευση',assigned.size),input('Με ισχύουσα ολοκλήρωση / επάρκεια',valid.size)]},range)
}
function structuralMetric(custom){
  const all=[...loadStructuralSnapshots()].sort((a,b)=>String(a.date).localeCompare(String(b.date))); const rows=custom?all.filter((row)=>inRange(row.date,custom.start,custom.end)):all; const latest=rows.at(-1);
  if(!latest)return withPeriod({value:null,numerator:null,denominator:null,history:[],inputs:[input('Δομικές αποτυπώσεις',0)]},custom||{custom:false});
  return withPeriod({value:`${latest.totalBeds||0} κλίνες · ${latest.nelNurses||0} ΝΕΛ`,numerator:null,denominator:null,history:[],inputs:[input('Ημερομηνία ενημέρωσης',latest.date),input('Σύνολο κλινών',latest.totalBeds||0),input('Κλίνες ΜΕΘ',latest.icuBeds||0),input('Μονόκλινα',latest.singleRooms||0),input('ΝΕΛ',latest.nelNurses||0),input('Λοιμωξιολόγοι',latest.infectiousDiseaseDoctors||0),input('Μικροβιολόγοι',latest.microbiologists||0)]},custom||{custom:false})
}

function metricFor(id,custom){ if(id==='hand-hygiene')return handHygieneMetric(custom); if(id==='mdr-isolations')return mdrIsolationMetric(custom); if(id==='staff-vaccination')return vaccinationMetric(custom); if(id==='bsi-incidence')return bacteremiaMetric(custom); if(id==='point-prevalence')return pointPrevalenceMetric(custom); if(id==='amr')return amrMetric(custom); if(id==='antibiotic-consumption')return antibioticConsumptionMetric(custom); if(id==='training-compliance')return trainingComplianceMetric(custom); if(id==='structural-quality')return structuralMetric(custom); return{value:null,numerator:null,denominator:null,history:[],inputs:[],periodLabel:rangeLabel(custom)} }
function statusFor(definition,metric,settings){ if(metric.value==null||metric.value==='')return{label:'Χωρίς δεδομένα',tone:'warning'}; const target=Number(settings.target); if(typeof metric.value==='number'&&Number.isFinite(target)&&settings.target!==''&&settings.target!=null){const good=(settings.direction||'higher')==='lower'?metric.value<=target:metric.value>=target;return good?{label:'Εντός στόχου',tone:'success'}:{label:'Χρειάζεται προσοχή',tone:'danger'}} return{label:'Υπολογίζεται αυτόματα',tone:'success'} }

export function loadIndicatorsSnapshot(rangeInput={}){
  const settings=loadIndicatorSettings(); const customRange=normalizeRange(rangeInput);
  const official=OFFICIAL_DEFINITIONS.map((definition)=>{const metric=metricFor(definition.id,customRange);const local=settings[definition.id]||{};return{...definition,...local,official:true,metric,status:statusFor(definition,metric,local)}});
  const custom=loadCustomIndicators().map((item)=>({...item,official:false,mode:item.mode||'manual',metric:{value:item.value??null,numerator:null,denominator:null,history:[],inputs:[],periodLabel:rangeLabel(customRange)},status:item.value===''||item.value==null?{label:'Χωρίς δεδομένα',tone:'warning'}:{label:'Χειροκίνητος',tone:'info'}}));
  return[...official,...custom]
}
export function getIndicatorDefinitions(){ return OFFICIAL_DEFINITIONS }
