import { APP_EVENTS, emitAppEvent } from '../core/events'
import { formsRepository } from '../repositories/formsRepository'

export const FORM_TEMPLATES_EVENT = APP_EVENTS.FORM_TEMPLATES_UPDATED

const seedTemplates = [
  {
    id: 'TPL-CLABSI',
    name: 'CLABSI – Κεντρικός φλεβικός καθετήρας',
    type: 'bundle',
    category: 'Πρόληψη λοιμώξεων',
    description: 'Checklist εισαγωγής και φροντίδας κεντρικού φλεβικού καθετήρα.',
    status: 'active',
    appliesTo: [{ module: 'bundles', context: 'CLABSI' }],
    scoring: { enabled: true, positiveValue: 1, negativeValue: 0, excludeNA: true },
    questions: [
      { id: 'q1', label: 'Υγιεινή χεριών πριν τον χειρισμό', type: 'yes-no-na', required: true, scored: true },
      { id: 'q2', label: 'Αντισηψία δέρματος με κατάλληλο αντισηπτικό', type: 'yes-no-na', required: true, scored: true },
      { id: 'q3', label: 'Μέγιστος φραγμός κατά την εισαγωγή', type: 'yes-no-na', required: true, scored: true },
      { id: 'q4', label: 'Καθημερινή αξιολόγηση αναγκαιότητας καθετήρα', type: 'yes-no-na', required: true, scored: true },
      { id: 'q5', label: 'Παρατηρήσεις', type: 'textarea', required: false, scored: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TPL-URINE-CULTURE',
    name: 'Ουροκαλλιέργεια – Κλινική αξιολόγηση',
    type: 'questionnaire',
    category: 'Καλλιέργειες ασθενών',
    description: 'Έτοιμο ερωτηματολόγιο που μπορεί να φορτώνεται κατά την καταχώρηση ουροκαλλιέργειας.',
    status: 'active',
    appliesTo: [{ module: 'patient-cultures', context: 'Ουροκαλλιέργεια' }],
    scoring: { enabled: false },
    questions: [
      { id: 'q1', label: 'Υπάρχει ουροκαθετήρας;', type: 'yes-no', required: true },
      { id: 'q2', label: 'Ημερομηνία τοποθέτησης ουροκαθετήρα', type: 'date', required: false, condition: { questionId: 'q1', operator: 'equals', value: 'yes' } },
      { id: 'q3', label: 'Συμπτώματα ουρολοίμωξης', type: 'multi-select', required: false, options: ['Πυρετός', 'Δυσουρία', 'Συχνοουρία', 'Υπερηβικό άλγος', 'Άλλο'] },
      { id: 'q4', label: 'Έχει προηγηθεί αντιμικροβιακή αγωγή;', type: 'yes-no', required: false },
      { id: 'q5', label: 'Κλινικές παρατηρήσεις', type: 'textarea', required: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TPL-BLOOD-CULTURE',
    name: 'Αιμοκαλλιέργεια – Έλεγχος λήψης',
    type: 'questionnaire',
    category: 'Καλλιέργειες ασθενών',
    description: 'Ερωτήσεις ορθής λήψης και κλινικού πλαισίου αιμοκαλλιέργειας.',
    status: 'active',
    appliesTo: [{ module: 'patient-cultures', context: 'Αιμοκαλλιέργεια' }],
    scoring: { enabled: false },
    questions: [
      { id: 'q1', label: 'Η λήψη έγινε πριν την έναρξη αντιβιοτικών;', type: 'yes-no-na', required: true },
      { id: 'q2', label: 'Αριθμός ζευγών φιαλών', type: 'number', required: true },
      { id: 'q3', label: 'Σημείο λήψης', type: 'select', required: true, options: ['Περιφερική φλέβα', 'Κεντρικός καθετήρας', 'Και τα δύο'] },
      { id: 'q4', label: 'Υποψία λοίμωξης σχετιζόμενης με καθετήρα;', type: 'yes-no', required: false },
      { id: 'q5', label: 'Παρατηρήσεις', type: 'textarea', required: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  {
    id: 'TPL-AUDIT-CLEANING',
    name: 'Audit Καθαριότητας Κλινικού Τμήματος',
    type: 'audit',
    category: 'Καθαριότητα & Περιβάλλον',
    description: 'Πρότυπο εσωτερικού audit για την καθαριότητα και την ασφαλή διαχείριση χώρων.',
    status: 'active',
    appliesTo: [{ module: 'audits', context: 'Καθαριότητα' }],
    scoring: { enabled: true, positiveValue: 1, negativeValue: 0, excludeNA: true },
    questions: [
      { id: 'q1', label: 'Οι επιφάνειες υψηλής επαφής είναι καθαρές;', type: 'yes-no-na', required: true, scored: true },
      { id: 'q2', label: 'Υπάρχει σωστός διαχωρισμός καθαρών και ακάθαρτων υλικών;', type: 'yes-no-na', required: true, scored: true },
      { id: 'q3', label: 'Οι βοηθητικοί χώροι είναι τακτοποιημένοι και κλειστοί;', type: 'yes-no-na', required: true, scored: true },
      { id: 'q4', label: 'Υπάρχουν οσμές ή ενδείξεις ανεπαρκούς καθαριότητας;', type: 'yes-no', required: true, scored: false },
      { id: 'q5', label: 'Παρατηρήσεις / τεκμηρίωση ευρημάτων', type: 'textarea', required: false, scored: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TPL-AUDIT-STERILIZATION',
    name: 'Audit Κεντρικής Αποστείρωσης',
    type: 'audit',
    category: 'Αποστείρωση',
    description: 'Πρότυπο ελέγχου ροών, ιχνηλασιμότητας και τεκμηρίωσης αποστείρωσης.',
    status: 'active',
    appliesTo: [{ module: 'audits', context: 'Αποστείρωση' }],
    scoring: { enabled: true, positiveValue: 1, negativeValue: 0, excludeNA: true },
    questions: [
      { id: 'q1', label: 'Τηρείται διαχωρισμός ακάθαρτης και καθαρής ζώνης;', type: 'yes-no-na', required: true, scored: true },
      { id: 'q2', label: 'Οι κύκλοι αποστείρωσης τεκμηριώνονται πλήρως;', type: 'yes-no-na', required: true, scored: true },
      { id: 'q3', label: 'Υπάρχει πλήρης ιχνηλασιμότητα σετ και εργαλείων;', type: 'yes-no-na', required: true, scored: true },
      { id: 'q4', label: 'Τα αποστειρωμένα υλικά αποθηκεύονται κατάλληλα;', type: 'yes-no-na', required: true, scored: true },
      { id: 'q5', label: 'Παρατηρήσεις / ευρήματα', type: 'textarea', required: false, scored: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]


function normalizeTemplate(template = {}) {
  const now = new Date().toISOString()
  return { id: template.id || `TPL-${Date.now()}`, name: template.name || 'Νέα φόρμα', type: template.type || 'checklist', category: template.category || 'Άλλο', description: template.description || '', status: template.status || 'active', appliesTo: Array.isArray(template.appliesTo) ? template.appliesTo : [], scoring: template.scoring || { enabled: false }, questions: Array.isArray(template.questions) ? template.questions : [], createdAt: template.createdAt || now, updatedAt: now }
}
export function loadFormTemplates() {
  const value = formsRepository.findTemplates()
  if (!value.length) { formsRepository.replaceTemplates(seedTemplates); return seedTemplates }
  const existingIds = new Set(value.map((item) => item.id))
  const missingSeeds = seedTemplates.filter((item) => !existingIds.has(item.id))
  if (missingSeeds.length) { const merged = [...missingSeeds, ...value]; formsRepository.replaceTemplates(merged); return merged }
  return value
}
export function saveFormTemplates(templates = []) { const rows = Array.isArray(templates) ? templates : []; formsRepository.replaceTemplates(rows); emitAppEvent(FORM_TEMPLATES_EVENT, rows); return rows }
export function upsertFormTemplate(template) { const normalized=normalizeTemplate(template); const rows=loadFormTemplates(); const exists=rows.some((item)=>item.id===normalized.id); saveFormTemplates(exists?rows.map((item)=>item.id===normalized.id?normalized:item):[normalized,...rows]); return normalized }
export function deleteFormTemplate(templateId) { return saveFormTemplates(loadFormTemplates().filter((item)=>item.id!==templateId)) }
export function getTemplatesForContext(module, context) { return loadFormTemplates().filter((template)=>template.status==='active' && template.appliesTo?.some((link)=>link.module===module && (!context || link.context===context || link.context==='*'))) }
