import fs from 'node:fs'
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const entry=read('src/components/forms/EntryFormChrome/EntryFormChrome.jsx')
const patients=read('src/pages/Patients/PatientHomeSections.jsx')
const sample=read('src/pages/PatientSamples/PatientSamplesPage.jsx')
const employees=read('src/pages/Employees/EmployeeWorkspaceSections.jsx')
const designer=read('src/pages/Forms/FormDesignerPage.jsx')
const bundles=read('src/pages/Prevention/BundlesPage.jsx')
const launcher=read('src/components/launcher/NewEntryLauncher.jsx')
const summary=read('src/components/launcher/NewEntryLauncher.parts.jsx')

const checks=[
 ['Entry forms show explicit Cancel action',entry.includes("L('Ακύρωση','Cancel')")&&entry.includes('entry-form-header__cancel')],
 ['Patient registry edit uses Cancel + Save',patients.includes('variant="secondary" size="sm" icon={<X')&&patients.includes('L("Αποθήκευση", "Save")')],
 ['Patient sample editor uses common FormActions',sample.includes('<FormActions')&&sample.includes('onCancel={closeDrawer}')&&sample.includes('destructive={selectedRecord')],
 ['Employee profile edit uses common FormActions',employees.includes('<FormActions')&&employees.includes('onCancel={onCancel}')&&employees.includes('onPrimary={onSave}')],
 ['Form Designer editor has one footer action pair',designer.includes("L('Ακύρωση','Cancel')")&&designer.includes("L('Αποθήκευση φόρμας','Save form')")&&!designer.includes("setDraft(null)}><X/>")],
 ['Bundle execution uses common FormActions',bundles.includes("FormActions onCancel={() => { setExecution(null); setSelectedTemplate(null) }")],
 ['WHO Save accepts complete visible draft opportunity',launcher.includes('effectiveWhoObservations')&&launcher.includes('draftWhoReady')],
 ['WHO summary includes visible draft opportunity',summary.includes('previewObservations')&&summary.includes('draftObservation')],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`\nForm action / WHO consistency: ${checks.length-failed}/${checks.length} passed`)
if(failed)process.exit(1)
