import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useRef, useState } from 'react'
import { APP_EVENTS, useAppEvents } from '../../core/events'
import {
  Activity, ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, ClipboardList,
  Edit3, Eye, FileText, FlaskConical, History, LogIn, LogOut, Paperclip,
  Pill, Plus, Printer, RefreshCcw, Save, ShieldAlert, Trash2, X,
} from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { APP_ROUTES, routeFor } from '../../config/routes'
import Button from '../../components/core/Button/Button'
import { WorkspaceHeader, WorkspaceShell } from '../../components/core'
import Badge from '../../components/core/Badge/Badge'
import CoreIconButton from '../../components/core/IconButton/IconButton'
import Tabs from '../../components/core/Tabs/Tabs'
import Timeline from '../../components/core/Timeline/Timeline'
import MultiSelect, { normalizeValues } from '../../components/core/MultiSelect/MultiSelect'
import LibraryField from '../../components/core/LibraryField/LibraryField'
import { deletePatient, loadPatientRegistry, upsertPatient } from '../../services/patientService'
import { deletePatientSample, getPatientSamples } from '../../services/patientSamplesService'
import { savePatientSampleWithClinicalWorkflow } from '../../services/clinicalWorkflowService'
import { deleteInfection, getPatientInfections } from '../../services/infectionsService'
import { deleteIsolation, getPatientIsolations, upsertIsolation } from '../../services/isolationsService'
import { SURVEILLANCE_CASE_STATUS, deleteSurveillanceCase, getPatientCases, upsertSurveillanceCase } from '../../services/surveillanceCasesService'
import { EODY_DISEASES, loadNotifiableDiseases, saveNotifiableDiseases } from '../../services/notifiableDiseasesService'
import { promotedRecordIdForTherapy, syncPromotedTherapy, deletePromotedAntibiotic, loadPromotedAntibiotics, PROMOTED_ANTIBIOTICS_EVENT } from '../../services/preventionService'
import { addPatientAttachment, deletePatientAttachment, getPatientAttachments } from '../../services/patientAttachmentsService'
import { readFileAsDataUrl } from '../../core/files/attachmentPreview'
import {
  CLINICAL_ASSESSMENT_OPTIONS,
  PROMOTED_ANTIBIOTIC_DEFAULTS, PROMOTED_APPROVAL_OPTIONS,
  DEPARTMENT_OPTIONS, RESISTANCE_OPTIONS,
} from '../../core/constants/clinicalOptions'
import { masterNames, upsertMasterItem } from '../../services/masterDataService'
import './PatientWorkflowPage.css'
import { PatientHome, CaseWorkspace, buildPatientTimeline, deriveOverallResistance, formatDate, getPatientSignals, getSampleDescendants, getTherapies, isRepeatSample, normalizeOrganismResults, sampleMicroorganismLabel, today } from './PatientWorkflowSections'

const emptyQuestionnaire = { symptoms: [], devices: [], surgery: '', riskFactors: [], notes: '', completed: false }
const emptyCase = {
  reason: '', startDate: '', department: '', status: SURVEILLANCE_CASE_STATUS.AWAITING_LAB, workflowPhase: 'awaiting-laboratory', laboratoryOutcome: 'pending', initialSampleId: '', questionnaire: emptyQuestionnaire,
  assessment: { classification: '', notes: '' },
  deviceRecords: [],
  therapies: [],
  therapy: { antibiotic: '', startDate: '', endDate: '', dosage: '', antibiogramNotes: '' },
  review: { date: '', outcome: '', notes: '' }, close: { date: '', result: '', notes: '' },
}
const emptySample = {
  sampleType: 'Αίμα', category: 'Αρχικό / νέο ανεξάρτητο δείγμα', parentSampleId: '', rootSampleId: '', repeatPurpose: '', repeatIndex: 0, monitoringFor: [], collectionDate: '',
  status: 'Εκκρεμεί', resultDate: '', microorganisms: [], microorganismResults: [], microorganism: '', resistance: '', resultNotes: '', antibiogram: [], collectionTime: '',
}
const emptyIsolation = { isolationType: '', pathogen: '', startDate: '', endDate: '', status: 'Ενεργή', notes: '' }

