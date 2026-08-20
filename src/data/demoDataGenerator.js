import { APP_EVENTS, emitAppEvent } from '../core/events'
import { readJson, removeStoredValue, writeJson } from '../core/storage'
import { loadPatientRegistry, savePatientRegistry } from '../services/patientService'
import { loadAllEmployees, saveEmployees } from '../services/employeesService'
import { loadHandHygieneSessions, saveHandHygieneSessions } from '../services/preventionService'
import { loadStaffVaccinations, saveStaffVaccinations } from '../services/preventionService'
import { loadPatientSamples, savePatientSamples } from '../services/patientSamplesService'
import { loadSurveillanceCases, replaceSurveillanceCases } from '../services/surveillanceCasesService'
import { loadIsolations, replaceIsolations as saveIsolations } from '../services/isolationsService'
import { loadInfections, replaceInfections as saveInfections } from '../services/infectionsService'
import { loadAntisepticConsumption, saveAntisepticConsumption } from '../services/preventionService'
import { loadWasteMeasurements, saveWasteMeasurements } from '../services/preventionService'
import { loadPromotedAntibiotics, savePromotedAntibiotics } from '../services/preventionService'
import { loadNotifiableDiseases, saveNotifiableDiseases } from '../services/notifiableDiseasesService'
import { loadControlPrograms, loadControlExecutions, saveControlPrograms, saveControlExecutions } from '../services/surveillanceControlsService'
import { loadDailyCensus, loadAntibioticDDD, loadStructuralSnapshots, loadPrevalenceSnapshots, saveDailyCensus, saveAntibioticDDD, saveStructuralSnapshots, savePrevalenceSnapshots } from '../services/indicatorSourceDataService'
import { masterNames } from '../services/masterDataService'
import { loadIncidents, loadCapa, loadAuditExecutions, saveIncidents, saveCapa, saveAuditExecutions } from '../services/qualityService'
import { loadTraining, loadCommittees, loadDocuments, replaceTrainingCollection, replaceCommitteesCollection, replaceDocumentsCollection } from '../services/organizationService'

export const DEMO_DATA_EVENT = APP_EVENTS.DEMO_DATA_UPDATED
const DEMO_FLAG = '_demo'

