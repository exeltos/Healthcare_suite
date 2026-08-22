import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8')
const exists=(p)=>fs.existsSync(path.join(root,p))
const findings=[]

const login=read('src/pages/Login/LoginPage.jsx')
const auth=read('src/services/auth/authService.js')
const appLayout=read('src/components/layout/AppLayout.jsx')

const supabaseAuthFoundation=
  /signInWithPassword/.test(auth) &&
  /getUser/.test(auth) &&
  /requireSupabase/.test(auth) &&
  /validateProductionSession/.test(appLayout)

if(!supabaseAuthFoundation){
  findings.push(['BLOCKER','Production authentication is not connected to a verifiable backend session.'])
}

if(process.env.VITE_APP_MODE==='production'){
  if(process.env.VITE_AUTH_PROVIDER!=='supabase') findings.push(['BLOCKER','Production VITE_AUTH_PROVIDER must be "supabase".'])
  if(!process.env.VITE_SUPABASE_URL) findings.push(['BLOCKER','VITE_SUPABASE_URL is missing.'])
  if(!process.env.VITE_SUPABASE_PUBLISHABLE_KEY && !process.env.VITE_SUPABASE_ANON_KEY) findings.push(['BLOCKER','Supabase publishable key is missing.'])
}

if(!exists('supabase/migrations/20260813_000001_core_identity_rls_storage.sql')){
  findings.push(['BLOCKER','Supabase core identity/RLS migration is missing.'])
}

const storage=read('src/core/storage/jsonStorage.js')
const patientPage=read('src/pages/Patients/PatientsPage.jsx')
const patientWorkflow=read('src/pages/Patients/PatientWorkflowPage.jsx')
const laboratoryPage=read('src/pages/Laboratory/LaboratoryPage.jsx')
const clinicalBackend=exists('src/services/backend/clinicalDirectoryService.js')?read('src/services/backend/clinicalDirectoryService.js'):''

const clinicalCoreMigrated=
  /loadClinicalPatients/.test(patientPage) &&
  /loadClinicalSurveillanceCases/.test(patientWorkflow) &&
  /loadAllLaboratoryRecordsAsync/.test(laboratoryPage) &&
  /from\('patients'\)/.test(clinicalBackend) &&
  /from\('surveillance_cases'\)/.test(clinicalBackend) &&
  /from\('patient_samples'\)/.test(clinicalBackend) &&
  /from\('infections'\)/.test(clinicalBackend)

if(!clinicalCoreMigrated){
  findings.push(['BLOCKER','Patients, surveillance cases, patient laboratory samples and infections are not fully connected to Supabase.'])
}

const operationalBackend=exists('src/services/backend/organizationBackendService.js')?read('src/services/backend/organizationBackendService.js'):''
const indicatorBackend=exists('src/services/backend/indicatorBackendService.js')?read('src/services/backend/indicatorBackendService.js'):''
const qualityBackend=exists('src/services/backend/qualityBackendService.js')?read('src/services/backend/qualityBackendService.js'):''

const operationalCoreMigrated=
  /from\('training_records'\)/.test(operationalBackend) &&
  /from\('committees'\)/.test(operationalBackend) &&
  /from\('controlled_documents'\)/.test(operationalBackend) &&
  /from\('indicator_settings'\)/.test(indicatorBackend) &&
  /from\('indicator_source_records'\)/.test(indicatorBackend) &&
  /from\('quality_incidents'\)/.test(qualityBackend) &&
  /from\('quality_capa'\)/.test(qualityBackend) &&
  /from\('quality_audits'\)/.test(qualityBackend)

if(!operationalCoreMigrated){
  findings.push(['BLOCKER','Quality, Indicators, Training, Committees and Documents are not fully connected to Supabase.'])
}

const preventionBackend=exists('src/services/backend/preventionBackendService.js')?read('src/services/backend/preventionBackendService.js'):''
const configurationBackend=exists('src/services/backend/configurationBackendService.js')?read('src/services/backend/configurationBackendService.js'):''

