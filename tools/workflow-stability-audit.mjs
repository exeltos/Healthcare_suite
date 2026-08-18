import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8')
const failures = []
const expect = (condition, message) => { if (!condition) failures.push(message) }

const clinical = read('src/services/clinicalWorkflowService.js')
const surveillance = read('src/services/surveillanceCasesService.js')
const patientWorkspace = read('src/pages/Patients/PatientWorkflowPage.jsx')
const patientHome = read('src/pages/Patients/PatientHomeSections.jsx')
const table = read('src/components/core/DataTable/DataTable.jsx')
const drawer = read('src/components/core/Drawer/Drawer.jsx')
const feedback = read('src/components/core/AppFeedbackBridge/AppFeedbackBridge.jsx')
const emptyState = read('src/components/core/EmptyState/EmptyState.jsx')
const attachments = read('src/components/core/AttachmentManager/AttachmentManager.jsx')

expect(clinical.includes("sample.status === 'Θετικό'") && clinical.includes("sample.status === 'Αρνητικό'"), 'Clinical workflow must explicitly handle positive and negative laboratory outcomes.')
expect(clinical.includes('isPatientSampleRecheck') && clinical.includes('parentSampleId'), 'Rechecks must remain explicitly linked to a previous sample.')
expect(surveillance.includes("reason: 'negative-recheck'") && surveillance.includes('SURVEILLANCE_CASE_STATUS.CLOSED'), 'A negative recheck must close the surveillance case.')
expect(surveillance.includes('reconcile') || surveillance.includes('reconc'), 'Surveillance service must retain reconciliation logic for persisted/legacy case state.')
expect(patientWorkspace.includes('Πίσω στα δείγματα ασθενούς') && patientWorkspace.includes("patientTab: 'samples'"), 'Opening a laboratory sample from a patient must preserve the return context to the patient samples tab.')
expect(patientHome.includes('highlightedSampleId') && patientHome.includes('is-return-highlight'), 'Patient sample return highlighting must remain enabled.')
expect(table.includes('rememberLastOpenedRow') && table.includes('is-highlighted'), 'Shared DataTable must remember and highlight the last opened row.')
expect(drawer.includes('onCloseRef') && drawer.includes('closeOnEscapeRef') && /\}, \[open\]\)/.test(drawer), 'Drawer focus stability regression: focus-trap effect must depend only on open state.')
expect(feedback.includes('MUTATION_EVENTS') && feedback.includes('data-feedback-action'), 'Global save/delete feedback bridge must remain connected to mutation events and explicit action intents.')
expect(emptyState.includes('description ?? text'), 'Core EmptyState must retain legacy text compatibility.')
expect(attachments.includes('aria-busy') && attachments.includes('role="progressbar"'), 'Attachment uploads must expose busy/progress feedback.')

if (failures.length) {
  console.error('Workflow stability audit failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}
console.log('Workflow stability audit passed: clinical lifecycle, return context, list memory, drawer focus, feedback, empty states and upload progress are protected.')
