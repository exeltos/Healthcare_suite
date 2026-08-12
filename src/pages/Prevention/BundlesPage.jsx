import { confirmAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { ClipboardCheck, FilePlus2, Library, ListChecks, Play, Plus, Settings2, Trash2, X } from 'lucide-react'
import DynamicFormRenderer from '../../components/forms/DynamicFormRenderer'
import PageHeader from '../../components/core/PageHeader/PageHeader'
import FormActions from '../../components/core/FormActions/FormActions'
import { loadBundles, BUNDLES_EVENT } from '../../services/preventionService'
import { calculateCompliance, deleteFormResponse, FORM_RESPONSES_EVENT, loadFormResponses, upsertFormResponse } from '../../services/formResponsesService'
import { FORM_TEMPLATES_EVENT, getTemplatesForContext, loadFormTemplates } from '../../services/formTemplatesService'
import { loadMasterData } from '../../services/masterDataService'
import { buildQuestionValidationSchema, validateValues } from '../../core/forms'
import './BundlesPage.css'

const today = () => new Date().toISOString().slice(0, 10)

export default function BundlesPage() {
  const [templates, setTemplates] = useState(loadFormTemplates)
  const [responses, setResponses] = useState(loadFormResponses)
  const [legacyRecords, setLegacyRecords] = useState(loadBundles)
  const [tab, setTab] = useState('library')
  const [query, setQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [execution, setExecution] = useState(null)
  const [errors, setErrors] = useState({})
  const masterData = loadMasterData()
  const departments = (masterData?.departments || []).map((item) => typeof item === 'string' ? item : item.name).filter(Boolean)

  useAppEvents([FORM_TEMPLATES_EVENT, FORM_RESPONSES_EVENT, BUNDLES_EVENT], () => {
    setTemplates(loadFormTemplates())
    setResponses(loadFormResponses())
    setLegacyRecords(loadBundles())
  })

  const bundleTemplates = useMemo(() => templates.filter((template) => ['bundle', 'checklist', 'audit'].includes(template.type) && template.appliesTo?.some((link) => link.module === 'bundles')), [templates])
  const visibleTemplates = useMemo(() => bundleTemplates.filter((template) => `${template.name} ${template.category}`.toLocaleLowerCase('el-GR').includes(query.toLocaleLowerCase('el-GR'))), [bundleTemplates, query])
  const bundleResponses = useMemo(() => responses.filter((response) => response.module === 'bundles'), [responses])
  const average = bundleResponses.length ? Math.round(bundleResponses.reduce((sum, item) => sum + (Number(item.compliance) || 0), 0) / bundleResponses.filter((item) => item.compliance !== null && item.compliance !== undefined).length) || 0 : 0

  const startExecution = (template) => {
    setSelectedTemplate(template)
    setErrors({})
    setExecution({ id: '', templateId: template.id, templateName: template.name, module: 'bundles', date: today(), department: '', subjectCode: '', observer: '', notes: '', answers: {} })
  }
  const saveExecution = () => {
    if (!execution || !selectedTemplate) return
    const nextErrors = {
      ...validateValues(execution, {
        date: (value) => value ? '' : 'Υποχρεωτικό πεδίο',
        department: (value) => value ? '' : 'Υποχρεωτικό πεδίο',
      }),
      ...validateValues(execution.answers, buildQuestionValidationSchema(selectedTemplate.questions, 'Απαιτείται απάντηση')),
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    upsertFormResponse({ ...execution, compliance: calculateCompliance(selectedTemplate, execution.answers) })
    setExecution(null)
    setSelectedTemplate(null)
    setTab('executions')
  }

  return <div className="bundles-hub">
    <PageHeader eyebrow="Πρόληψη & Συμμόρφωση" title="Bundles & Checklists" description="Βιβλιοθήκη έτοιμων και προσαρμοσμένων ελέγχων με δυναμικά ερωτηματολόγια και αυτόματο υπολογισμό συμμόρφωσης." actions={<div className="bundles-header-actions"><button type="button" className="secondary" onClick={() => window.location.assign('/forms/designer')}><Settings2 size={17}/> Form Designer</button><button type="button" className="primary" onClick={() => window.location.assign('/forms/designer')}><Plus size={17}/> Νέο Bundle</button></div>} />
    <section className="bundles-kpis"><article><Library/><div><strong>{bundleTemplates.length}</strong><span>Διαθέσιμες φόρμες</span></div></article><article><ListChecks/><div><strong>{bundleResponses.length + legacyRecords.length}</strong><span>Συνολικές εκτελέσεις</span></div></article><article><ClipboardCheck/><div><strong>{average}%</strong><span>Μέση συμμόρφωση</span></div></article><article><FilePlus2/><div><strong>{bundleTemplates.filter((item) => item.status === 'active').length}</strong><span>Ενεργά πρότυπα</span></div></article></section>
    <nav className="bundles-tabs"><button type="button" className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}>Βιβλιοθήκη</button><button type="button" className={tab === 'executions' ? 'active' : ''} onClick={() => setTab('executions')}>Εκτελέσεις</button><button type="button" className={tab === 'legacy' ? 'active' : ''} onClick={() => setTab('legacy')}>Παλαιές καταχωρήσεις {legacyRecords.length ? `(${legacyRecords.length})` : ''}</button></nav>
    {tab === 'library' && <><div className="bundles-toolbar"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Αναζήτηση bundle ή checklist…"/><span>{visibleTemplates.length} διαθέσιμα</span></div><section className="bundle-library">{visibleTemplates.map((template) => {
      const templateResponses = bundleResponses.filter((item) => item.templateId === template.id)
      const templateAverage = templateResponses.length ? Math.round(templateResponses.reduce((sum, item) => sum + (Number(item.compliance) || 0), 0) / templateResponses.length) : null
      return <article className="bundle-template-card core-record-card" role="button" tabIndex={0} key={template.id} onClick={() => setSelectedTemplate(template)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedTemplate(template) } }}><div className="bundle-template-top"><span className="bundle-type">{template.type}</span><span className={`bundle-status ${template.status}`}>{template.status === 'active' ? 'Ενεργό' : 'Ανενεργό'}</span></div><h3>{template.name}</h3><p>{template.description}</p><div className="bundle-template-stats"><span><strong>{template.questions.length}</strong> ερωτήσεις</span><span><strong>{templateResponses.length}</strong> εκτελέσεις</span><span><strong>{templateAverage === null ? '—' : `${templateAverage}%`}</strong> συμμόρφωση</span></div><footer><button type="button" className="run" disabled={template.status !== 'active'} onClick={(event) => { event.stopPropagation(); startExecution(template) }}><Play size={15}/> Νέα εκτέλεση</button></footer></article>
    })}</section></>}
    {tab === 'executions' && <section className="bundle-executions"><div className="execution-table"><div className="execution-row header"><span>Ημερομηνία</span><span>Bundle / Checklist</span><span>Τμήμα</span><span>Υπεύθυνος</span><span>Συμμόρφωση</span><span></span></div>{bundleResponses.map((item) => <div className="execution-row" key={item.id}><span>{item.date || '—'}</span><span>{item.templateName}</span><span>{item.department || '—'}</span><span>{item.observer || '—'}</span><span><b className={Number(item.compliance) < 80 ? 'low' : ''}>{item.compliance === null || item.compliance === undefined ? '—' : `${item.compliance}%`}</b></span><button type="button" onClick={() => { if (confirmAction('Να διαγραφεί η εκτέλεση;')) deleteFormResponse(item.id) }}><Trash2 size={16}/></button></div>)}</div>{!bundleResponses.length && <div className="bundle-empty">Δεν υπάρχουν ακόμη εκτελέσεις.</div>}</section>}
    {tab === 'legacy' && <section className="bundle-executions"><div className="legacy-note">Οι παλιές καταχωρήσεις διατηρούνται αυτούσιες. Δεν χάθηκε κανένα δεδομένο και μπορούν αργότερα να μεταφερθούν στον νέο μηχανισμό.</div><div className="execution-table"><div className="execution-row legacy header"><span>Ημερομηνία</span><span>Bundle</span><span>Τμήμα</span><span>Ασθενής</span><span>Συμμόρφωση</span></div>{legacyRecords.map((item) => <div className="execution-row legacy" key={item.id}><span>{item.date || '—'}</span><span>{item.bundleType || '—'}</span><span>{item.department || '—'}</span><span>{item.patientCode || '—'}</span><span>{item.compliance ? `${item.compliance}%` : '—'}</span></div>)}</div></section>}
    {selectedTemplate && !execution && <div className="bundle-drawer-backdrop" onMouseDown={() => setSelectedTemplate(null)}><aside className="bundle-drawer" onMouseDown={(e) => e.stopPropagation()}><header><div><span>{selectedTemplate.type}</span><h2>{selectedTemplate.name}</h2><p>{selectedTemplate.description}</p></div><button type="button" onClick={() => setSelectedTemplate(null)}><X/></button></header><div className="bundle-drawer-body"><h3>Ερωτήσεις ({selectedTemplate.questions.length})</h3>{selectedTemplate.questions.map((q, index) => <div className="question-preview" key={q.id}><span>{index + 1}</span><div><strong>{q.label}</strong><small>{q.type}{q.required ? ' • Υποχρεωτική' : ''}</small></div></div>)}</div><footer><button type="button" className="run" onClick={() => startExecution(selectedTemplate)}><Play size={16}/> Νέα εκτέλεση</button></footer></aside></div>}
    {execution && selectedTemplate && <div className="bundle-drawer-backdrop"><aside className="bundle-execution-drawer"><header><div><span>ΝΕΑ ΕΚΤΕΛΕΣΗ</span><h2>{selectedTemplate.name}</h2></div><button type="button" onClick={() => { setExecution(null); setSelectedTemplate(null) }}><X/></button></header><div className="bundle-execution-body"><section className="execution-basic-grid"><label>Ημερομηνία *<input type="date" value={execution.date} onChange={(e) => setExecution({ ...execution, date: e.target.value })}/>{errors.date && <small>{errors.date}</small>}</label><label>Τμήμα *<select value={execution.department} onChange={(e) => setExecution({ ...execution, department: e.target.value })}><option value="">Επιλέξτε</option>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select>{errors.department && <small>{errors.department}</small>}</label><label>Κωδικός ασθενούς / αντικειμένου<input value={execution.subjectCode} onChange={(e) => setExecution({ ...execution, subjectCode: e.target.value })}/></label><label>Υπεύθυνος<input value={execution.observer} onChange={(e) => setExecution({ ...execution, observer: e.target.value })}/></label></section><section className="execution-questions"><h3>Ερωτηματολόγιο</h3><DynamicFormRenderer template={selectedTemplate} answers={execution.answers} onChange={(answers) => setExecution({ ...execution, answers })} errors={errors}/></section></div><FormActions onCancel={() => { setExecution(null); setSelectedTemplate(null) }} primaryLabel="Αποθήκευση εκτέλεσης" onPrimary={saveExecution} primaryType="button" sticky={false} /></aside></div>}
  </div>
}