const preventionConfigurationMigrated=
  /from\('prevention_records'\)/.test(preventionBackend) &&
  /from\('form_templates'\)/.test(configurationBackend) &&
  /from\('form_responses'\)/.test(configurationBackend) &&
  /from\('studio_configuration'\)/.test(configurationBackend) &&
  /from\('master_data_libraries'\)/.test(configurationBackend)

if(!preventionConfigurationMigrated){
  findings.push(['BLOCKER','Prevention, Forms, Studio configuration and master-data do not all have Production Supabase boundaries.'])
}

const productionStorageGuard=
  /IS_PRODUCTION/.test(storage) &&
  /PRODUCTION_PREFERENCE_KEYS/.test(storage) &&
  /Production operational write blocked/.test(storage) &&
  /withProductionCacheWrite/.test(storage) &&
  /export function writeJsonCache/.test(storage)

if(!productionStorageGuard){
  findings.push(['BLOCKER','Production browser-storage guard is missing. Operational writes must fail closed instead of silently persisting only in the browser.'])
}

const userAccess=read('src/pages/Studio/UserAccessPage.jsx')
const directoryService=read('src/services/backend/directoryService.js')
if(!/saveDirectoryUserAccount/.test(userAccess) || !/admin-user-account/.test(directoryService)){
  findings.push(['HIGH','Studio user administration is not yet wired to the server-side Supabase user-account function.'])
}

const app=read('src/App.jsx')
if(/APP_ROUTES\.LIRA[\s\S]{0,160}PlaceholderPage/.test(app)){
  findings.push(['HIGH','LIRA AI route is still a placeholder.'])
}

const patientService=read('src/services/patientService.js')
if(/patientsMock/.test(patientService) && !/loadClinicalPatients/.test(patientPage)){
  findings.push(['MEDIUM','Patient service still contains demo/mock source support without a production repository boundary.'])
}


const productionWriteAuditTargets=[
 ['Bundles form responses','src/pages/Prevention/BundlesPage.jsx',/\bupsertFormResponse\s*\(|\bdeleteFormResponse\s*\(/],
 ['Prevention audits','src/pages/Prevention/PreventionAuditsPage.jsx',/upsertPreventionAudit|deletePreventionAudit/],
 ['Surveillance controls','src/pages/Surveillance/SurveillanceControlsPage.jsx',/\bupsertControlProgram\s*\(|\bdeleteControlProgram\s*\(|\bcompleteProgram\s*\(/],
 ['Role permissions','src/pages/Studio/RolePermissionsPage.jsx',/\bsaveRoleConfig\s*\(/],
 ['LibraryField master-data writes','src/components/core/LibraryField/LibraryField.jsx',/\bupsertMasterItem\s*\(/],
]
for(const [label,file,pattern] of productionWriteAuditTargets){
 if(exists(file)&&pattern.test(read(file)))findings.push(['BLOCKER',`${label} still contains a direct browser-local Production write path.`])
}


const productionLocalWriteGuards=[
 ['Patient workflow','src/pages/Patients/PatientWorkflowPage.jsx',/\b(deletePatientSample|deleteInfection|deleteIsolation|upsertIsolation|deleteSurveillanceCase|upsertSurveillanceCase|saveNotifiableDiseases|addPatientAttachment|deletePatientAttachment)\s*\(/],
 ['Employee bulk actions','src/pages/Employees/EmployeesPage.jsx',/\b(upsertStaffVaccination|upsertTraining)\s*\(/],
]
for(const [label,file,pattern] of productionLocalWriteGuards){
 if(exists(file)&&pattern.test(read(file)))findings.push(['BLOCKER',`${label} still contains a browser-local mutating call that can bypass the Production backend boundary.`])
}

console.log('Healthcare Suite deployment readiness')
console.log('====================================')
if(!findings.length) console.log('No deployment-readiness findings.')
for(const [level,text] of findings) console.log(`${level}: ${text}`)
const blockers=findings.filter(([level])=>level==='BLOCKER').length
console.log(`\n${findings.length} finding(s), ${blockers} blocker(s).`)
if(blockers) process.exitCode=2
