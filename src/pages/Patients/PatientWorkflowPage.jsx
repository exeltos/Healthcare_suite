import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useRef, useState } from 'react'
import { APP_EVENTS, useAppEvents } from '../../core/events'
import {
  Activity, ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, ClipboardList,
  Edit3, Eye, FileText, FlaskConical, History, LogIn, LogOut, Paperclip,
  Pill, Plus, Printer, RefreshCcw, Save, ShieldAlert, X,
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
import { loadPatientRegistry } from '../../services/patientService'
import { deleteClinicalInfection, deleteClinicalPatient, deleteClinicalPatientSample, deleteClinicalSurveillanceCase, hydrateClinicalPatient, loadClinicalInfections, loadClinicalPatientSamples, loadClinicalSurveillanceCases, saveClinicalPatient, saveClinicalSurveillanceCase } from '../../services/backend/clinicalDirectoryService'
import { closeClinicalSurveillanceEpisode, deletePatientSampleWithClinicalWorkflowAsync, savePatientSampleWithClinicalWorkflowAsync } from '../../services/clinicalWorkflowService'
import { SURVEILLANCE_CASE_STATUS, getPatientCases } from '../../services/surveillanceCasesService'
import { EODY_DISEASES } from '../../services/notifiableDiseasesService'
import { promotedRecordIdForTherapy, syncPromotedTherapy, deletePromotedAntibiotic, loadPromotedAntibiotics, PROMOTED_ANTIBIOTICS_EVENT } from '../../services/preventionService'
import { deleteClinicalAttachment, deleteClinicalIsolation, deleteClinicalNotifiableDisease, loadClinicalAttachments, loadClinicalIsolations, loadClinicalNotifiableDiseases, saveClinicalIsolation, saveClinicalNotifiableDisease, uploadClinicalAttachment } from '../../services/backend/clinicalSupportBackendService'
import {
  CLINICAL_ASSESSMENT_OPTIONS,
  PROMOTED_ANTIBIOTIC_DEFAULTS, PROMOTED_APPROVAL_OPTIONS,
  DEPARTMENT_OPTIONS, RESISTANCE_OPTIONS,
} from '../../core/constants/clinicalOptions'
import { masterNames, upsertMasterItem } from '../../services/masterDataService'
import './PatientWorkflowPage.css'
import { PatientHome, CaseWorkspace, buildPatientTimeline, deriveOverallResistance, formatDate, getPatientSignals, getSampleDescendants, getTherapies, calculateHospitalDays, isRepeatSample, normalizeOrganismResults, sampleMicroorganismLabel, today } from './PatientWorkflowSections'

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
const emptyPatient = {
  firstName: '', lastName: '', fatherName: '', fullName: '', gender: '', age: '', patientCode: '', amka: '',
  status: 'Νοσηλεύεται', department: '', room: '', admissionDate: '', admissionTime: '', dischargeDate: '', dischargeTime: '',
  daysInHospital: 0, primaryDiagnosis: '', positiveCulture: false, mdr: false, isolation: false,
}

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
  const isNewPatient = String(patientId) === 'new'
  const navigate = useNavigate()
  const location = useLocation()
  const [patient,setPatient]=useState(()=>isNewPatient ? { ...emptyPatient } : (loadPatientRegistry().find((item)=>String(item.id)===String(patientId))||null))
  const [patientForm, setPatientForm] = useState(()=>isNewPatient ? { ...emptyPatient } : {})
  const [editingPatient, setEditingPatient] = useState(isNewPatient)
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
    if (isNewPatient) {
      setPatient({ ...emptyPatient })
      setPatientForm({ ...emptyPatient })
      setCases([]); setSamples([]); setInfections([]); setIsolations([]); setAttachments([]); setNotifiableDiseases([])
      setScreen('home'); setActiveCase(null); setEditingPatient(true)
      return undefined
    }
    let active=true
    hydrateClinicalPatient(patientId)
      .then(async hydrated=>{
        if(!active)return
        const next=hydrated||loadPatientRegistry().find((item)=>String(item.id)===String(patientId))||null
        setPatient(next)
        if(!next)return
        setPatientForm({...next})
        const [caseRows,sampleRows,infectionRows,isolationRows,attachmentRows]=await Promise.all([
          loadClinicalSurveillanceCases(next.id),
          loadClinicalPatientSamples(next.id),
          loadClinicalInfections(next.id),
          loadClinicalIsolations(next.id),
          loadClinicalAttachments(next.id),
        ])
        if(!active)return
        setCases(caseRows)
        setSamples(sampleRows)
        setInfections(infectionRows)
        setIsolations(isolationRows)
        setAttachments(attachmentRows)
        setNotifiableDiseases(await loadClinicalNotifiableDiseases(next.id))
        setScreen('home')
        setActiveCase(null)
        setEditingPatient(false)
      })
      .catch(()=>{})
    return()=>{active=false}
  }, [patientId, isNewPatient])

  useAppEvents([PROMOTED_ANTIBIOTICS_EVENT, APP_EVENTS.SURVEILLANCE_CASES_UPDATED, APP_EVENTS.PATIENT_SAMPLES_UPDATED], () => {
    if (patient) refreshAll(activeCase?.id)
  })

  async function returnToPatientHome() {
    if (activeCase?.draft) {
      const hasSamples = samples.some((item) => String(item.clinicalCaseId || '') === String(activeCase.id))
      const hasMeaningfulData = Boolean(activeCase.reason) || hasSamples || Boolean(activeCase.assessment?.classification) || Boolean(activeCase.questionnaire?.notes)
      if (!hasMeaningfulData) await deleteClinicalSurveillanceCase(activeCase.id)
    }
    setScreen('home')
    setActiveCase(null)
    setSampleForm(null)
    setIsolationForm(null)
    refreshAll()
  }

  if (!patient && !isNewPatient) return <div className="pw-page-shell"><div className="pw-missing">{L('Ο ασθενής δεν βρέθηκε.', 'Patient not found.')}<Button onClick={() => navigate(APP_ROUTES.PATIENTS)}>{L('Επιστροφή', 'Back')}</Button></div></div>

  const patientKey = String(patient.id || patient.patientCode)
  const activeCases = cases.filter((item) => item.status !== 'Κλειστό')
  const closedCases = cases.filter((item) => item.status === 'Κλειστό')
  const caseSamples = activeCase ? samples.filter((item) => String(item.clinicalCaseId) === String(activeCase.id)) : []
  const caseIsolations = activeCase ? isolations.filter((item) => String(item.clinicalCaseId) === String(activeCase.id)) : []
  const caseAttachments = activeCase ? attachments.filter((item) => String(item.caseId || '') === String(activeCase.id)) : []

  async function refreshAll(nextCaseId = activeCase?.id) {
    if(!patient)return
    const [nextCases,nextSamples,nextInfections,nextIsolations,nextAttachments]=await Promise.all([
      loadClinicalSurveillanceCases(patient.id),
      loadClinicalPatientSamples(patient.id),
      loadClinicalInfections(patient.id),
      loadClinicalIsolations(patient.id),
      loadClinicalAttachments(patient.id),
    ])
    setCases(nextCases)
    setSamples(nextSamples)
    setInfections(nextInfections)
    setIsolations(nextIsolations)
    setAttachments(nextAttachments)
    setNotifiableDiseases(await loadClinicalNotifiableDiseases(patient.id))
    if (nextCaseId) setActiveCase(nextCases.find((item) => String(item.id) === String(nextCaseId)) || null)
  }

  async function savePatient() {
    if (!String(patientForm.firstName || '').trim() || !String(patientForm.lastName || '').trim() || !String(patientForm.patientCode || '').trim()) {
      notifyAction(L('Συμπληρώστε όνομα, επώνυμο και κωδικό ασθενούς.', 'Enter first name, last name and patient code.'))
      return
    }
    const saved=await saveClinicalPatient({
      ...patientForm,
      fullName: [patientForm.firstName, patientForm.lastName].filter(Boolean).join(' '),
      daysInHospital: calculateHospitalDays(patientForm.admissionDate, patientForm.dischargeDate || patientForm.exitDate),
    })
    setPatient(saved)
    setPatientForm(saved)
    setEditingPatient(false)
    if (isNewPatient) {
      navigate(routeFor.patientWorkflow(saved.id), { replace: true, state: { patientTab: 'summary' } })
    }
  }
  async function removePatient() {
    if (!confirmAction('Να διαγραφεί ο ασθενής και όλες οι συνδεδεμένες καταγραφές του;')) return
    for (const surveillanceCase of cases) {
      for (const therapy of getTherapies(surveillanceCase)) {
        if (therapy?.id) {
          await deletePromotedAntibiotic(promotedRecordIdForTherapy(surveillanceCase.id, therapy.id))
        }
      }
      await deleteClinicalSurveillanceCase(surveillanceCase.id)
    }
    for(const item of samples) await deleteClinicalPatientSample(item.id)
    for(const item of infections) await deleteClinicalInfection(item.id)
    for(const item of isolations) await deleteClinicalIsolation(item.id)
    for(const item of attachments) await deleteClinicalAttachment(item)
    for(const item of notifiableDiseases) await deleteClinicalNotifiableDisease(item.id)
    await deleteClinicalPatient(patientForm)
    navigate(APP_ROUTES.PATIENTS)
  }
  async function createCase(options = {}) {
    const created = await saveClinicalSurveillanceCase({
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
    await refreshAll(created.id)
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
  async function patchCase(patch) {
    if (!activeCase || isClosedSurveillanceCase(activeCase)) return
    const meaningfulChange = Object.keys(patch || {}).some((key) => key !== 'updatedAt')
    const next = await saveClinicalSurveillanceCase({ ...activeCase, ...patch, ...(meaningfulChange ? { draft: false } : {}) })
    await refreshAll(next.id)
  }
  function patchNested(key, patch) { if (!activeCase || isClosedSurveillanceCase(activeCase)) return; patchCase({ [key]: { ...(activeCase?.[key] || {}), ...patch } }) }
  function beginSample(parent = null) {
    if (!activeCase || isClosedSurveillanceCase(activeCase)) return
    beginSampleForCase(activeCase, parent)
  }
  async function saveSample(event) {
    event.preventDefault()
    if (!activeCase || isClosedSurveillanceCase(activeCase)) return
    if (isRepeatSample(sampleForm) && !sampleForm.parentSampleId) {
      notifyAction('Ο επανέλεγχος πρέπει να συνδεθεί με προηγούμενο δείγμα της ίδιας επιτήρησης.')
      return
    }
    const organismResults = normalizeOrganismResults(sampleForm)
    try {
      await savePatientSampleWithClinicalWorkflowAsync({
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
    setSampleForm(null); await refreshAll(activeCase.id)
  }
  async function closeEpisode() {
    if (!activeCase || isClosedSurveillanceCase(activeCase)) return
    if (!activeCase.review?.date || !activeCase.review?.outcome) {
      notifyAction(L('Συμπληρώστε ημερομηνία και έκβαση πριν από το κλείσιμο.', 'Enter reassessment date and outcome before closing.'))
      return
    }
    if (!confirmAction(L('Να κλείσει η επιτήρηση; Η κλινική καταγραφή θα παραμείνει στο ιστορικό.', 'Close this surveillance episode? The clinical record will remain in history.'))) return
    const closed = await closeClinicalSurveillanceEpisode({
      surveillanceCase: activeCase,
      patient,
      review: activeCase.review,
      close: { date: activeCase.review.date, result: activeCase.review.outcome, notes: activeCase.review.notes || '' },
    })
    await refreshAll(closed.id)
  }

  async function saveIsolation(event) {
    event.preventDefault()
    if (!activeCase || isClosedSurveillanceCase(activeCase)) return
    if (!isolationForm?.isolationType || !isolationForm?.startDate) {
      notifyAction(L('Συμπληρώστε τύπο απομόνωσης και ημερομηνία έναρξης.', 'Enter isolation type and start date.'))
      return
    }
    if (isolationForm.endDate && isolationForm.endDate < isolationForm.startDate) {
      notifyAction(L('Η λήξη της απομόνωσης δεν μπορεί να προηγείται της έναρξης.', 'Isolation end date cannot be before its start date.'))
      return
    }
    const normalizedIsolation = isolationForm.endDate && isolationForm.status === 'Ενεργή'
      ? { ...isolationForm, status: 'Ολοκληρωμένη' }
      : isolationForm
    await saveClinicalIsolation({ ...normalizedIsolation, id: normalizedIsolation.id || `ISO-${Date.now()}`, patientId: patient.id, patientName: patient.fullName, patientCode: patient.patientCode, department: patient.department, clinicalCaseId: activeCase.id })
    setIsolationForm(null); await refreshAll(activeCase.id)
  }
  async function removeCase(id) {
    if (activeCase && isClosedSurveillanceCase(activeCase)) return
    if (!confirmAction('Να διαγραφεί η επιτήρηση και οι συνδεδεμένες καταχωρίσεις της;')) return
    for(const x of samples.filter((x)=>String(x.clinicalCaseId)===String(id))) await deleteClinicalPatientSample(x.id)
    for(const x of isolations.filter((x)=>String(x.clinicalCaseId)===String(id))) await deleteClinicalIsolation(x.id)
    for(const x of attachments.filter((x)=>String(x.caseId)===String(id))) await deleteClinicalAttachment(x)
    await deleteClinicalSurveillanceCase(id); setActiveCase(null); setScreen('home'); await refreshAll(null)
  }

  async function saveNotifiableRecord(record) {
    const now = new Date().toISOString()
    await saveClinicalNotifiableDisease({
      ...record,
      id: record.id || `YDN-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.fullName,
      patientCode: patient.patientCode,
      department: record.department || patient.department,
      history: [...(record.history || []), { id: `h-${Date.now()}`, at: now, text: record.id ? 'Ενημέρωση δήλωσης από τον φάκελο ασθενούς' : 'Δημιουργία δήλωσης από τον φάκελο ασθενούς' }],
    })
    setNotifiableDiseases(await loadClinicalNotifiableDiseases(patient.id))
  }
  async function removeNotifiableRecord(id) {
    if (!confirmAction('Να διαγραφεί η δήλωση νοσήματος;')) return
    await deleteClinicalNotifiableDisease(id)
    setNotifiableDiseases(await loadClinicalNotifiableDiseases(patient.id))
  }

  function requestAttachment(target) { if (activeCase && isClosedSurveillanceCase(activeCase)) return; setAttachmentTarget(target); fileRef.current?.click() }
  async function uploadFile(event) {
    const file = event.target.files?.[0]
    if (!file || !attachmentTarget) return
    await uploadClinicalAttachment(patient.id, file, { patientKey, caseId: activeCase?.id || null, step: attachmentTarget.step, recordId: attachmentTarget.recordId || null, name: file.name, type: file.type, size: file.size, uploadedAt: new Date().toISOString() })
    event.target.value = ''; setAttachmentTarget(null); await refreshAll(activeCase?.id)
  }
  function filesFor(step, recordId = null) { return attachments.filter((item) => item.step === step && String(item.recordId || '') === String(recordId || '')) }

  const signals = getPatientSignals({ patient: patientForm, cases, samples, isolations })
  const timeline = buildPatientTimeline({ patient: patientForm, cases, samples, isolations, notifiableDiseases, language })

  return <WorkspaceShell className="pw-page-shell" shellClassName="pw-page">
    <WorkspaceHeader
      backLabel={screen === 'home' ? L('Επιστροφή στους ασθενείς', 'Back to patients') : L('Ένα βήμα πίσω', 'Back one step')}
      onBack={screen === 'home' ? () => navigate(APP_ROUTES.PATIENTS, isNewPatient ? undefined : { state: { returnFromDetail: true, listScope: APP_ROUTES.PATIENTS, highlightRowKey: patient.id } }) : returnToPatientHome}
      avatar={String(patientForm.fullName || 'Α').split(' ').slice(0, 2).map((x) => x[0]).join('')}
      eyebrow={isNewPatient ? L("ΝΕΟΣ ΑΣΘΕΝΗΣ", "NEW PATIENT") : L("ΦΑΚΕΛΟΣ ΑΣΘΕΝΟΥΣ", "PATIENT RECORD")}
      title={patientForm.fullName || (isNewPatient ? L('Νέος ασθενής', 'New patient') : L('Ασθενής', 'Patient'))}
      badges={<>{signals.positive && <Badge tone="danger">{L("Θετικό", "Positive")}</Badge>}{signals.resistance && <Badge tone="danger">{signals.resistance}</Badge>}{signals.isolation && <Badge tone="warning">{L("Απομόνωση", "Isolation")}</Badge>}{signals.pending && <Badge tone="neutral">{L("Εκκρεμές", "Pending")}</Badge>}{!signals.positive && !signals.isolation && !signals.pending && <Badge tone="success">{L("Χωρίς ενεργή ένδειξη", "No active flag")}</Badge>}</>}
      meta={`${patientForm.patientCode || L('Χωρίς κωδικό', 'No code')} · ${patientForm.room || L('Χωρίς κλίνη', 'No bed')}${patientForm.admissionDate ? ` · ${L('Εισαγωγή', 'Admission')} ${formatDate(patientForm.admissionDate)}` : ''}`}
      actions={isNewPatient ? null : <CoreIconButton label={L("Εκτύπωση καρτέλας ασθενούς", "Print patient record")} onClick={() => window.print()}><Printer size={17} /></CoreIconButton>}
    />
    <input ref={fileRef} type="file" hidden onChange={uploadFile} />
    <main className="pw-page-body">
      {screen === 'home' && <PatientHome
        patient={patientForm} isNew={isNewPatient} editing={editingPatient} setEditing={setEditingPatient} setPatient={setPatientForm} savePatient={savePatient} onCancelNew={() => navigate(APP_ROUTES.PATIENTS)}
        activeCases={activeCases} closedCases={closedCases} cases={cases} samples={samples} isolations={isolations} attachments={attachments} timeline={timeline} notifiableDiseases={notifiableDiseases}
        createCase={createCase} createSample={() => navigate(routeFor.laboratoryNewWorkspace(), { state: { prefillPatient: { id: patient.id, fullName: patient.fullName, patientCode: patient.patientCode, department: patient.department, room: patient.room, admissionDate: patient.admissionDate }, returnContext: { path: routeFor.patientWorkflow(patient.id), label: L('Πίσω στα δείγματα ασθενούς', 'Back to patient samples'), patientTab: 'samples' } } })} openCase={openCase} openCaseRecord={openCaseRecord}
        initialTab={location.state?.patientTab || 'summary'} highlightedSampleId={location.state?.highlightedSampleId || ''}
        openLaboratorySample={(sample) => navigate(routeFor.laboratoryRecordWorkspace(encodeURIComponent('Ασθενής'), encodeURIComponent(sample.id)), { state: { returnContext: { path: routeFor.patientWorkflow(patient.id), label: L('Πίσω στα δείγματα ασθενούς', 'Back to patient samples'), patientTab: 'samples', highlightedSampleId: sample.id } } })}
        upload={() => requestAttachment({ step: 'patient-records' })} deleteAttachment={async (id) => { if (!confirmAction('Να διαγραφεί το συνημμένο αρχείο;')) return; const item=attachments.find((x)=>String(x.id)===String(id)); if(item) await deleteClinicalAttachment(item); await refreshAll() }}
        saveNotifiable={saveNotifiableRecord} deleteNotifiable={removeNotifiableRecord}
      />}
      {screen === 'workspace' && activeCase && <CaseWorkspace
        patient={patientForm} data={activeCase} tab={workspaceTab} setTab={setWorkspaceTab} patch={patchCase} patchNested={patchNested} closeEpisode={closeEpisode} focusedRecord={focusedRecord}
        samples={caseSamples} sampleForm={sampleForm} setSampleForm={setSampleForm} beginSample={beginSample} saveSample={saveSample}
        isolations={caseIsolations} isolationForm={isolationForm} setIsolationForm={setIsolationForm} saveIsolation={saveIsolation}
        attachments={caseAttachments} filesFor={filesFor} upload={requestAttachment} deleteAttachment={async (id) => { if (isClosedSurveillanceCase(activeCase) || !confirmAction('Να διαγραφεί το συνημμένο αρχείο;')) return; const item=attachments.find((x)=>String(x.id)===String(id)); if(item) await deleteClinicalAttachment(item); await refreshAll(activeCase.id) }}
        removeCase={removeCase} removeSample={async (id) => {
          if (isClosedSurveillanceCase(activeCase)) return
          const descendants = getSampleDescendants(samples, id)
          const message = descendants.length ? (language === 'en' ? `This sample has ${descendants.length} linked follow-up${descendants.length === 1 ? '' : 's'}. Delete the entire chain?` : `Το δείγμα έχει ${descendants.length} συνδεδεμένο/α επανέλεγχο/ους. Να διαγραφεί ολόκληρη η αλυσίδα;`) : L('Να διαγραφεί το δείγμα;', 'Delete this sample?')
          if (confirmAction(message)) { for(const item of [...descendants, samples.find((item) => String(item.id) === String(id))].filter(Boolean)) await deletePatientSampleWithClinicalWorkflowAsync(item); await refreshAll(activeCase.id) }
        }}
        removeIsolation={async (id) => { if (isClosedSurveillanceCase(activeCase)) return; if (confirmAction('Να διαγραφεί η απομόνωση;')) { await deleteClinicalIsolation(id); await refreshAll(activeCase.id) } }}
      />}
    </main>
  </WorkspaceShell>
}

