import fs from 'node:fs'
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const app=read('src/components/layout/AppLayout.jsx')
const hydration=read('src/services/backend/productionHydrationService.js')
const newEntry=read('src/services/newEntryService.js')
const antimicrobial=read('src/pages/Surveillance/AntimicrobialConsumptionPage.jsx')
const patientSamples=read('src/pages/PatientSamples/PatientSamplesPage.jsx')
const prevention=read('src/services/preventionService.js')
const caseSections=read('src/pages/Patients/PatientCaseSections.jsx')
const patientWorkflow=read('src/pages/Patients/PatientWorkflowPage.jsx')
const configBackend=read('src/services/backend/configurationBackendService.js')
const settings=read('src/pages/SettingsPage.jsx')
const clinicalSupport=read('src/services/backend/clinicalSupportBackendService.js')
const checks=[
 ['Production shell hydrates operational mirrors after auth',app.includes('hydrateProductionOperationalMirrors')&&app.includes("dataState==='loading'")],
 ['Hydration covers clinical core',hydration.includes('loadClinicalPatients')&&hydration.includes('loadClinicalPatientSamples')&&hydration.includes('loadClinicalInfections')],
 ['Hydration covers source lab / isolation',hydration.includes('loadClinicalSourceSamples')&&hydration.includes('loadClinicalIsolations')],
 ['Hydration covers prevention/quality/organization',hydration.includes('PREVENTION_TYPES')&&hydration.includes('loadQualityRisks')&&hydration.includes('loadOperationalDocuments')],
 ['Hydration covers indicators and surveillance controls',hydration.includes('hydrateIndicatorBackend')&&hydration.includes('loadSurveillanceControlPrograms')],
 ['Generic New Entry patient writes through clinical backend',newEntry.includes('await saveClinicalPatient(')&&newEntry.includes('await saveClinicalSurveillanceCase(')],
 ['Generic New Entry infection/sample writes through clinical backend',newEntry.includes('await saveClinicalInfection(')&&newEntry.includes('await saveClinicalPatientSample(')],
 ['Generic New Entry staff/environment/water writes through source backend',(newEntry.match(/await saveClinicalSourceSample\(/g)||[]).length>=3],
 ['WHO New Entry writes through prevention backend',newEntry.includes("await savePreventionRecord('hand_hygiene'")],
 ['Antimicrobial DDD writes through indicator Supabase backend',antimicrobial.includes("await saveIndicatorSourceBackend('antibiotic_ddd',next)")],
 ['Antimicrobial page hydrates Supabase source data',antimicrobial.includes('hydrateIndicatorBackend().then')],
 ['Legacy Patient Samples writes through clinical backend',patientSamples.includes('await saveClinicalPatientSample(nextRecord)')&&patientSamples.includes('await deleteClinicalPatientSample(recordId)')],
 ['Promoted therapy has production-aware async sync',prevention.includes('syncPromotedTherapyAsync')&&prevention.includes("savePreventionRecord('promoted_antibiotic',local)")],
 ['Patient therapy UI awaits promoted sync',caseSections.includes('await syncPromotedTherapyAsync')&&caseSections.includes('await deletePromotedAntibioticAsync')],
 ['Patient cascade delete uses correct promoted therapy id',patientWorkflow.includes('promotedRecordIdForTherapy(therapy.id)')],
 ['Patient source config persists in Supabase library',configBackend.includes("library_key:'patient-source-config'")&&configBackend.includes('savePatientSourceConfigBackend')],
 ['Settings uses Supabase patient-source config backend',settings.includes('savePatientSourceConfigBackend')&&settings.includes('hydratePatientSourceConfigBackend')],
 ['Source laboratory rows mirror into analytics caches',clinicalSupport.includes('saveStaffSamples(staff)')&&clinicalSupport.includes('saveEnvironmentalSamples(environment)')&&clinicalSupport.includes('saveWaterRecords(water)')],
 ['Isolation rows mirror into analytics caches',clinicalSupport.includes('for(const item of rows)upsertIsolation(item)')],
 ['Notifiable disease rows mirror after Supabase load',clinicalSupport.includes('saveNotifiableDiseases(rows)')],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`\nProduction persistence rc.103: ${checks.length-failed}/${checks.length} passed`)
if(failed)process.exit(1)