function isClosedSurveillanceCase(record) {
  return Boolean(record) && (
    record.status === SURVEILLANCE_CASE_STATUS.CLOSED ||
    String(record.workflowPhase || '').startsWith('closed-') ||
    Boolean(record.closedDate)
  )
}

export default function PatientWorkflowPage() {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const { patientId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const patient = useMemo(() => loadPatientRegistry().find((item) => String(item.id) === String(patientId)), [patientId])
  const [patientForm, setPatientForm] = useState({})
  const [editingPatient, setEditingPatient] = useState(false)
  const [screen, setScreen] = useState('home')
  const [workspaceTab, setWorkspaceTab] = useState('assessment')
  const [cases, setCases] = useState([])
  const [activeCase, setActiveCase] = useState(null)
  const [samples, setSamples] = useState([])
  const [infections, setInfections] = useState([])
  const [isolations, setIsolations] = useState([])
  const [attachments, setAttachments] = useState([])
  const [notifiableDiseases, setNotifiableDiseases] = useState([])
  const [sampleForm, setSampleForm] = useState(null)
  const [isolationForm, setIsolationForm] = useState(null)
  const [attachmentTarget, setAttachmentTarget] = useState(null)
  const [focusedRecord, setFocusedRecord] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    function returnToPatientHome() {
    if (activeCase?.draft) {
      const hasSamples = samples.some((item) => String(item.clinicalCaseId || '') === String(activeCase.id))
      const hasMeaningfulData = Boolean(activeCase.reason) || hasSamples || Boolean(activeCase.assessment?.classification) || Boolean(activeCase.questionnaire?.notes)
      if (!hasMeaningfulData) deleteSurveillanceCase(activeCase.id)
    }
    setScreen('home')
    setActiveCase(null)
    setSampleForm(null)
    setIsolationForm(null)
    refreshAll()
  }

  if (!patient) return
    setPatientForm({ ...patient })
    setCases(getPatientCases(patient))
    setSamples(getPatientSamples(patient))
    setInfections(getPatientInfections(patient))
    setIsolations(getPatientIsolations(patient))
    setAttachments(getPatientAttachments(patient))
    setNotifiableDiseases(loadNotifiableDiseases().filter((item) => String(item.patientCode || '') === String(patient.patientCode || '') || String(item.patientName || '') === String(patient.fullName || '')))
    setScreen('home')
    setActiveCase(null)
    setEditingPatient(false)
  }, [patient])

  useAppEvents([PROMOTED_ANTIBIOTICS_EVENT, APP_EVENTS.SURVEILLANCE_CASES_UPDATED, APP_EVENTS.PATIENT_SAMPLES_UPDATED], () => {
    if (patient) refreshAll(activeCase?.id)
  })

  function returnToPatientHome() {
    if (activeCase?.draft) {
      const hasSamples = samples.some((item) => String(item.clinicalCaseId || '') === String(activeCase.id))
      const hasMeaningfulData = Boolean(activeCase.reason) || hasSamples || Boolean(activeCase.assessment?.classification) || Boolean(activeCase.questionnaire?.notes)
      if (!hasMeaningfulData) deleteSurveillanceCase(activeCase.id)
    }
    setScreen('home')
    setActiveCase(null)
    setSampleForm(null)
    setIsolationForm(null)
    refreshAll()
  }

  if (!patient) return <div className="pw-page-shell"><div className="pw-missing">{L('Ο ασθενής δεν βρέθηκε.', 'Patient not found.')}<Button onClick={() => navigate(APP_ROUTES.PATIENTS)}>{L('Επιστροφή', 'Back')}</Button></div></div>

  const patientKey = String(patient.id || patient.patientCode)
  const activeCases = cases.filter((item) => item.status !== 'Κλειστό')
  const closedCases = cases.filter((item) => item.status === 'Κλειστό')
  const caseSamples = activeCase ? samples.filter((item) => String(item.clinicalCaseId) === String(activeCase.id)) : []
  const caseIsolations = activeCase ? isolations.filter((item) => String(item.clinicalCaseId) === String(activeCase.id)) : []
  const caseAttachments = activeCase ? attachments.filter((item) => String(item.caseId || '') === String(activeCase.id)) : []

  function refreshAll(nextCaseId = activeCase?.id) {
    const nextCases = getPatientCases(patient)
    setCases(nextCases)
    setSamples(getPatientSamples(patient))
    setInfections(getPatientInfections(patient))
    setIsolations(getPatientIsolations(patient))
    setAttachments(getPatientAttachments(patient))
    setNotifiableDiseases(loadNotifiableDiseases().filter((item) => String(item.patientCode || '') === String(patient.patientCode || '') || String(item.patientName || '') === String(patient.fullName || '')))
    if (nextCaseId) setActiveCase(nextCases.find((item) => String(item.id) === String(nextCaseId)) || null)
  }

  function savePatient() { upsertPatient(patientForm); setEditingPatient(false) }
  function removePatient() {
    if (!confirmAction('Να διαγραφεί ο ασθενής και όλες οι συνδεδεμένες καταγραφές του;')) return
    cases.forEach((surveillanceCase) => {
      getTherapies(surveillanceCase).forEach((therapy) => {
        if (therapy?.id) deletePromotedAntibiotic(promotedRecordIdForTherapy(surveillanceCase.id, therapy.id))
      })
      deleteSurveillanceCase(surveillanceCase.id)
    })
    samples.forEach((item) => deletePatientSample(item.id))
    infections.forEach((item) => deleteInfection(item.id))
    isolations.forEach((item) => deleteIsolation(item.id))
    attachments.forEach((item) => deletePatientAttachment(item.id))
    if (notifiableDiseases.length) {
      const ids = new Set(notifiableDiseases.map((item) => String(item.id)))
      saveNotifiableDiseases(loadNotifiableDiseases().filter((item) => !ids.has(String(item.id))))
    }
    deletePatient(patientForm)
    navigate(APP_ROUTES.PATIENTS)
  }
  function createCase(options = {}) {
    const created = upsertSurveillanceCase({
      ...emptyCase,
      id: `CASE-${Date.now()}`,
      patientKey,
      patientName: patient.fullName,
      startDate: today(),
      department: patient.department,
      status: SURVEILLANCE_CASE_STATUS.AWAITING_LAB,
      workflowPhase: 'awaiting-laboratory',
      laboratoryOutcome: 'pending',
      draft: true,
      origin: 'Φάκελος ασθενούς',
    })
    refreshAll(created.id)
    setActiveCase(created)
    setWorkspaceTab(options.openSample ? 'samples' : 'assessment')
    setScreen('workspace')
    if (options.openSample) beginSampleForCase(created)
    return created
  }

  function beginSampleForCase(surveillanceCase, parent = null) {
    if (!surveillanceCase) return
    const rootId = parent ? (parent.rootSampleId || parent.id) : ''
    const chain = parent ? samples.filter((item) => String(item.rootSampleId || item.id) === String(rootId)) : []
    const monitoringFor = parent ? normalizeOrganismResults(parent).map((item) => item.name).filter(Boolean) : []
    setSampleForm({
      ...emptySample,
      patientName: patient.fullName,
      patientCode: patient.patientCode,
      department: patient.department,
      collectionDate: today(),
      clinicalCaseId: surveillanceCase.id,
      sampleType: parent?.sampleType || emptySample.sampleType,
      category: parent ? 'Επανέλεγχος' : 'Αρχικό / νέο ανεξάρτητο δείγμα',
      parentSampleId: parent?.id || '',
      rootSampleId: rootId,
      repeatPurpose: parent ? (parent.status === 'Θετικό' ? 'Έλεγχος αρνητικοποίησης' : 'Επανέλεγχος θεραπείας') : '',
      repeatIndex: parent ? Math.max(1, chain.length) : 0,
      monitoringFor,
      // A recheck is a new collection. Never carry the previous result into it.
      status: 'Εκκρεμεί',
      resultDate: '',
      resultNotes: '',
      microorganisms: [],
      microorganismResults: [],
      microorganism: '',
      resistance: '',
      antibiogram: [],
    })
  }
  function openCase(item, options = {}) {
    if (!item) return
    setActiveCase(item)
    setWorkspaceTab(options.tab || 'assessment')
    setSampleForm(null)
    setIsolationForm(null)
    setFocusedRecord(options.recordType ? { type: options.recordType, id: options.recordId || null } : null)
    setScreen('workspace')
  }
  function openCaseRecord({ caseId, tab = 'assessment', recordType = '', recordId = '' } = {}) {
    const related = cases.find((item) => String(item.id) === String(caseId))
    if (!related) return
    setActiveCase(related)
    setWorkspaceTab(tab)
    setFocusedRecord(recordType ? { type: recordType, id: recordId } : null)
    setSampleForm(recordType === 'sample' ? { ...(samples.find((item) => String(item.id) === String(recordId)) || {}) } : null)
    setIsolationForm(recordType === 'isolation' ? { ...(isolations.find((item) => String(item.id) === String(recordId)) || {}) } : null)
    setScreen('workspace')
  }
  function patchCase(patch) {
    if (!activeCase || isClosedSurveillanceCase(activeCase)) return
    const meaningfulChange = Object.keys(patch || {}).some((key) => key !== 'updatedAt')
    const next = upsertSurveillanceCase({ ...activeCase, ...patch, ...(meaningfulChange ? { draft: false } : {}) })
    refreshAll(next.id)
  }
  function patchNested(key, patch) { if (!activeCase || isClosedSurveillanceCase(activeCase)) return; patchCase({ [key]: { ...(activeCase?.[key] || {}), ...patch } }) }
  function beginSample(parent = null) {
    if (!activeCase || isClosedSurveillanceCase(activeCase)) return
    beginSampleForCase(activeCase, parent)
  }
  function saveSample(event) {
    event.preventDefault()
    if (!activeCase || isClosedSurveillanceCase(activeCase)) return
    if (isRepeatSample(sampleForm) && !sampleForm.parentSampleId) {
      notifyAction('Ο επανέλεγχος πρέπει να συνδεθεί με προηγούμενο δείγμα της ίδιας επιτήρησης.')
      return
    }
    const organismResults = normalizeOrganismResults(sampleForm)
    try {
      savePatientSampleWithClinicalWorkflow({
        ...sampleForm,
        id: sampleForm.id || `PS-${Date.now()}`,
        patientId: patient.id,
        patientName: patient.fullName,
        patientCode: patient.patientCode,
        department: patient.department,
        clinicalCaseId: activeCase.id,
        microorganismResults: organismResults,
        microorganisms: organismResults.map((item) => item.name),
        microorganism: organismResults.map((item) => item.name).join(', '),
        resistance: deriveOverallResistance(organismResults),
      })
    } catch (error) {
      notifyAction(error?.message || 'Δεν ήταν δυνατή η αποθήκευση του δείγματος.')
      return
    }
    setSampleForm(null); refreshAll(activeCase.id)
  }
  function saveIsolation(event) {
    event.preventDefault()
    if (!activeCase || isClosedSurveillanceCase(activeCase)) return
    if (!isolationForm?.isolationType || !isolationForm?.startDate) {
      notifyAction(L('Συμπληρώστε τύπο απομόνωσης και ημερομηνία έναρξης.', 'Enter isolation type and start date.'))
      return
    }
    upsertIsolation({ ...isolationForm, id: isolationForm.id || `ISO-${Date.now()}`, patientName: patient.fullName, patientCode: patient.patientCode, department: patient.department, clinicalCaseId: activeCase.id })
    setIsolationForm(null); refreshAll(activeCase.id)
  }
  function removeCase(id) {
    if (activeCase && isClosedSurveillanceCase(activeCase)) return
    if (!confirmAction('Να διαγραφεί η επιτήρηση και οι συνδεδεμένες καταχωρίσεις της;')) return
    samples.filter((x) => String(x.clinicalCaseId) === String(id)).forEach((x) => deletePatientSample(x.id))
    isolations.filter((x) => String(x.clinicalCaseId) === String(id)).forEach((x) => deleteIsolation(x.id))
    attachments.filter((x) => String(x.caseId) === String(id)).forEach((x) => deletePatientAttachment(x.id))
    deleteSurveillanceCase(id); setActiveCase(null); setScreen('home'); refreshAll(null)
  }

  function saveNotifiableRecord(record) {
    const all = loadNotifiableDiseases()
    const now = new Date().toISOString()
    const next = {
      ...record,
      id: record.id || `YDN-${new Date().getFullYear()}-${String(all.length + 1).padStart(4, '0')}`,
      patientName: patient.fullName,
      patientCode: patient.patientCode,
      department: record.department || patient.department,
      history: [...(record.history || []), { id: `h-${Date.now()}`, at: now, text: record.id ? 'Ενημέρωση δήλωσης από τον φάκελο ασθενούς' : 'Δημιουργία δήλωσης από τον φάκελο ασθενούς' }],
    }
    const updated = record.id ? all.map((item) => item.id === record.id ? next : item) : [next, ...all]
    saveNotifiableDiseases(updated)
    setNotifiableDiseases(updated.filter((item) => String(item.patientCode || '') === String(patient.patientCode || '') || String(item.patientName || '') === String(patient.fullName || '')))
  }
  function removeNotifiableRecord(id) {
    if (!confirmAction('Να διαγραφεί η δήλωση νοσήματος;')) return
    const updated = loadNotifiableDiseases().filter((item) => item.id !== id)
    saveNotifiableDiseases(updated)
    setNotifiableDiseases(updated.filter((item) => String(item.patientCode || '') === String(patient.patientCode || '') || String(item.patientName || '') === String(patient.fullName || '')))
  }

  function requestAttachment(target) { if (activeCase && isClosedSurveillanceCase(activeCase)) return; setAttachmentTarget(target); fileRef.current?.click() }
  async function uploadFile(event) {
    const file = event.target.files?.[0]
    if (!file || !attachmentTarget) return
    const data = await readFileAsDataUrl(file)
    addPatientAttachment({ patientKey, caseId: activeCase?.id || null, step: attachmentTarget.step, recordId: attachmentTarget.recordId || null, name: file.name, type: file.type, size: file.size, data, uploadedAt: new Date().toISOString() })
    event.target.value = ''; setAttachmentTarget(null); refreshAll(activeCase?.id)
  }
  function filesFor(step, recordId = null) { return attachments.filter((item) => item.step === step && String(item.recordId || '') === String(recordId || '')) }

  const signals = getPatientSignals({ patient: patientForm, samples, isolations })
  const timeline = buildPatientTimeline({ patient: patientForm, cases, samples, isolations, notifiableDiseases, language })

  return <WorkspaceShell className="pw-page-shell" shellClassName="pw-page">
    <WorkspaceHeader
      backLabel="Επιστροφή στους ασθενείς"
      onBack={() => navigate(APP_ROUTES.PATIENTS, { state: { returnFromDetail: true, listScope: APP_ROUTES.PATIENTS, highlightRowKey: patient.id } })}
      avatar={String(patientForm.fullName || 'Α').split(' ').slice(0, 2).map((x) => x[0]).join('')}
      eyebrow={L("ΦΑΚΕΛΟΣ ΑΣΘΕΝΟΥΣ", "PATIENT RECORD")}
      title={patientForm.fullName || 'Ασθενής'}
      badges={<>{signals.positive && <Badge tone="danger">{L("Θετικό", "Positive")}</Badge>}{signals.resistance && <Badge tone="danger">{signals.resistance}</Badge>}{signals.isolation && <Badge tone="warning">{L("Απομόνωση", "Isolation")}</Badge>}{signals.pending && <Badge tone="neutral">{L("Εκκρεμές", "Pending")}</Badge>}{!signals.positive && !signals.isolation && !signals.pending && <Badge tone="success">{L("Χωρίς ενεργή ένδειξη", "No active flag")}</Badge>}</>}
      meta={`${patientForm.patientCode || L('Χωρίς κωδικό', 'No code')} · ${patientForm.room || L('Χωρίς κλίνη', 'No bed')}${patientForm.admissionDate ? ` · ${L('Εισαγωγή', 'Admission')} ${formatDate(patientForm.admissionDate)}` : ''}`}
      actions={<>{screen !== 'home' && <Button variant="secondary" size="sm" icon={<ArrowLeft size={15} />} onClick={returnToPatientHome}>{L('Σύνοψη', 'Summary')}</Button>}<CoreIconButton label={L("Εκτύπωση καρτέλας ασθενούς", "Print patient record")} onClick={() => window.print()}><Printer size={17} /></CoreIconButton><CoreIconButton label={L("Διαγραφή ασθενούς", "Delete patient")} variant="danger" onClick={removePatient}><Trash2 size={17} /></CoreIconButton></>}
    />
    <input ref={fileRef} type="file" hidden onChange={uploadFile} />
    <main className="pw-page-body">
      {screen === 'home' && <PatientHome
        patient={patientForm} editing={editingPatient} setEditing={setEditingPatient} setPatient={setPatientForm} savePatient={savePatient}
        activeCases={activeCases} closedCases={closedCases} cases={cases} samples={samples} isolations={isolations} attachments={attachments} timeline={timeline} notifiableDiseases={notifiableDiseases}
        createCase={createCase} createSample={() => navigate(routeFor.laboratoryNewWorkspace(), { state: { prefillPatient: { id: patient.id, fullName: patient.fullName, patientCode: patient.patientCode, department: patient.department, room: patient.room, admissionDate: patient.admissionDate }, returnContext: { path: routeFor.patientWorkflow(patient.id), label: L('Πίσω στα δείγματα ασθενούς', 'Back to patient samples'), patientTab: 'samples' } } })} openCase={openCase} openCaseRecord={openCaseRecord}
        initialTab={location.state?.patientTab || 'summary'} highlightedSampleId={location.state?.highlightedSampleId || ''}
        openLaboratorySample={(sample) => navigate(routeFor.laboratoryRecordWorkspace(encodeURIComponent('Ασθενής'), encodeURIComponent(sample.id)), { state: { returnContext: { path: routeFor.patientWorkflow(patient.id), label: L('Πίσω στα δείγματα ασθενούς', 'Back to patient samples'), patientTab: 'samples', highlightedSampleId: sample.id } } })}
        upload={() => requestAttachment({ step: 'patient-records' })} deleteAttachment={(id) => { if (!confirmAction('Να διαγραφεί το συνημμένο αρχείο;')) return; deletePatientAttachment(id); refreshAll() }}
        saveNotifiable={saveNotifiableRecord} deleteNotifiable={removeNotifiableRecord}
      />}
      {screen === 'workspace' && activeCase && <CaseWorkspace
        patient={patientForm} data={activeCase} tab={workspaceTab} setTab={setWorkspaceTab} patch={patchCase} patchNested={patchNested} focusedRecord={focusedRecord}
        samples={caseSamples} sampleForm={sampleForm} setSampleForm={setSampleForm} beginSample={beginSample} saveSample={saveSample}
        isolations={caseIsolations} isolationForm={isolationForm} setIsolationForm={setIsolationForm} saveIsolation={saveIsolation}
        attachments={caseAttachments} filesFor={filesFor} upload={requestAttachment} deleteAttachment={(id) => { if (isClosedSurveillanceCase(activeCase) || !confirmAction('Να διαγραφεί το συνημμένο αρχείο;')) return; deletePatientAttachment(id); refreshAll(activeCase.id) }}
        removeCase={removeCase} removeSample={(id) => {
          if (isClosedSurveillanceCase(activeCase)) return
          const descendants = getSampleDescendants(samples, id)
          const message = descendants.length ? (language === 'en' ? `This sample has ${descendants.length} linked follow-up${descendants.length === 1 ? '' : 's'}. Delete the entire chain?` : `Το δείγμα έχει ${descendants.length} συνδεδεμένο/α επανέλεγχο/ους. Να διαγραφεί ολόκληρη η αλυσίδα;`) : L('Να διαγραφεί το δείγμα;', 'Delete this sample?')
          if (confirmAction(message)) { [...descendants, samples.find((item) => String(item.id) === String(id))].filter(Boolean).forEach((item) => deletePatientSample(item.id)); refreshAll(activeCase.id) }
        }}
        removeIsolation={(id) => { if (isClosedSurveillanceCase(activeCase)) return; if (confirmAction('Να διαγραφεί η απομόνωση;')) { deleteIsolation(id); refreshAll(activeCase.id) } }}
      />}
    </main>
  </WorkspaceShell>
}

