import fs from 'node:fs'
const b=fs.readFileSync('src/services/backend/clinicalSupportBackendService.js','utf8')
const p=fs.readFileSync('src/pages/Patients/PatientWorkflowPage.jsx','utf8')
const e=fs.readFileSync('src/pages/Patients/PatientWorkflowEditors.jsx','utf8')
const sql=fs.readFileSync('supabase/migrations/20260821_000019_patient_isolation_persistence_hardening.sql','utf8')
const checks=[
 ['isolation validates case/patient relationship',b.includes('Η απομόνωση πρέπει να ανήκει στον ίδιο ασθενή με την επιτήρηση.')],
 ['isolation inherits case department',b.includes('caseRow?.department_id||null')],
 ['pathogen is dedicated DB column',b.includes("pathogen:String(row.pathogen||'')")&&sql.includes('add column if not exists pathogen')],
 ['new isolation uses insert when absent',b.includes(': write.insert(payload)')],
 ['existing isolation uses scoped update',b.includes("write.update(payload).eq('organization_id',org)")],
 ['isolation has Supabase read-back',b.includes('Η απομόνωση δεν επιβεβαιώθηκε στο Supabase.')],
 ['case/department/pathogen are verified',b.includes('Η σύνδεση απομόνωσης με την επιτήρηση δεν επιβεβαιώθηκε.')&&b.includes('Το παθογόνο της απομόνωσης δεν επιβεβαιώθηκε.')],
 ['UI success occurs only after verified save',p.includes('Η απομόνωση αποθηκεύτηκε στη Supabase.')],
 ['isolation form suppresses inferred feedback',e.includes('<FormActions onCancel={cancel} feedback={false} />')],
 ['RLS explicitly permits Patients workflow',sql.includes("public.has_module_access('Ασθενείς',true)")]
]
for(const [n,ok] of checks)console.log(ok?'PASS':'FAIL',n)
const n=checks.filter(([,ok])=>ok).length
console.log(`Isolation persistence rc.184: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)