function seededRandom(seed = 53536) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function pad(value) { return String(value).padStart(2, '0') }
function isoDate(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }
function greekDate(date) { return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}` }
function addDays(date, days) { const next = new Date(date); next.setDate(next.getDate() + days); return next }
function pick(rng, values) { return values[Math.floor(rng() * values.length)] }
function numberBetween(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min }
function decimalBetween(rng, min, max, digits = 1) { return Number((min + rng() * (max - min)).toFixed(digits)) }
function withoutDemo(rows = []) { return rows.filter((row) => !row?.[DEMO_FLAG]) }
function mergeDemo(rows, demo) { return [...withoutDemo(rows), ...demo] }

const departments = masterNames('departments')
const firstNames = ['Αλέξανδρος','Μαρία','Νικόλαος','Ελένη','Γεώργιος','Σοφία','Ιωάννης','Αναστασία','Κωνσταντίνος','Ευαγγελία','Δημήτριος','Κατερίνα','Παναγιώτης','Άννα','Χρήστος','Βασιλική']
const lastNames = ['Παπαδόπουλος','Γεωργίου','Νικολάου','Κωνσταντίνου','Δημητρίου','Αντωνίου','Μακρή','Λάμπρου','Οικονόμου','Καραγιάννης','Ιωάννου','Χριστοδούλου','Σταθόπουλος','Αλεξίου','Βασιλείου']
const pathogens = ['Klebsiella pneumoniae','Escherichia coli','Pseudomonas aeruginosa','Acinetobacter baumannii','Staphylococcus aureus','Enterococcus faecium','Enterobacter cloacae','Proteus mirabilis']
const antibiotics = ['Meropenem','Imipenem','Ceftriaxone','Ceftazidime','Piperacillin/Tazobactam','Ciprofloxacin','Gentamicin','Amikacin','Vancomycin','Linezolid','Colistin']
const promotedAntibiotics = ['Meropenem','Imipenem/Cilastatin','Ceftazidime/Avibactam','Ceftolozane/Tazobactam','Colistin','Linezolid']

function buildPatients(rng, now, count = 220) {
  return Array.from({ length: count }, (_, index) => {
    const admission = addDays(now, -numberBetween(rng, 0, 900))
    const stillIn = rng() < 0.28
    const stay = numberBetween(rng, 2, 24)
    const discharge = stillIn ? null : addDays(admission, stay)
    const firstName = pick(rng, firstNames)
    const lastName = pick(rng, lastNames)
    return {
      id: `DEMO-PAT-${pad(index + 1)}`,
      patientCode: `D-PAT-${String(index + 1).padStart(4, '0')}`,
      firstName, lastName, fullName: `${firstName} ${lastName}`,
      fatherName: pick(rng, firstNames), gender: rng() > .48 ? 'Άνδρας' : 'Γυναίκα', age: numberBetween(rng, 18, 91),
      department: pick(rng, departments), room: String(numberBetween(rng, 101, 428)),
      primaryDiagnosis: pick(rng, ['Πνευμονία','Καρδιακή ανεπάρκεια','Μετεγχειρητική παρακολούθηση','Σήψη','ΧΑΠ','Νεφρική ανεπάρκεια','Γαστρεντερίτιδα','Κάταγμα']),
      admissionDate: isoDate(admission), dischargeDate: discharge && discharge <= now ? isoDate(discharge) : '',
      status: stillIn ? 'Νοσηλεύεται' : 'Εξιτήριο', risk: pick(rng, ['Χαμηλός','Μέτριος','Υψηλός']),
      [DEMO_FLAG]: true,
    }
  })
}

function buildEmployees(rng, count = 110) {
  return Array.from({ length: count }, (_, index) => {
    const firstName = pick(rng, firstNames); const lastName = pick(rng, lastNames)
    return {
      id: `DEMO-EMP-${pad(index + 1)}`, employeeCode: `D-EMP-${String(index + 1).padStart(3, '0')}`,
      firstName, lastName, fullName: `${lastName} ${firstName}`, fatherName: pick(rng, firstNames),
      department: pick(rng, departments), professionalCategory: pick(rng, masterNames('professional-categories')),
      email: `demo${index + 1}@hospital.local`, phone: `24105${String(60000 + index).slice(-5)}`,
      hireDate: `${numberBetween(rng, 2008, 2025)}-${pad(numberBetween(rng, 1, 12))}-${pad(numberBetween(rng, 1, 28))}`,
      status: rng() < .04 ? 'Ανενεργό' : 'Ενεργό', vaccinations: [], [DEMO_FLAG]: true,
    }
  })
}

function buildHandHygiene(rng, now, count = 360) {
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(now, -numberBetween(rng, 0, 900))
    const observationCount = numberBetween(rng, 8, 22)
    const observations = Array.from({ length: observationCount }, (_, obsIndex) => {
      const compliant = rng() < (0.68 + (date.getTime() / now.getTime()) * 0.08)
      return {
        id: `DEMO-HHO-${index + 1}-${obsIndex + 1}`,
        moment: String(numberBetween(rng, 1, 5)),
        profession: pick(rng, ['Νοσηλευτής','Ιατρός','Βοηθός νοσηλευτή','Φυσικοθεραπευτής']),
        action: compliant ? (rng() < .82 ? 'HR' : 'HW') : 'MISS',
        compliant: compliant ? 'Ναι' : 'Όχι', [DEMO_FLAG]: true,
      }
    })
    return { id:`DEMO-HH-${String(index + 1).padStart(3,'0')}`, date:isoDate(date), department:pick(rng,departments), observer:'ΝΕΛ Demo', duration:20, status:'Ολοκληρωμένη', observations, [DEMO_FLAG]:true }
  })
}

function buildVaccinations(rng, employees, now) {
  const active = employees.filter((row) => row.status !== 'Ανενεργό')
  const records=[]
  const years=[now.getFullYear()-2,now.getFullYear()-1,now.getFullYear()]
  years.forEach((year,yearIndex)=>{
    active.forEach((employee)=>{
      // A realistic annual influenza campaign. Coverage improves slightly year over year.
      const coverage=.68+(yearIndex*.07)
      if(rng()>coverage)return
      const month=pick(rng,[1,1,2,2,3,10,11,12])
      const date=new Date(year,month-1,numberBetween(rng,1,28))
      if(date>now)return
      records.push({
        id:`DEMO-VAC-${year}-${String(records.length+1).padStart(4,'0')}`, employeeId:employee.id, employeeName:employee.fullName,
        department:employee.department, vaccine:'Αντιγριπικό εμβόλιο', dose:'Ετήσια', date:isoDate(date),
        validUntil:`${year+1}-03-31`, notes:`Demo εμβολιασμός ${year}`, [DEMO_FLAG]:true,
      })
    })
  })
  return records
}

function buildSamples(rng, patients, now, count = 900) {
  return Array.from({ length: count }, (_, index) => {
    const patient = pick(rng, patients); const date = addDays(now, -numberBetween(rng,0,900))
    const sampleType = pick(rng, ['Αίμα','Αίμα','Ούρα','Ορθικό επίχρισμα','Βρογχικές εκκρίσεις','Τραύμα'])
    const roll = rng()
    const recent = (now.getTime()-date.getTime()) <= 24*86400000
    const pending = recent && roll < .12
    const positive = !pending && roll < (sampleType === 'Αίμα' ? .39 : .33)
    const microorganism = positive ? pick(rng, pathogens) : ''
    const antibiogram = positive ? Array.from({length:numberBetween(rng,3,6)},(_,abIndex)=>({
      id:`DEMO-ABG-${index + 1}-${abIndex + 1}`, antibiotic:pick(rng,antibiotics), sensitivity:rng()<.32?'R':rng()<.12?'I':'S', mic:String(decimalBetween(rng,.25,16,2)),
    })) : []
    const hasR = antibiogram.some((item) => item.sensitivity === 'R')
    const status = pending ? 'Εκκρεμεί' : positive ? 'Θετικό' : 'Αρνητικό'
    return {
      id:`DEMO-PS-${String(index+1).padStart(4,'0')}`, patientId:patient.id, patientName:patient.fullName, patientCode:patient.patientCode,
      department:patient.department, admissionDate:patient.admissionDate, sampleType, sampleReason: rng()<.16?'Screening':'Καλλιέργεια', category:'Αρχικό / νέο ανεξάρτητο δείγμα',
      collectionDate:greekDate(date), collectionTime:`${pad(numberBetween(rng,7,19))}:${pick(rng,['00','15','30','45'])}`, collector:`Νοσηλευτής ${patient.department}`,
      receivedDate:greekDate(date), status, microorganism, resistance:hasR?pick(rng,['MDR','ESBL','CRE','MRSA']):'',
      resultDate:pending?'':greekDate(addDays(date,1)), resultNotes:pending?'':positive?'Ανάπτυξη μικροοργανισμού.':'Δεν παρατηρήθηκε ανάπτυξη.', antibiogram,
      bsiType: sampleType==='Αίμα'&&positive ? pick(rng,['CLABSI','Δευτεροπαθής','Λοιπή']) : '', isBacteremia:sampleType==='Αίμα'&&positive,
      requiresIsolation:hasR, requiresInfectionReview:positive, clinicalWorkflowState:pending?'pending-laboratory':positive?'confirmed-positive':'closed-negative', notes:'', [DEMO_FLAG]:true,
    }
  })
}

function buildSurveillanceCases(rng, patients, samples, now) {
  const cases=[]
  const extraSamples=[]
  const candidates=samples.filter(row=>row.status==='Θετικό').slice(0,160)
  candidates.forEach((sample,index)=>{
    const patient=patients.find(row=>row.id===sample.patientId)
    if(!patient) return
    const caseId=`DEMO-CASE-${String(index+1).padStart(3,'0')}`
    sample.clinicalCaseId=caseId
    sample.rootSampleId=sample.id
    const createRecheck=rng()<.72
    let status='Ενεργό'; let workflowPhase='confirmed-positive'; let laboratoryOutcome='positive'; let closedDate=''; let close={}
    if(createRecheck){
      const baseDate=new Date(`${sample.collectionDate.split('/').reverse().join('-')}T12:00:00`)
      const recheckDate=addDays(baseDate,numberBetween(rng,3,10))
      const negative=rng()<.48
      const pending=!negative && rng()<.18
      const recheckStatus=pending?'Εκκρεμεί':negative?'Αρνητικό':'Θετικό'
      const recheckId=`DEMO-RC-${String(index+1).padStart(3,'0')}`
      extraSamples.push({
        ...sample,id:recheckId,category:'Επανέλεγχος',isRecheck:true,parentSampleId:sample.id,rootSampleId:sample.id,repeatPurpose:'Έλεγχος αρνητικοποίησης',repeatIndex:1,monitoringFor:[sample.microorganism].filter(Boolean),
        collectionDate:greekDate(recheckDate),receivedDate:greekDate(recheckDate),status:recheckStatus,resultDate:pending?'':greekDate(addDays(recheckDate,1)),
        microorganism:recheckStatus==='Θετικό'?sample.microorganism:'',microorganisms:recheckStatus==='Θετικό'?[sample.microorganism]:[],resistance:recheckStatus==='Θετικό'?sample.resistance:'',antibiogram:recheckStatus==='Θετικό'?sample.antibiogram:[],resultNotes:pending?'':negative?'Αρνητικός επανέλεγχος.':'Παραμονή θετικής καλλιέργειας.',clinicalCaseId:caseId,clinicalWorkflowState:pending?'pending-laboratory':negative?'closed-negative':'confirmed-positive',[DEMO_FLAG]:true,
      })
      if(negative){status='Κλειστό';workflowPhase='closed-negative-recheck';laboratoryOutcome='negative';closedDate=greekDate(addDays(recheckDate,1));close={date:closedDate,triggerSampleId:recheckId,reason:'negative-recheck',result:'Αρνητικοποίηση — αρνητικός επανέλεγχος'}}
      else if(pending){status='Ενεργό';workflowPhase='recheck-pending';laboratoryOutcome='pending'}
    }
    cases.push({
      id:caseId,patientKey:patient.id,patientId:patient.id,patientCode:patient.patientCode,patientName:patient.fullName,department:patient.department,
      title:`Επιτήρηση ${sample.microorganism || sample.sampleType}`,reason:'Κλινική υποψία λοίμωξης',status,workflowPhase,laboratoryOutcome,initialSampleId:sample.id,confirmingSampleId:sample.id,confirmationDate:sample.resultDate||sample.collectionDate,closedDate,close,
      assessment:{suspectedSite:pick(rng,['Αναπνευστικό','Ουροποιητικό','Αιματική λοίμωξη','Χειρουργικό πεδίο']),classification:'Υπό επιτήρηση',notes:'Demo κλινική αξιολόγηση'},therapies:[],devices:[],review:{},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),[DEMO_FLAG]:true,
    })
  })
  return {cases,extraSamples}
}

function buildIsolations(rng, patients, samples) {
  return samples.filter((row)=>row.status==='Θετικό' && row.resistance && rng()<.72).slice(0,180).map((sample,index)=>{
    const patient=patients.find((row)=>row.id===sample.patientId)||pick(rng,patients)
    const start=sample.collectionDate.split('/').reverse().join('-')
    return { id:`DEMO-ISO-${String(index+1).padStart(3,'0')}`, patientId:patient.id, patientName:patient.fullName, patientCode:patient.patientCode, department:patient.department, clinicalCaseId:sample.clinicalCaseId||'', pathogen:sample.microorganism, resistance:sample.resistance, startDate:start, endDate:rng()<.55?isoDate(addDays(new Date(`${start}T12:00:00`),numberBetween(rng,4,16))):'', status:rng()<.55?'Ολοκληρωμένη':'Ενεργή', isolationType:pick(rng,['Επαφή','Συννοσηλεία','Μονόκλινο']), [DEMO_FLAG]:true }
  })
}

function buildInfections(rng, patients, samples) {
  return samples.filter((row)=>row.status==='Θετικό'&&rng()<.48).slice(0,240).map((sample,index)=>{
    const patient=patients.find((row)=>row.id===sample.patientId)||pick(rng,patients)
    const onset=sample.collectionDate.split('/').reverse().join('-')
    return {id:`DEMO-INF-${String(index+1).padStart(3,'0')}`,patientId:patient.id,patientName:patient.fullName,patientCode:patient.patientCode,department:patient.department,onsetDate:onset,infectionType:pick(rng,['Βακτηριαιμία','Πνευμονία','Ουρολοίμωξη','Λοίμωξη χειρουργικού πεδίου']),origin:rng()<.78?'Νοσοκομειακή':'Κοινότητας',pathogen:sample.microorganism,status:rng()<.35?'Ενεργή':'Ολοκληρωμένη',relatedSampleId:sample.id,[DEMO_FLAG]:true}
  })
}

function buildDailyCensus(rng, now, days = 900) {
  const capacities = { 'ΜΕΘ':12,'Παθολογική':36,'Χειρουργική':32,'Καρδιολογική':26,'Παιδιατρική':20,'ΜΤΝ':18,'Χειρουργείο':10,'ΤΕΠ':16 }
  const rows=[]
  for(let offset=days-1; offset>=0; offset--){
    const date=addDays(now,-offset)
    departments.forEach((department,depIndex)=>{
      const capacity=capacities[department]||24
      const census=Math.max(2,Math.min(capacity,Math.round(capacity*(.62+rng()*.32))))
      const hai=Math.min(census,Math.max(0,Math.round(census*(department==='ΜΕΘ'?(.11+rng()*.10):(.025+rng()*.07)))))
      const onAntibiotics=Math.min(census,Math.round(census*(.20+rng()*.30)))
      rows.push({id:`DEMO-CENSUS-${isoDate(date)}-${depIndex+1}`,date:isoDate(date),department,totalPatients:census,patientDays:census,activeHAI:hai,patientsOnAntibiotics:onAntibiotics,[DEMO_FLAG]:true})
    })
  }
  return rows
}

function buildDDD(rng, now, count = 2600) {
  const drugs=[['J01DH02','Meropenem',1],['J01CR05','Piperacillin/Tazobactam',14],['J01DD04','Ceftriaxone',2],['J01MA02','Ciprofloxacin',1],['J01XA01','Vancomycin',2],['J01GB06','Amikacin',1],['J01XB01','Colistin',3]]
  return Array.from({length:count},(_,index)=>{
    const date=addDays(now,-numberBetween(rng,0,900));const [atc,drug,base]=pick(rng,drugs)
    // Mild year-to-year variation makes comparative charts meaningful without looking artificial.
    const ageDays=Math.max(0,(now.getTime()-date.getTime())/86400000)
    const trend=ageDays>700?.88:ageDays>335?.96:1.04
    return{id:`DEMO-DDD-${String(index+1).padStart(5,'0')}`,date:isoDate(date),department:pick(rng,departments),atc,drug,ddd:Number((base*decimalBetween(rng,.4,2.8,2)*trend).toFixed(2)),patientCode:rng()<.7?`D-PAT-${String(numberBetween(rng,1,220)).padStart(4,'0')}`:'',source:'Φαρμακείο Demo',[DEMO_FLAG]:true}
  })
}


function buildPrevalenceSnapshots(rng, now) {
  return Array.from({length:10},(_,index)=>{
    const monthsAgo=(9-index)*3
    const date=new Date(now.getFullYear(),now.getMonth()-monthsAgo,7)
    const totalPatients=numberBetween(rng,142,172)
    const seasonal=(date.getMonth()>=10||date.getMonth()<=1)?2:0
    const activeHAI=Math.max(5,numberBetween(rng,8,16)+seasonal-Math.floor(index/4))
    const patientsOnAntibiotics=numberBetween(rng,46,78)
    return{id:`DEMO-PPS-${index+1}`,date:isoDate(date),campaign:`PPS Demo ${date.getFullYear()} Q${Math.floor(date.getMonth()/3)+1}`,totalPatients,activeHAI,patientsOnAntibiotics,completed:true,[DEMO_FLAG]:true}
  })
}

function buildStructural(now) {
  return Array.from({length:30},(_,index)=>{const date=new Date(now.getFullYear(),now.getMonth()-29+index,1);return{id:`DEMO-STRUCT-${isoDate(date)}`,date:isoDate(date),totalBeds:176,icuBeds:12,singleRooms:index<12?16:18,nelNurses:index<10?2:3,infectiousDiseaseDoctors:1,microbiologists:3,notes:index===29?'Τρέχουσα demo αποτύπωση δομής.':'Ιστορική demo αποτύπωση.',[DEMO_FLAG]:true}})
}

function buildAntiseptics(rng, now, count=320){return Array.from({length:count},(_,i)=>{const date=addDays(now,-numberBetween(rng,0,900));const consumption=numberBetween(rng,5000,26000);const patientDays=numberBetween(rng,120,720);return{id:`DEMO-ANT-${i+1}`,date:greekDate(date),department:pick(rng,departments),product:pick(rng,['Αλκοολούχο διάλυμα 70%','Χλωρεξιδίνη 2%','Αλκοολούχο gel 500ml']),consumption:String(consumption),patientDays:String(patientDays),responsible:'ΝΕΛ Demo',notes:'Demo μέτρηση',[DEMO_FLAG]:true}})}
function buildWaste(rng, now, count=260){return Array.from({length:count},(_,i)=>{const date=addDays(now,-numberBetween(rng,0,900));return{id:`DEMO-WASTE-${i+1}`,date:greekDate(date),department:pick(rng,departments),wasteType:pick(rng,['ΕΑΑΜ','ΜΕΑ','Αστικά απόβλητα']),weightKg:String(decimalBetween(rng,4,58,1)),containers:String(numberBetween(rng,1,12)),patientDays:String(numberBetween(rng,80,480)),collectionCompany:'Demo Waste Services',documentNumber:`D-${1000+i}`,responsible:'Υπεύθυνος Demo',[DEMO_FLAG]:true}})}
function buildPromoted(rng, patients, now, count=300){return Array.from({length:count},(_,i)=>{const patient=pick(rng,patients);const date=addDays(now,-numberBetween(rng,0,900));return{id:`DEMO-ABX-${i+1}`,patientId:patient.id,patientName:patient.fullName,patientCode:patient.patientCode,department:patient.department,date:isoDate(date),antibiotic:pick(rng,promotedAntibiotics),dosage:pick(rng,['1 g','2 g','500 mg']),frequency:pick(rng,['ανά 8ωρο','ανά 12ωρο','ανά 24ωρο']),route:'IV',indication:pick(rng,['Σήψη','Πνευμονία','Βακτηριαιμία','Εμπειρική αγωγή']),approval:rng()<.78?'Εγκεκριμένο':rng()<.5?'Εκκρεμεί':'Απορρίφθηκε',doctor:'Λοιμωξιολόγος Demo',[DEMO_FLAG]:true}})}
function buildNotifiable(rng, patients, now, count=90){const diseases=['Σαλμονέλλωση','Λεγιονέλλωση / Πυρετός Pontiac','Γρίπη εργαστηριακά επιβεβαιωμένη','Μηνιγγίτιδα','Ηπατίτιδα Α, οξεία','Λοίμωξη από ιό Δυτικού Νείλου'];return Array.from({length:count},(_,i)=>{const patient=pick(rng,patients);const date=addDays(now,-numberBetween(rng,0,900));const declared=rng()<.82;return{id:`DEMO-YDN-${i+1}`,disease:pick(rng,diseases),deadline:'24ωρο',patientId:patient.id,patientName:patient.fullName,patientCode:patient.patientCode,department:patient.department,diagnosisDate:isoDate(date),declarationDate:declared?isoDate(addDays(date,numberBetween(rng,0,1))):'',status:declared?'Δηλώθηκε':'Προς δήλωση',caseClassification:pick(rng,['Επιβεβαιωμένο','Πιθανό']),physician:'Ιατρός Demo',notes:'Demo δήλωση',attachments:[],history:[],[DEMO_FLAG]:true}})}

function buildControls(rng, now) {
  const programs=Array.from({length:24},(_,i)=>{const category=i%3===0?'Νερό':'Περιβάλλον';return{id:`DEMO-CTRL-${i+1}`,title:category==='Νερό'?`Έλεγχος νερού ${i+1}`:`Περιβαλλοντικός έλεγχος ${i+1}`,category,controlType:category==='Νερό'?pick(rng,['Legionella','Μικροβιολογικός έλεγχος','Νερό ΜΤΝ']):pick(rng,['Επιφάνειες','Αέρας','HVAC']),department:pick(rng,departments),location:category==='Νερό'?'Δίκτυο νερού':'Κλινικός χώρος',controlPoints:[`Σημείο ${i+1}A`,`Σημείο ${i+1}B`],owner:'ΝΕΛ',startDate:isoDate(addDays(now,-900)),recurrence:'months',interval:pick(rng,[1,3,6]),reminderDays:10,nextDueDate:isoDate(addDays(now,numberBetween(rng,-10,45))),active:true,[DEMO_FLAG]:true}})
  const executions=Array.from({length:220},(_,i)=>{const program=pick(rng,programs);const date=addDays(now,-numberBetween(rng,1,900));return{id:`DEMO-EXEC-${i+1}`,programId:program.id,category:program.category,dueDate:isoDate(date),performedDate:isoDate(date),department:program.department,location:program.location,owner:'ΝΕΛ',status:'Ολοκληρωμένο',items:program.controlPoints.map((point,j)=>({samplingPoint:point,sampleCode:`D-SMP-${i+1}-${j+1}`,resultStatus:rng()<.12?'Θετικό':'Αρνητικό',microorganism:rng()<.12?pick(rng,pathogens):'',acceptable:rng()<.12?'Μη αποδεκτό':'Αποδεκτό'})),[DEMO_FLAG]:true}})
  return {programs,executions}
}


function buildDemoQuality(rng, now) {
  const categories=['Ταυτοποίηση ασθενή','Επικοινωνία / παράδοση φροντίδας','Φαρμακευτική αγωγή','Πτώση ασθενή','Ιατροτεχνολογικός εξοπλισμός','Λοίμωξη / πρόληψη λοιμώξεων','Καθυστέρηση φροντίδας','Ασφάλεια εγκαταστάσεων']
  const outcomes=['Χωρίς βλάβη / near miss','Χωρίς βλάβη','Ήπια βλάβη','Μέτρια βλάβη','Σοβαρή βλάβη']
  const statuses=['Νέα αναφορά','Υπό διερεύνηση','Σε παρακολούθηση','Ολοκληρωμένο']
  const incidents=Array.from({length:180},(_,i)=>{
    const date=addDays(now,-numberBetween(rng,0,900));const category=pick(rng,categories);const department=pick(rng,departments)
    return{id:i===0?'DEMO-INC-001':`DEMO-INC-${String(i+1).padStart(4,'0')}`,date:isoDate(date),title:`Demo συμβάν · ${category}`,category,department,outcome:pick(rng,outcomes),status:pick(rng,statuses),owner:`Ομάδα Ποιότητας · ${department}`,description:'Demo συμβάν για επίδειξη συγκριτικών αναλύσεων και ροής ποιότητας.',[DEMO_FLAG]:true}
  })
  const capa=incidents.filter((_,i)=>i%3===0).slice(0,60).map((incident,i)=>({id:`DEMO-CAPA-${String(i+1).padStart(3,'0')}`,title:`Βελτιωτική ενέργεια · ${incident.category}`,source:incident.id,sourceType:'Συμβάν',actionType:i%2?'Προληπτική':'Διορθωτική',owner:'Ομάδα Ποιότητας Demo',department:incident.department,dueDate:isoDate(addDays(new Date(`${incident.date}T12:00:00`),30)),priority:pick(rng,['Χαμηλή','Μέτρια','Υψηλή']),progress:numberBetween(rng,20,100),status:pick(rng,['Σε εξέλιξη','Ολοκληρωμένη','Σε παρακολούθηση']),plannedAction:'Demo βελτιωτική ενέργεια.',effectivenessStatus:pick(rng,['Εκκρεμεί','Αποτελεσματική','Υπό επανέλεγχο']),[DEMO_FLAG]:true}))
  const audits=Array.from({length:48},(_,i)=>{const date=addDays(now,-numberBetween(rng,0,900));return{id:`DEMO-AUD-${String(i+1).padStart(3,'0')}`,title:pick(rng,['Audit Υγιεινής Χεριών','Audit απομόνωσης','Audit φαρμακευτικής ασφάλειας','Audit ταυτοποίησης ασθενή']),department:pick(rng,departments),date:isoDate(date),score:numberBetween(rng,72,98),status:'Ολοκληρωμένο',[DEMO_FLAG]:true}})
  return {incidents,capa,audits}
}

function buildDemoOrganization(now) {
  const today=isoDate(now)
  const nextWeek=isoDate(addDays(now,7))
  const nextTwoWeeks=isoDate(addDays(now,14))
  return {
    training:[
      {id:'DEMO-TR-1',title:'Υγιεινή Χεριών – WHO',category:'Κλινική εκπαίδευση',department:'ΜΕΘ',trainer:'Επιτροπή Λοιμώξεων Demo',date:nextWeek,status:'Προγραμματισμένη',durationHours:2,validUntil:'',attendance:[],attachments:[],notes:'',[DEMO_FLAG]:true},
      {id:'DEMO-TR-2',title:'Διαχείριση αιχμηρών αντικειμένων',category:'Ασφάλεια',department:'Χειρουργείο',trainer:'Νοσηλευτική Διεύθυνση Demo',date:today,status:'Ολοκληρωμένη',durationHours:1,validUntil:'',attendance:[],attachments:[],notes:'',[DEMO_FLAG]:true},
    ],
    committees:[
      {id:'DEMO-CM-1',name:'Επιτροπή Νοσοκομειακών Λοιμώξεων',type:'Επιτροπή',chair:'Πρόεδρος ΕΝΛ Demo',secretary:'',lastMeeting:today,nextMeeting:nextWeek,status:'Ενεργή',frequency:'Μηνιαία',memberIds:[],members:[],agenda:[],meetings:[],attachments:[],purpose:'Demo',[DEMO_FLAG]:true},
      {id:'DEMO-CM-2',name:'ΟΕΚΟΧΑ',type:'Ομάδα εργασίας',chair:'Υπεύθυνος ΟΕΚΟΧΑ Demo',secretary:'',lastMeeting:today,nextMeeting:nextTwoWeeks,status:'Ενεργή',frequency:'Τριμηνιαία',memberIds:[],members:[],agenda:[],meetings:[],attachments:[],purpose:'Demo',[DEMO_FLAG]:true},
    ],
    documents:[
      {id:'DEMO-DOC-1',title:'Πολιτική Υγιεινής Χεριών',code:'DEMO-Π.ΛΟΙΜ.001',category:'Πολιτική',version:'5.0',owner:'Επιτροπή Λοιμώξεων Demo',status:'Προς αναθεώρηση',reviewDate:nextTwoWeeks,updatedAt:today,attachments:[],[DEMO_FLAG]:true},
      {id:'DEMO-DOC-2',title:'Διαχείριση έκθεσης σε βιολογικό παράγοντα',code:'DEMO-Δ.ΑΣΦ.014',category:'Διαδικασία',version:'3.0',owner:'Νοσηλευτική Διεύθυνση Demo',status:'Προς αναθεώρηση',reviewDate:nextWeek,updatedAt:today,attachments:[],[DEMO_FLAG]:true},
    ],
  }
}

export function generateDemoDataset() {
  const rng=seededRandom(); const now=new Date(); now.setHours(12,0,0,0)
  const patients=buildPatients(rng,now); const employees=buildEmployees(rng); const sessions=buildHandHygiene(rng,now)
  const vaccinations=buildVaccinations(rng,employees,now); const samples=buildSamples(rng,patients,now); const clinicalFlow=buildSurveillanceCases(rng,patients,samples,now); const allSamples=[...samples,...clinicalFlow.extraSamples]; const isolations=buildIsolations(rng,patients,allSamples); const infections=buildInfections(rng,patients,allSamples)
  const census=buildDailyCensus(rng,now); const ddd=buildDDD(rng,now); const prevalence=buildPrevalenceSnapshots(rng,now); const structural=buildStructural(now); const controls=buildControls(rng,now)
  const antiseptics=buildAntiseptics(rng,now); const waste=buildWaste(rng,now); const promoted=buildPromoted(rng,patients,now); const notifiable=buildNotifiable(rng,patients,now)
  const quality=buildDemoQuality(rng,now); const organization=buildDemoOrganization(now)

  const vaccinationMap = new Map(vaccinations.map((row) => [row.employeeId, row]))
  const employeesWithVaccinations = employees.map((employee) => { const vaccination = vaccinationMap.get(employee.id); return vaccination ? { ...employee, vaccinations: [{ id: `vac-${vaccination.id}`, sourceId: vaccination.id, vaccine: vaccination.vaccine, date: vaccination.date, dose: vaccination.dose, validUntil: vaccination.validUntil }] } : employee })
  savePatientRegistry(mergeDemo(loadPatientRegistry(),patients))
  saveEmployees(mergeDemo(loadAllEmployees(),employeesWithVaccinations))
  saveHandHygieneSessions(mergeDemo(loadHandHygieneSessions(),sessions))
  saveStaffVaccinations(mergeDemo(loadStaffVaccinations(),vaccinations))
  savePatientSamples(mergeDemo(loadPatientSamples(),allSamples))
  replaceSurveillanceCases(mergeDemo(loadSurveillanceCases(),clinicalFlow.cases))
  saveIsolations(mergeDemo(loadIsolations(),isolations))
  saveInfections(mergeDemo(loadInfections(),infections))
  saveDailyCensus(mergeDemo(loadDailyCensus(),census))
  saveAntibioticDDD(mergeDemo(loadAntibioticDDD(),ddd))
  saveStructuralSnapshots(mergeDemo(loadStructuralSnapshots(),structural))
  savePrevalenceSnapshots(mergeDemo(loadPrevalenceSnapshots(),prevalence))
  saveAntisepticConsumption(mergeDemo(loadAntisepticConsumption(),antiseptics))
  saveWasteMeasurements(mergeDemo(loadWasteMeasurements(),waste))
  savePromotedAntibiotics(mergeDemo(loadPromotedAntibiotics(),promoted))
  saveNotifiableDiseases(mergeDemo(loadNotifiableDiseases(),notifiable))
  saveControlPrograms(mergeDemo(loadControlPrograms(),controls.programs))
  saveControlExecutions(mergeDemo(loadControlExecutions(),controls.executions))
  saveIncidents(mergeDemo(loadIncidents(),quality.incidents))
  saveCapa(mergeDemo(loadCapa(),quality.capa))
  saveAuditExecutions(mergeDemo(loadAuditExecutions(),quality.audits))
  replaceTrainingCollection(mergeDemo(loadTraining(),organization.training))
  replaceCommitteesCollection(mergeDemo(loadCommittees(),organization.committees))
  replaceDocumentsCollection(mergeDemo(loadDocuments(),organization.documents))

  const summary={patients:patients.length,employees:employees.length,handHygieneSessions:sessions.length,handHygieneObservations:sessions.reduce((sum,row)=>sum+row.observations.length,0),vaccinations:vaccinations.length,patientSamples:allSamples.length,surveillanceCases:clinicalFlow.cases.length,isolations:isolations.length,infections:infections.length,dailyCensus:census.length,antibioticDDD:ddd.length,prevalenceSnapshots:prevalence.length,structural:structural.length,controls:controls.executions.length,incidents:quality.incidents.length,capa:quality.capa.length,audits:quality.audits.length,other:antiseptics.length+waste.length+promoted.length+notifiable.length,total:0}
  summary.total=Object.entries(summary).filter(([key])=>key!=='total').reduce((sum,[,value])=>sum+value,0)
  writeJson('limoxisDemoDatasetSummary',{...summary,generatedAt:new Date().toISOString()})
  emitAppEvent(DEMO_DATA_EVENT,summary)
  return summary
}

export function clearDemoDataset() {
  savePatientRegistry(withoutDemo(loadPatientRegistry()))
  saveEmployees(withoutDemo(loadAllEmployees()))
  saveHandHygieneSessions(withoutDemo(loadHandHygieneSessions()))
  saveStaffVaccinations(withoutDemo(loadStaffVaccinations()))
  savePatientSamples(withoutDemo(loadPatientSamples()))
  replaceSurveillanceCases(withoutDemo(loadSurveillanceCases()))
  saveIsolations(withoutDemo(loadIsolations()))
  saveInfections(withoutDemo(loadInfections()))
  saveDailyCensus(withoutDemo(loadDailyCensus()))
  saveAntibioticDDD(withoutDemo(loadAntibioticDDD()))
  saveStructuralSnapshots(withoutDemo(loadStructuralSnapshots()))
  savePrevalenceSnapshots(withoutDemo(loadPrevalenceSnapshots()))
  saveAntisepticConsumption(withoutDemo(loadAntisepticConsumption()))
  saveWasteMeasurements(withoutDemo(loadWasteMeasurements()))
  savePromotedAntibiotics(withoutDemo(loadPromotedAntibiotics()))
  saveNotifiableDiseases(withoutDemo(loadNotifiableDiseases()))
  saveControlPrograms(withoutDemo(loadControlPrograms()))
  saveControlExecutions(withoutDemo(loadControlExecutions()))
  saveIncidents(withoutDemo(loadIncidents()))
  saveCapa(withoutDemo(loadCapa()))
  saveAuditExecutions(withoutDemo(loadAuditExecutions()))
  replaceTrainingCollection(withoutDemo(loadTraining()))
  replaceCommitteesCollection(withoutDemo(loadCommittees()))
  replaceDocumentsCollection(withoutDemo(loadDocuments()))
  removeStoredValue('limoxisDemoDatasetSummary')
  emitAppEvent(DEMO_DATA_EVENT,null)
}

export function loadDemoDatasetSummary() {
  return readJson('limoxisDemoDatasetSummary', null)
}
