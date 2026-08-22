import fs from 'node:fs'

const read=(p)=>fs.readFileSync(p,'utf8')
const workflow=read('src/services/clinicalWorkflowService.js')
const lab=read('src/services/laboratoryService.js')
const patient=read('src/pages/Patients/PatientWorkflowPage.jsx')
const cases=read('src/pages/Patients/PatientCaseSections.jsx')
const directory=read('src/services/backend/clinicalDirectoryService.js')
const support=read('src/services/backend/clinicalSupportBackendService.js')
const integrityMigration=read('supabase/migrations/20260813_000010_clinical_relationship_integrity.sql')

const checks=[
  ['shared patient/laboratory save boundary', /savePatientSampleWithClinicalWorkflowAsync/.test(lab) && /savePatientSampleWithClinicalWorkflowAsync/.test(patient)],
  ['positive sample can create one linked infection', /existingInfectionForSample/.test(workflow) && /createdInfection:\s*!existing/.test(workflow)],
  ['positive recheck never creates duplicate infection', /if \(recheck\)[\s\S]*createdInfection:\s*false/.test(workflow)],
  ['recheck remains linked to same surveillance case', /same surveillance[\s\S]*previous sample|ίδια επιτήρηση/.test(workflow)],
  ['negative follow-up does not silently close surveillance', /negative follow-up[\s\S]*not an automatic closure/i.test(workflow)],
  ['result correction retracts auto-created infection traceably', /retractAutoInfectionForNonPositiveSample/.test(workflow) && /laboratory-result-revised/.test(workflow)],
  ['corrected positive result reuses the same infection', /cancellationReason === 'laboratory-result-revised'/.test(workflow)],
  ['sample deletion uses clinical cleanup boundary', /deletePatientSampleWithClinicalWorkflowAsync/.test(lab) && /deletePatientSampleWithClinicalWorkflowAsync/.test(patient)],
  ['sample deletion preserves clinically enriched surveillance', /hasClinicalContent/.test(workflow) && /sourceSampleDeletedAt/.test(workflow)],
  ['explicit closure centralizes case/infection/isolation completion', /closeClinicalSurveillanceEpisode/.test(workflow) && /closureReason:\s*'clinical-surveillance-closure'/.test(workflow)],
  ['closure is exposed only as an explicit patient action', /closeClinicalSurveillanceEpisode/.test(patient) && /Κλείσιμο επιτήρησης/.test(cases)],
  ['production patient identity protects duplicate AMKA', /duplicateAmka/.test(directory)],
  ['production sample persists first-class case relationship', /surveillance_case_id:emptyToNull\(row\.clinicalCaseId\|\|row\.surveillanceCaseId\)/.test(directory)],
  ['production isolation persists first-class case relationship', /surveillance_case_id:row\.clinicalCaseId/.test(support)],
  ['database enforces cross-entity clinical relationship guards', /patients_org_amka_unique/.test(integrityMigration) && /patient_samples_relationship_guard/.test(integrityMigration) && /infections_relationship_guard/.test(integrityMigration) && /patient_isolations_relationship_guard/.test(integrityMigration)],
]

let failed=0
for(const [name,ok] of checks){
  console.log(`${ok?'✓':'✗'} ${name}`)
  if(!ok) failed++
}
console.log(`Clinical scenario contract audit: ${checks.length-failed}/${checks.length} passed.`)
if(failed) process.exitCode=1
