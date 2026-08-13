import { confirmAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_ROUTES } from '../../config/routes'
import { useAppEvents } from '../../core/events'
import { ClipboardCheck, FilePlus2, Library, ListChecks, Play, Plus, Settings2, Trash2, X } from 'lucide-react'
import DynamicFormRenderer from '../../components/forms/DynamicFormRenderer'
import PageHeader from '../../components/core/PageHeader/PageHeader'
import { Button, IconButton, Tabs } from '../../components/core'
import FormActions from '../../components/core/FormActions/FormActions'
import { loadBundles, BUNDLES_EVENT } from '../../services/preventionService'
import { calculateCompliance, FORM_RESPONSES_EVENT, loadFormResponses } from '../../services/formResponsesService'
import { deleteFormResponseBackend, hydrateFormsBackend, saveFormResponseBackend } from '../../services/backend/configurationBackendService'
import { FORM_TEMPLATES_EVENT, getTemplatesForContext, loadFormTemplates } from '../../services/formTemplatesService'
import { loadMasterData } from '../../services/masterDataService'
import { buildQuestionValidationSchema, validateValues } from '../../core/forms'
import { useI18n } from '../../i18n'
import './BundlesPage.css'

const today = () => new Date().toISOString().slice(0, 10)

export default function BundlesPage() {
  const { language } = useI18n()
  const navigate = useNavigate()
  const L = (el,en) => language === 'en' ? en : el
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

  useEffect(()=>{hydrateFormsBackend().then(({templates,responses})=>{setTemplates(templates);setResponses(responses)}).catch(()=>{})},[])

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
  const saveExecution = async () => {
    if (!execution || !selectedTemplate) return
    const nextErrors = {
      ...validateValues(execution, {
        date: (value) => value ? '' : L('Υποχρεωτικό πεδίο','Required field'),
        department: (value) => value ? '' : L('Υποχρεωτικό πεδίο','Required field'),
      }),
      ...validateValues(execution.answers, buildQuestionValidationSchema(selectedTemplate.questions, L('Απαιτείται απάντηση','Answer required'))),
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    await saveFormResponseBackend({ ...execution, compliance: calculateCompliance(selectedTemplate, execution.answers) })
    setResponses((await hydrateFormsBackend()).responses)
    setExecution(null)
    setSelectedTemplate(null)
    setTab('executions')
  }

  return <div className="bundles-hub">
    <PageHeader eyebrow={L('Πρόληψη & Συμμόρφωση','Prevention & Compliance')} title={L('Bundles & Checklists','Bundles & Checklists')} description={L('Βιβλιοθήκη έτοιμων και προσαρμοσμένων ελέγχων με δυναμικά ερωτηματολόγια και αυτόματο υπολογισμό συμμόρφωσης.','Library of ready-made and customized controls with dynamic questionnaires and automatic compliance calculation.')} actions={<div className="bundles-header-actions"><Button variant="secondary" icon={<Settings2 size={17}/>} onClick={() => navigate(APP_ROUTES.FORM_DESIGNER)}>Form Designer</Button><Button icon={<Plus size={17}/>} onClick={() => navigate(APP_ROUTES.FORM_DESIGNER)}>{L('Νέο Bundle','New Bundle')}</Button></div>} />
    <section className="bundles-kpis"><article><Library/><div><strong>{bundleTemplates.length}</strong><span>{L('Διαθέσιμες φόρμες','Available forms')}</span></div></article><article><ListChecks/><div><strong>{bundleResponses.length + legacyRecords.length}</strong><span>{L('Συνολικές εκτελέσεις','Total executions')}</span></div></article><article><ClipboardCheck/><div><strong>{average}%</strong><span>{L('Μέση συμμόρφωση','Average compliance')}</span></div></article><article><FilePlus2/><div><strong>{bundleTemplates.filter((item) => item.status === 'active').length}</strong><span>{L('Ενεργά πρότυπα','Active templates')}</span></div></article></section>
    <div className="bundles-tabs"><Tabs value={tab} onChange={setTab} items={[{id:'library',label:L('Βιβλιοθήκη','Library')},{id:'executions',label:L('Εκτελέσεις','Executions'),count:bundleResponses.length},{id:'legacy',label:L('Παλαιές καταχωρήσεις','Legacy records'),count:legacyRecords.length}]} ariaLabel={L('Ενότητες Bundles','Bundle sections')} /></div>
    {tab === 'library' && <><div className="bundles-toolbar"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L('Αναζήτηση bundle ή checklist…','Search bundle or checklist…')}/><span>{visibleTemplates.length} {L('διαθέσιμα','available')}</span></div><section className="bundle-library">{visibleTemplates.map((template) => {
      const templateResponses = bundleResponses.filter((item) => item.templateId === template.id)
      const templateAverage = templateResponses.length ? Math.round(templateResponses.reduce((sum, item) => sum + (Number(item.compliance) || 0), 0) / templateResponses.length) : null
      return <article className="bundle-template-card core-record-card" role="button" tabIndex={0} key={template.id} onClick={() => setSelectedTemplate(template)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedTemplate(template) } }}><div className="bundle-template-top"><span className="bundle-type">{template.type}</span><span className={`bundle-status ${template.status}`}>{template.status === 'active' ? L('Ενεργό','Active') : L('Ανενεργό','Inactive')}</span></div><h3>{template.name}</h3><p>{template.description}</p><div className="bundle-template-stats"><span><strong>{template.questions.length}</strong> {L('ερωτήσεις','questions')}</span><span><strong>{templateResponses.length}</strong> {L('εκτελέσεις','executions')}</span><span><strong>{templateAverage === null ? '—' : `${templateAverage}%`}</strong> {L('συμμόρφωση','compliance')}</span></div><footer><Button size="sm" className="run" icon={<Play size={15}/>} disabled={template.status !== 'active'} onClick={(event) => { event.stopPropagation(); startExecution(template) }}>{L('Νέα εκτέλεση','New execution')}</Button></footer></article>
    })}</section></>}
    {tab === 'executions' && <section className="bundle-executions"><div className="execution-table"><div className="execution-row header"><span>{L('Ημερομηνία','Date')}</span><span>Bundle / Checklist</span><span>{L('Τμήμα','Department')}</span><span>{L('Υπεύθυνος','Observer')}</span><span>{L('Συμμόρφωση','Compliance')}</span><span></span></div>{bundleResponses.map((item) => <div className="execution-row" key={item.id}><span>{item.date || '—'}</span><span>{item.templateName}</span><span>{item.department || '—'}</span><span>{item.observer || '—'}</span><span><b className={Number(item.compliance) < 80 ? 'low' : ''}>{item.compliance === null || item.compliance === undefined ? '—' : `${item.compliance}%`}</b></span><IconButton size="sm" variant="danger" label={L('Διαγραφή εκτέλεσης','Delete execution')} onClick={async () => { if (confirmAction(L('Να διαγραφεί η εκτέλεση;','Delete this execution?'))) { await deleteFormResponseBackend(item.id); setResponses((await hydrateFormsBackend()).responses) } }}><Trash2 size={16}/></IconButton></div>)}</div>{!bundleResponses.length && <div className="bundle-empty">{L("Δεν υπάρχουν ακόμη εκτελέσεις.","No executions yet.")}</div>}</section>}
    {tab === 'legacy' && <section className="bundle-executions"><div className="legacy-note">{L('Οι παλιές καταχωρήσεις διατηρούνται αυτούσιες. Δεν χάθηκε κανένα δεδομένο και μπορούν αργότερα να μεταφερθούν στον νέο μηχανισμό.','Legacy records are preserved unchanged. No data has been lost and they can be migrated later.')}</div><div className="execution-table"><div className="execution-row legacy header"><span>{L('Ημερομηνία','Date')}</span><span>Bundle</span><span>{L('Τμήμα','Department')}</span><span>{L('Ασθενής','Patient')}</span><span>{L('Συμμόρφωση','Compliance')}</span></div>{legacyRecords.map((item) => <div className="execution-row legacy" key={item.id}><span>{item.date || '—'}</span><span>{item.bundleType || '—'}</span><span>{item.department || '—'}</span><span>{item.patientCode || '—'}</span><span>{item.compliance ? `${item.compliance}%` : '—'}</span></div>)}</div></section>}
    {selectedTemplate && !execution && <div className="bundle-drawer-backdrop" onMouseDown={() => setSelectedTemplate(null)}><aside className="bundle-drawer" onMouseDown={(e) => e.stopPropagation()}><header><div><span>{selectedTemplate.type}</span><h2>{selectedTemplate.name}</h2><p>{selectedTemplate.description}</p></div><IconButton variant="ghost" label={L('Κλείσιμο','Close')} onClick={() => setSelectedTemplate(null)}><X/></IconButton></header><div className="bundle-drawer-body"><h3>{L('Ερωτήσεις','Questions')} ({selectedTemplate.questions.length})</h3>{selectedTemplate.questions.map((q, index) => <div className="question-preview" key={q.id}><span>{index + 1}</span><div><strong>{q.label}</strong><small>{q.type}{q.required ? ` • ${L('Υποχρεωτική','Required')}` : ''}</small></div></div>)}</div><footer><Button className="run" icon={<Play size={16}/>} onClick={() => startExecution(selectedTemplate)}>{L('Νέα εκτέλεση','New execution')}</Button></footer></aside></div>}
    {execution && selectedTemplate && <div className="bundle-drawer-backdrop"><aside className="bundle-execution-drawer"><header><div><span>{L('ΝΕΑ ΕΚΤΕΛΕΣΗ','NEW EXECUTION')}</span><h2>{selectedTemplate.name}</h2></div><IconButton variant="ghost" label={L('Κλείσιμο','Close')} onClick={() => { setExecution(null); setSelectedTemplate(null) }}><X/></IconButton></header><div className="bundle-execution-body"><section className="execution-basic-grid"><label>{L('Ημερομηνία *','Date *')}<input type="date" value={execution.date} onChange={(e) => setExecution({ ...execution, date: e.target.value })}/>{errors.date && <small>{errors.date}</small>}</label><label>{L('Τμήμα *','Department *')}<select value={execution.department} onChange={(e) => setExecution({ ...execution, department: e.target.value })}><option value="">{L("Επιλέξτε","Select")}</option>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select>{errors.department && <small>{errors.department}</small>}</label><label>{L('Κωδικός ασθενούς / αντικειμένου','Patient / object code')}<input value={execution.subjectCode} onChange={(e) => setExecution({ ...execution, subjectCode: e.target.value })}/></label><label>{L('Υπεύθυνος','Observer')}<input value={execution.observer} onChange={(e) => setExecution({ ...execution, observer: e.target.value })}/></label></section><section className="execution-questions"><h3>{L('Ερωτηματολόγιο','Questionnaire')}</h3><DynamicFormRenderer template={selectedTemplate} answers={execution.answers} onChange={(answers) => setExecution({ ...execution, answers })} errors={errors}/></section></div><FormActions onCancel={() => { setExecution(null); setSelectedTemplate(null) }} primaryLabel={L('Αποθήκευση εκτέλεσης','Save execution')} onPrimary={saveExecution} primaryType="button" sticky={false} /></aside></div>}
  </div>
}
