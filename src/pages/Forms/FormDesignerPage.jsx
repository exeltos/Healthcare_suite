import { confirmAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Copy, Plus, Save, Trash2, X } from 'lucide-react'
import { deleteFormTemplate, FORM_TEMPLATES_EVENT, loadFormTemplates, upsertFormTemplate } from '../../services/formTemplatesService'
import { BackLink, Button, PageChrome } from '../../components/core'
import PageHeader from '../../components/core/PageHeader/PageHeader'
import './FormDesignerPage.css'

const emptyTemplate = () => ({
  id: '', name: '', type: 'checklist', category: '', description: '', status: 'active',
  appliesTo: [{ module: 'bundles', context: '' }],
  scoring: { enabled: true, excludeNA: true }, questions: [],
})
const emptyQuestion = () => ({ id: `q-${Date.now()}`, label: '', type: 'yes-no-na', required: false, scored: true, options: [] })

export default function FormDesignerPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState(loadFormTemplates)
  const [draft, setDraft] = useState(null)
  const [query, setQuery] = useState('')
  useAppEvents(FORM_TEMPLATES_EVENT, () => setTemplates(loadFormTemplates()))
  const filtered = useMemo(() => templates.filter((item) => `${item.name} ${item.category} ${item.type}`.toLocaleLowerCase('el-GR').includes(query.toLocaleLowerCase('el-GR'))), [templates, query])
  const save = () => {
    if (!draft?.name?.trim()) return
    upsertFormTemplate({ ...draft, questions: draft.questions.filter((q) => q.label.trim()) })
    setDraft(null)
  }
  const addQuestion = () => setDraft((current) => ({ ...current, questions: [...current.questions, emptyQuestion()] }))
  const updateQuestion = (id, patch) => setDraft((current) => ({ ...current, questions: current.questions.map((q) => q.id === id ? { ...q, ...patch } : q) }))
  return <PageChrome
    className="form-designer-page"
    back={<BackLink onClick={() => navigate('/studio')}>Πίσω στο Κέντρο Διαχείρισης</BackLink>}
    header={<PageHeader
      eyebrow="ΚΕΝΤΡΙΚΟΣ ΜΗΧΑΝΙΣΜΟΣ"
      title="Form Designer"
      description="Δημιουργήστε bundles, checklists και ερωτηματολόγια που μπορούν να φορτώνονται δυναμικά σε οποιαδήποτε ενότητα."
      actions={<Button icon={<Plus size={18}/>} onClick={() => setDraft(emptyTemplate())}>Νέα φόρμα</Button>}
    />}
  >
    <section className="fd-toolbar"><input placeholder="Αναζήτηση φόρμας…" value={query} onChange={(e) => setQuery(e.target.value)}/><strong>{filtered.length} φόρμες</strong></section>
    <section className="fd-grid">{filtered.map((template) => <article className="fd-card fd-card--clickable" key={template.id} role="button" tabIndex={0} onClick={() => setDraft(JSON.parse(JSON.stringify(template)))} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setDraft(JSON.parse(JSON.stringify(template))) } }}>
      <div className="fd-card-icon"><ClipboardList size={22}/></div><div className="fd-card-main"><div className="fd-card-meta"><span>{template.type}</span><span>{template.status === 'active' ? 'Ενεργή' : 'Ανενεργή'}</span></div><h3>{template.name}</h3><p>{template.description || 'Χωρίς περιγραφή'}</p><footer><span>{template.questions.length} ερωτήσεις</span><span>{template.appliesTo?.map((x) => `${x.module}${x.context ? ` / ${x.context}` : ''}`).join(', ') || 'Χωρίς σύνδεση'}</span></footer></div><div className="fd-card-actions"><button type="button" title="Επεξεργασία" onClick={(event) => { event.stopPropagation(); setDraft(JSON.parse(JSON.stringify(template))) }}>Επεξεργασία</button><button type="button" title="Αντιγραφή" onClick={(event) => { event.stopPropagation(); setDraft({ ...JSON.parse(JSON.stringify(template)), id: '', name: `${template.name} – Αντίγραφο` }) }}><Copy size={16}/></button><button type="button" title="Διαγραφή" onClick={(event) => { event.stopPropagation(); if (confirmAction('Να διαγραφεί η φόρμα;')) deleteFormTemplate(template.id) }}><Trash2 size={16}/></button></div>
    </article>)}</section>
    {draft && <div className="fd-modal-backdrop"><div className="fd-modal"><header><div><span>{draft.id ? 'ΕΠΕΞΕΡΓΑΣΙΑ' : 'ΝΕΑ ΦΟΡΜΑ'}</span><h2>{draft.name || 'Χωρίς τίτλο'}</h2></div><button type="button" onClick={() => setDraft(null)}><X/></button></header><div className="fd-modal-body">
      <section className="fd-section"><h3>Βασικά στοιχεία</h3><div className="fd-form-grid"><label>Όνομα<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}/></label><label>Τύπος<select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}><option value="bundle">Bundle</option><option value="checklist">Checklist</option><option value="questionnaire">Ερωτηματολόγιο</option><option value="audit">Audit</option><option value="inspection">Επιθεώρηση</option></select></label><label>Κατηγορία<input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}/></label><label>Κατάσταση<select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="active">Ενεργή</option><option value="inactive">Ανενεργή</option></select></label><label className="wide">Περιγραφή<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })}/></label></div></section>
      <section className="fd-section"><h3>Σύνδεση με ενότητα</h3><div className="fd-form-grid"><label>Ενότητα<select value={draft.appliesTo?.[0]?.module || ''} onChange={(e) => setDraft({ ...draft, appliesTo: [{ ...draft.appliesTo?.[0], module: e.target.value }] })}><option value="bundles">Bundles & Checklists</option><option value="patient-cultures">Καλλιέργειες ασθενών</option><option value="staff-cultures">Καλλιέργειες προσωπικού</option><option value="environment">Περιβάλλον</option><option value="water">Νερό</option><option value="audits">Audit Center</option></select></label><label>Πλαίσιο / τύπος<input placeholder="π.χ. Ουροκαλλιέργεια ή *" value={draft.appliesTo?.[0]?.context || ''} onChange={(e) => setDraft({ ...draft, appliesTo: [{ ...draft.appliesTo?.[0], context: e.target.value }] })}/></label></div></section>
      <section className="fd-section"><div className="fd-section-title"><div><h3>Ερωτήσεις</h3><p>Οι ερωτήσεις εμφανίζονται με τη σειρά που καταχωρούνται.</p></div><button type="button" onClick={addQuestion}><Plus size={16}/> Προσθήκη ερώτησης</button></div><div className="fd-questions">{draft.questions.map((q, index) => <div className="fd-question" key={q.id}><span className="fd-question-index">{index + 1}</span><input className="fd-question-label" placeholder="Κείμενο ερώτησης" value={q.label} onChange={(e) => updateQuestion(q.id, { label: e.target.value })}/><select value={q.type} onChange={(e) => updateQuestion(q.id, { type: e.target.value, scored: ['yes-no','yes-no-na'].includes(e.target.value) })}><option value="yes-no-na">Ναι / Όχι / N/A</option><option value="yes-no">Ναι / Όχι</option><option value="text">Κείμενο</option><option value="textarea">Παρατήρηση</option><option value="number">Αριθμός</option><option value="date">Ημερομηνία</option><option value="select">Dropdown</option><option value="multi-select">Πολλαπλή επιλογή</option></select>{['select','multi-select'].includes(q.type) && <input placeholder="Επιλογές χωρισμένες με κόμμα" value={(q.options || []).join(', ')} onChange={(e) => updateQuestion(q.id, { options: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })}/>}<label className="fd-check"><input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}/> Υποχρεωτική</label><button type="button" className="fd-remove" onClick={() => setDraft((current) => ({ ...current, questions: current.questions.filter((item) => item.id !== q.id) }))}><Trash2 size={16}/></button></div>)}</div></section>
    </div><footer><button type="button" className="secondary" onClick={() => setDraft(null)}>Ακύρωση</button><button type="button" className="primary" onClick={save}><Save size={17}/> Αποθήκευση φόρμας</button></footer></div></div>}
  </PageChrome>
}
