import { APP_ROUTES, routeFor } from '../../config/routes'
import { notifyAction } from '../../components/core/feedback/index'
import { APP_EVENTS } from '../../core/events'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { required, useCoreForm } from '../../core/forms'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { FileText, FlaskConical, Printer, Save, ShieldCheck } from 'lucide-react'

import { Badge, Button, IconButton, WorkspaceBody, WorkspaceHeader, WorkspaceShell, WorkspaceTabs } from '../../components/core'
import {
  deleteLaboratoryRecordAsync,
  LABORATORY_SOURCE_EVENTS,
  loadAllLaboratoryRecords,
  loadAllLaboratoryRecordsAsync,
  upsertLaboratoryRecordAsync,
} from '../../services/laboratoryService'
import {
  loadPatientRegistry,
  PATIENT_CONFIG_EVENT,
  PATIENT_REGISTRY_EVENT,
} from '../../services/patientService'
import { deleteClinicalPatient, loadClinicalPatients, saveClinicalPatient } from '../../services/backend/clinicalDirectoryService'
import {
  EMPLOYEES_EVENT,
  employeeFullName,
  loadAllEmployees,
  upsertEmployee,
} from '../../services/employeesService'
import { LaboratoryAntibiogramSection, LaboratoryResultSection, LaboratorySampleSection, LaboratorySourceSection } from '../../components/laboratory/LaboratorySections'
import { withCanonicalLaboratoryStatus } from '../../core/constants/laboratory'
import { useI18n } from '../../i18n'
import { laboratoryDisplayValue } from './laboratoryPresentation'
import { loadCurrentProfile } from '../../services/profile/profileService'
import './LaboratoryWorkspacePage.css'

const emptyRecord = {
  sourceType: 'Ασθενής',
  patientId: '',
  employeeId: '',
  subjectName: '',
  subjectCode: '',
  patientName: '',
  patientCode: '',
  staffName: '',
  staffCode: '',
  department: '',
  room: '',
  admissionDate: '',
  sampleType: '',
  sampleReason: 'Καλλιέργεια',
  category: 'Αρχικό / νέο ανεξάρτητο δείγμα',
  parentSampleId: '',
  rootSampleId: '',
  isRecheck: false,
  collectionDate: '',
  collectionTime: '',
  receivedDate: '',
  sampleAcceptance: 'Αποδεκτό',
  rejectionReason: '',
  status: 'Εκκρεμεί',
  microorganism: '',
  resistance: '',
  microorganismResults: [],
  resultDate: '',
  resultNotes: '',
  validatedBy: '',
  validatedAt: '',
  criticalResult: false,
  criticalCommunicatedTo: '',
  criticalCommunicatedAt: '',
  criticalCommunicatedBy: '',
  antibiogram: [],
  notes: '',
}

const emptyNewPatient = {
  lastName: '',
  firstName: '',
  fatherName: '',
  gender: '',
  age: '',
  amka: '',
  patientCode: '',
  staffName: '',
  staffCode: '',
  department: '',
  room: '',
  admissionDate: '',
}




const emptyNewEmployee = {
  lastName: '',
  firstName: '',
  fatherName: '',
  employeeCode: '',
  professionalCategory: '',
  department: '',
  email: '',
  phone: '',
  status: 'Ενεργό',
}

const tabItems = [
  { id: 'sample', labelEl: 'Στοιχεία δείγματος', labelEn: 'Sample details', icon: <FlaskConical size={16} /> },
  { id: 'result', labelEl: 'Αποτέλεσμα', labelEn: 'Result', icon: <FileText size={16} /> },
  { id: 'antibiogram', labelEl: 'Αντιβιόγραμμα', labelEn: 'Antibiogram', icon: <ShieldCheck size={16} /> },
]

export default function LaboratoryWorkspacePage() {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const navigate = useNavigate()
  const location = useLocation()
  const returnContext = location.state?.returnContext
  const returnToOrigin = () => {
    if (returnContext?.path) {
      navigate(returnContext.path, { state: returnContext.patientTab ? { patientTab: returnContext.patientTab || 'samples', highlightedSampleId: returnContext.highlightedSampleId || record?.id || '' } : { returnFromDetail: true, listScope: returnContext.listScope || returnContext.path, highlightRowKey: returnContext.highlightRowKey || (record ? `${record.sourceType}:${record.id}` : '') } })
      return
    }
    navigate(APP_ROUTES.LABORATORY, { state: { returnFromDetail: true, listScope: APP_ROUTES.LABORATORY, highlightRowKey: record ? `${record.sourceType}:${record.id}` : '' } })
  }
  const params = useParams()
  const isNew = params.recordId === 'new' || !params.recordId
  const [record, setRecord] = useState(null)
  const { values: form, setValues: setForm, validate: validateLaboratoryForm } = useCoreForm({
    initialValues: { ...emptyRecord, collectionDate: todayIso(), receivedDate: todayIso() },
    validationSchema: {
      subjectName: required(L('Συμπληρώστε ή επιλέξτε πηγή δείγματος.', 'Enter or select a sample source.')),
      sampleType: required(L('Συμπληρώστε είδος δείγματος.', 'Enter sample type.')),
      collectionDate: required(L('Συμπληρώστε ημερομηνία λήψης.', 'Enter collection date.')),
    },
  })
  const [tab, setTab] = useState('sample')
  const [patients, setPatients] = useState(loadPatientRegistry)
  const [laboratoryRecords,setLaboratoryRecords]=useState(loadAllLaboratoryRecords)
  const [patientMode, setPatientMode] = useState('existing')
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [newPatient, setNewPatient] = useState(emptyNewPatient)
  const [employees, setEmployees] = useState(loadAllEmployees)
  const [employeeMode, setEmployeeMode] = useState('existing')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [newEmployee, setNewEmployee] = useState(emptyNewEmployee)

  useEffect(() => {
    setTab('sample')
  }, [params.recordId])

  async function refreshWorkspaceSources(){
    const [patientRows,employeeRows,labRows]=await Promise.all([
      loadClinicalPatients(),
      loadDirectoryEmployees(),
      loadAllLaboratoryRecordsAsync(),
    ])
    setPatients(patientRows)
    setEmployees(employeeRows)
    setLaboratoryRecords(labRows)
    return {patientRows,employeeRows,labRows}
  }

  useEffect(()=>{refreshWorkspaceSources().catch(()=>{})},[])

  useAppEvents([PATIENT_REGISTRY_EVENT, PATIENT_CONFIG_EVENT, EMPLOYEES_EVENT, APP_EVENTS.MASTER_DATA_UPDATED, ...LABORATORY_SOURCE_EVENTS], () => {
    refreshWorkspaceSources().catch(()=>{})
  }, { includeStorage: true })

  useEffect(() => {
    if (isNew) {
      const prefillPatient = location.state?.prefillPatient || null
      const prefillSourceType = location.state?.prefillSourceType || ''
      setRecord(null)
      setForm({
        ...emptyRecord,
        collectionDate: todayIso(),
        receivedDate: todayIso(),
        ...(prefillSourceType && !prefillPatient ? { sourceType: prefillSourceType, subjectName: '', subjectCode: '', department: '' } : {}),
        ...(prefillPatient ? {
          sourceType: 'Ασθενής',
          patientId: prefillPatient.id || '',
          subjectName: prefillPatient.fullName || '',
          subjectCode: prefillPatient.patientCode || '',
          patientName: prefillPatient.fullName || '',
          patientCode: prefillPatient.patientCode || '',
          department: prefillPatient.department || '',
          room: prefillPatient.room || '',
          admissionDate: prefillPatient.admissionDate || '',
          status: 'Εκκρεμεί',
        } : {}),
      })
      setSelectedPatientId(prefillPatient?.id || '')
      setPatientMode('existing')
      setNewPatient(emptyNewPatient)
      setSelectedEmployeeId('')
      setEmployeeMode('existing')
      setNewEmployee(emptyNewEmployee)
      return
    }

    const source = decodeURIComponent(params.sourceType || '')
    const id = decodeURIComponent(params.recordId || '')
    const found = laboratoryRecords.find((item) => item.id === id && (!source || item.sourceType === source))
    if (!found) return
    setRecord(found)
    const normalized = normalizeForForm(found)
    if (found.sourceType === 'Ασθενής') {
      const availablePatients = patients
      const matched = matchPatient(found, availablePatients)
      if (matched) {
        normalized.patientId = matched.id
        normalized.patientName = matched.fullName || normalized.patientName
        normalized.patientCode = matched.patientCode || normalized.patientCode
        normalized.subjectName = matched.fullName || normalized.subjectName
        normalized.subjectCode = matched.patientCode || normalized.subjectCode
        normalized.department = matched.department || normalized.department
        normalized.room = matched.room || normalized.room
        normalized.admissionDate = toIso(matched.admissionDate) || normalized.admissionDate
        setSelectedPatientId(matched.id)
      } else {
        setSelectedPatientId('')
      }
      setPatientMode('existing')
    } else if (found.sourceType === 'Προσωπικό') {
      const availableEmployees = employees
      const matched = matchEmployee(found, availableEmployees)
      if (matched) {
        normalized.employeeId = matched.id
        normalized.staffName = employeeFullName(matched)
        normalized.staffCode = matched.employeeCode || normalized.staffCode
        normalized.subjectName = employeeFullName(matched) || normalized.subjectName
        normalized.subjectCode = matched.employeeCode || normalized.subjectCode
        normalized.department = matched.department || normalized.department
        setSelectedEmployeeId(matched.id)
      } else {
        setSelectedEmployeeId('')
      }
      setEmployeeMode('existing')
    }
    setForm(normalized)
  }, [isNew, params.sourceType, params.recordId, location.state, laboratoryRecords, patients, employees])

  useEffect(()=>{
    if(isNew||!record)return
    const found=laboratoryRecords.find((item)=>item.id===record.id&&item.sourceType===record.sourceType)
    if(found){setRecord(found);setForm(normalizeForForm(found))}
  },[laboratoryRecords,isNew,record?.id,record?.sourceType])

  const selectedPatient = useMemo(
    () => patients.find((item) => String(item.id) === String(selectedPatientId)),
    [patients, selectedPatientId],
  )

  const selectedEmployee = useMemo(
    () => employees.find((item) => String(item.id) === String(selectedEmployeeId)),
    [employees, selectedEmployeeId],
  )

  const patientSampleOptions = useMemo(() => {
    if (form.sourceType !== 'Ασθενής' || !form.patientCode) return []
    return laboratoryRecords
      .filter((item) => item.sourceType === 'Ασθενής' && String(item.patientCode || '') === String(form.patientCode || '') && String(item.id || '') !== String(record?.id || ''))
      .sort((a, b) => String(b.collectionDate || '').localeCompare(String(a.collectionDate || '')))
      .map((item) => ({
        value: item.id,
        label: `${laboratoryDisplayValue(item.sampleType, language) || L('Δείγμα', 'Sample')} · ${item.collectionDate || L('χωρίς ημερομηνία', 'no date')} · ${laboratoryDisplayValue(item.status || 'Εκκρεμεί', language)}`,
      }))
  }, [form.sourceType, form.patientCode, record?.id, language, laboratoryRecords])

  function choosePatient(patientId) {
    setSelectedPatientId(patientId)
    const patient = patients.find((item) => String(item.id) === String(patientId))
    if (!patient) {
      setForm((current) => ({ ...current, patientId: '', subjectName: '', subjectCode: '', patientName: '', patientCode: '', department: '', room: '', admissionDate: '' }))
      return
    }
    setForm((current) => ({
      ...current,
      patientId: patient.id,
      subjectName: patient.fullName || '',
      subjectCode: patient.patientCode || '',
      patientName: patient.fullName || '',
      patientCode: patient.patientCode || '',
      department: patient.department || '',
      room: patient.room || '',
      admissionDate: patient.admissionDate || '',
    }))
  }

  async function persistNewPatient() {
    if (!newPatient.firstName.trim() || !newPatient.lastName.trim()) {
      notifyAction(L('Συμπληρώστε τουλάχιστον όνομα και επώνυμο ασθενούς.', 'Enter at least patient first and last name.'))
      return null
    }
    const requestedCode = String(newPatient.patientCode || '').trim()
    const requestedAmka = String(newPatient.amka || '').trim()
    const duplicate = patients.find((item) =>
      (requestedCode && String(item.patientCode || '').trim() === requestedCode) ||
      (requestedAmka && String(item.amka || '').trim() === requestedAmka)
    )
    if (duplicate) {
      const sameCode = requestedCode && String(duplicate.patientCode || '').trim() === requestedCode
      notifyAction(L(
        `Υπάρχει ήδη ασθενής ${duplicate.fullName || ''} με τον ίδιο ${sameCode ? 'κωδικό ασθενούς' : 'ΑΜΚΑ'}. Επιλέξτε την υπάρχουσα εγγραφή.`,
        `A patient ${duplicate.fullName || ''} already exists with the same ${sameCode ? 'patient code' : 'AMKA'}. Select the existing record.`
      ))
      return null
    }
    const saved = await saveClinicalPatient({
      ...newPatient,
      id: `patient-${Date.now()}`,
      patientCode: newPatient.patientCode.trim() || createPatientCode(patients),
      fullName: `${newPatient.firstName.trim()} ${newPatient.lastName.trim()}`,
      status: 'Νοσηλεύεται',
    })
    return saved
  }


  function chooseEmployee(employeeId) {
    setSelectedEmployeeId(employeeId)
    const employee = employees.find((item) => String(item.id) === String(employeeId))
    if (!employee) {
      setForm((current) => ({ ...current, employeeId: '', staffName: '', staffCode: '', subjectName: '', subjectCode: '', department: '' }))
      return
    }
    const name = employeeFullName(employee)
    setForm((current) => ({
      ...current,
      sourceType: 'Προσωπικό',
      employeeId: employee.id,
      staffName: name,
      staffCode: employee.employeeCode || '',
      subjectName: name,
      subjectCode: employee.employeeCode || '',
      department: employee.department || '',
    }))
  }

  async function persistNewEmployee() {
    if (!newEmployee.firstName.trim() || !newEmployee.lastName.trim()) {
      notifyAction(L('Συμπληρώστε τουλάχιστον όνομα και επώνυμο εργαζομένου.', 'Enter at least staff first and last name.'))
      return null
    }
    const saved = await saveDirectoryEmployee({
      ...newEmployee,
      id: `EMP-${Date.now()}`,
      employeeCode: newEmployee.employeeCode.trim() || createEmployeeCode(employees),
      status: newEmployee.status || 'Ενεργό',
    })
    setEmployees(await loadDirectoryEmployees())
    setSelectedEmployeeId(saved.id)
    setEmployeeMode('existing')
    setNewEmployee(emptyNewEmployee)
    return saved
  }

  async function createAndLinkEmployee() {
    const saved = await persistNewEmployee()
    if (!saved) return
    const name = employeeFullName(saved)
    setForm((current) => ({
      ...current,
      sourceType: 'Προσωπικό',
      employeeId: saved.id,
      staffName: name,
      staffCode: saved.employeeCode || '',
      subjectName: name,
      subjectCode: saved.employeeCode || '',
      department: saved.department || '',
    }))
  }

  async function save() {
    let payload = { ...form }
    let shouldCreatePatientWithSample = false

    // A new patient entered from Laboratory is not persisted by an inline
    // "create/link" action. The main Save validates the whole laboratory
    // record first and then persists patient + sample as one user action.
    if (payload.sourceType === 'Ασθενής' && !payload.patientId && patientMode === 'new') {
      if (!newPatient.firstName.trim() || !newPatient.lastName.trim()) {
        notifyAction(L('Συμπληρώστε τουλάχιστον όνομα και επώνυμο ασθενούς.', 'Enter at least patient first and last name.'))
        return
      }
      const requestedCode = String(newPatient.patientCode || '').trim()
      const requestedAmka = String(newPatient.amka || '').trim()
      const duplicate = patients.find((item) =>
        (requestedCode && String(item.patientCode || '').trim() === requestedCode) ||
        (requestedAmka && String(item.amka || '').trim() === requestedAmka)
      )
      if (duplicate) {
        const sameCode = requestedCode && String(duplicate.patientCode || '').trim() === requestedCode
        notifyAction(L(
          `Υπάρχει ήδη ασθενής ${duplicate.fullName || ''} με τον ίδιο ${sameCode ? 'κωδικό ασθενούς' : 'ΑΜΚΑ'}. Επιλέξτε την υπάρχουσα εγγραφή.`,
          `A patient ${duplicate.fullName || ''} already exists with the same ${sameCode ? 'patient code' : 'AMKA'}. Select the existing record.`
        ))
        return
      }
      const previewName = `${newPatient.firstName.trim()} ${newPatient.lastName.trim()}`
      payload = {
        ...payload,
        subjectName: previewName,
        patientName: previewName,
        subjectCode: requestedCode || L('Αυτόματος κωδικός', 'Automatic code'),
        patientCode: requestedCode || '',
        department: newPatient.department || '',
        room: newPatient.room || '',
        admissionDate: newPatient.admissionDate || '',
      }
      shouldCreatePatientWithSample = true
    }

    if (payload.sourceType === 'Ασθενής' && !payload.patientId && !shouldCreatePatientWithSample) {
      notifyAction(L('Επιλέξτε ασθενή ή δημιουργήστε νέο ασθενή.', 'Select a patient or create a new patient.'))
      return
    }

    if (payload.sourceType === 'Προσωπικό' && !payload.employeeId && employeeMode === 'new') {
      const savedEmployee = await persistNewEmployee()
      if (!savedEmployee) return
      const name = employeeFullName(savedEmployee)
      payload = {
        ...payload,
        employeeId: savedEmployee.id,
        staffName: name,
        staffCode: savedEmployee.employeeCode || '',
        subjectName: name,
        subjectCode: savedEmployee.employeeCode || '',
        department: savedEmployee.department || '',
      }
    }

    if (payload.sourceType === 'Προσωπικό' && !payload.employeeId) {
      notifyAction(L('Επιλέξτε εργαζόμενο ή δημιουργήστε νέο εργαζόμενο.', 'Select a staff member or create a new one.'))
      return
    }
    const formErrors = validateLaboratoryForm(payload)
    if (Object.keys(formErrors).length) {
      notifyAction(Object.values(formErrors)[0] || L('Συμπληρώστε τα υποχρεωτικά πεδία.', 'Complete the required fields.'))
      return
    }
    if (payload.sampleAcceptance === 'Απορρίφθηκε' && !String(payload.rejectionReason || '').trim()) {
      notifyAction(L('Συμπληρώστε τον λόγο απόρριψης του δείγματος.', 'Enter the sample rejection reason.'))
      setTab('sample')
      return
    }
    if (payload.sampleAcceptance === 'Απορρίφθηκε' && payload.status !== 'Εκκρεμεί') {
      notifyAction(L('Απορριφθέν δείγμα δεν μπορεί να οριστικοποιηθεί με εργαστηριακό αποτέλεσμα.', 'A rejected sample cannot be finalized with a laboratory result.'))
      setTab('sample')
      return
    }
    const organismRows = normalizeMicroorganismRows(payload)
    payload = { ...payload, microorganismResults: organismRows, microorganism: organismRows[0]?.name || '', resistance: organismRows[0]?.resistance || '' }
    if (payload.sourceType === 'Ασθενής' && payload.category === 'Επανέλεγχος' && !payload.parentSampleId) {
      notifyAction(L('Ο επανέλεγχος πρέπει να συνδεθεί με προηγούμενο δείγμα του ίδιου ασθενούς.', 'The follow-up must be linked to a previous sample from the same patient.'))
      return
    }
    if (payload.status === 'Θετικό' && !organismRows.some((row) => String(row.name || '').trim())) {
      notifyAction(L('Για θετικό αποτέλεσμα απαιτείται τουλάχιστον ένας μικροοργανισμός.', 'A positive result requires at least one microorganism.'))
      setTab('result')
      return
    }
    if (payload.status === 'Αρνητικό') {
      payload = { ...payload, microorganismResults: [], microorganism: '', resistance: '', antibiogram: [] }
    }
    if (payload.status !== 'Εκκρεμεί' && !payload.resultDate) {
      payload = { ...payload, resultDate: todayIso() }
    }
    if (payload.status !== 'Εκκρεμεί') {
      const profile = loadCurrentProfile(language)
      payload = {
        ...payload,
        validatedAt: payload.validatedAt || new Date().toISOString(),
        validatedBy: payload.validatedBy || profile?.displayName || profile?.username || L('Εργαστήριο', 'Laboratory'),
      }
    } else {
      payload = { ...payload, validatedAt: '', validatedBy: '' }
    }
    if (payload.criticalResult) {
      if (!String(payload.criticalCommunicatedTo || '').trim() || !payload.criticalCommunicatedAt) {
        notifyAction(L('Για κρίσιμο αποτέλεσμα καταγράψτε σε ποιον και πότε γνωστοποιήθηκε.', 'For a critical result, record who was notified and when.'))
        setTab('result')
        return
      }
      const profile = loadCurrentProfile(language)
      payload = {
        ...payload,
        criticalCommunicatedBy: payload.criticalCommunicatedBy || profile?.displayName || profile?.username || L('Εργαστήριο', 'Laboratory'),
      }
    } else {
      payload = { ...payload, criticalCommunicatedTo: '', criticalCommunicatedAt: '', criticalCommunicatedBy: '' }
    }

    let createdPatient = null
    if (shouldCreatePatientWithSample) {
      createdPatient = await persistNewPatient()
      if (!createdPatient) return
      payload = {
        ...payload,
        patientId: createdPatient.id,
        subjectName: createdPatient.fullName,
        subjectCode: createdPatient.patientCode,
        patientName: createdPatient.fullName,
        patientCode: createdPatient.patientCode,
        department: createdPatient.department || '',
        room: createdPatient.room || '',
        admissionDate: createdPatient.admissionDate || '',
      }
    }

    let saved
    try {
      saved = await upsertLaboratoryRecordAsync(withCanonicalLaboratoryStatus({
        ...payload,
        id: record?.id || `${sourcePrefix(payload.sourceType)}-${Date.now()}`,
      }))
    } catch (error) {
      if (createdPatient?.id) {
        try { await deleteClinicalPatient(createdPatient.id) } catch {}
        await refreshWorkspaceSources().catch(() => {})
      }
      notifyAction(error?.message || L('Δεν ήταν δυνατή η αποθήκευση της εργαστηριακής εγγραφής.', 'The laboratory record could not be saved.'))
      return
    }
    if (createdPatient?.id) {
      setPatients(await loadClinicalPatients())
      setSelectedPatientId(createdPatient.id)
      setPatientMode('existing')
      setNewPatient(emptyNewPatient)
    }
    setForm(normalizeForForm(saved))
    setRecord({ ...saved, sourceType: payload.sourceType })
    navigate(routeFor.laboratoryRecordWorkspace(encodeURIComponent(payload.sourceType), encodeURIComponent(saved.id)), { replace: true, state: location.state })
  }


  if (!isNew && !record) {
    return <div className="lw-page"><div className="lw-missing"><p>{L('Η εργαστηριακή εγγραφή δεν βρέθηκε.', 'Laboratory record not found.')}</p><Button onClick={returnToOrigin}>{returnContext?.label || L('Επιστροφή στο Εργαστήριο', 'Back to Laboratory')}</Button></div></div>
  }

  return (
    <WorkspaceShell className="lw-page">
      <WorkspaceHeader
        backLabel={returnContext?.label || L('Πίσω στο Εργαστήριο', 'Back to Laboratory')}
        onBack={returnToOrigin}
        eyebrow={L("ΕΡΓΑΣΤΗΡΙΑΚΗ ΕΓΓΡΑΦΗ", "LABORATORY RECORD")}
        title={record?.id || L('Νέα εργαστηριακή εγγραφή', 'New laboratory record')}
        badges={<><Badge tone={form.status === 'Θετικό' ? 'danger' : form.status === 'Αρνητικό' ? 'success' : 'warning'}>{laboratoryDisplayValue(form.status || 'Εκκρεμεί', language)}</Badge>{form.resistance ? <Badge tone="danger">{form.resistance}</Badge> : null}{form.relatedInfection ? <Badge tone="neutral">Case {form.relatedInfection}</Badge> : null}</>}
        meta={[laboratoryDisplayValue(form.sourceType, language), form.subjectName, laboratoryDisplayValue(form.sampleType, language)].filter(Boolean).join(' · ') || L('Νέα καταχώρηση', 'New record')}
        actions={<><IconButton label={L("Εκτύπωση εργαστηριακής εγγραφής", "Print laboratory record")} onClick={() => window.print()}><Printer size={17} /></IconButton><Button icon={<Save size={16} />} onClick={save}>{L('Αποθήκευση', 'Save')}</Button></>}
      />
      <WorkspaceTabs items={tabItems.map((item) => ({ ...item, label: language === 'en' ? item.labelEn : item.labelEl }))} value={tab} onChange={setTab} ariaLabel={L("Εργαστηριακή εγγραφή", "Laboratory record")} />
      <WorkspaceBody className="lw-body">
        {tab === 'sample' && <div className="lw-stack">
          {isNew ? <LaboratorySourceSection
            form={form} setForm={setForm}
            patients={patients} patientMode={patientMode} setPatientMode={setPatientMode} selectedPatientId={selectedPatientId} selectedPatient={selectedPatient} choosePatient={choosePatient} newPatient={newPatient} setNewPatient={setNewPatient}
            employees={employees} employeeMode={employeeMode} setEmployeeMode={setEmployeeMode} selectedEmployeeId={selectedEmployeeId} selectedEmployee={selectedEmployee} chooseEmployee={chooseEmployee} newEmployee={newEmployee} setNewEmployee={setNewEmployee} createAndLinkEmployee={createAndLinkEmployee}
            employeeFullName={employeeFullName}
            onSourceChange={(value) => { if (value !== 'Ασθενής') setSelectedPatientId(''); if (value !== 'Προσωπικό') setSelectedEmployeeId('') }}
          /> : null}
          <LaboratorySampleSection form={form} setForm={setForm} isNew={isNew} patientSampleOptions={patientSampleOptions} />
        </div>}
        {tab === 'result' && <LaboratoryResultSection form={form} setForm={setForm} normalizeMicroorganismRows={normalizeMicroorganismRows} updateMicroorganism={updateMicroorganism} />}
        {tab === 'antibiogram' && <LaboratoryAntibiogramSection form={form} setForm={setForm} updateAntibiogram={updateAntibiogram} />}
      </WorkspaceBody>
    </WorkspaceShell>
  )

  function updateMicroorganism(index, patch) {
    setForm((current) => {
      const rows = normalizeMicroorganismRows(current).map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
      return { ...current, microorganismResults: rows, microorganism: rows[0]?.name || '', resistance: rows[0]?.resistance || '' }
    })
  }

  function updateAntibiogram(index, patch) {
    setForm((current) => ({
      ...current,
      antibiogram: (current.antibiogram || []).map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }))
  }
}


function normalizeForForm(record = {}) {
  return {
    ...emptyRecord,
    ...record,
    patientId: record.patientId || '',
    employeeId: record.employeeId || '',
    staffName: record.staffName || (record.sourceType === 'Προσωπικό' ? record.subjectName : '') || '',
    staffCode: record.staffCode || (record.sourceType === 'Προσωπικό' ? record.subjectCode : '') || '',
    subjectName: record.subjectName || record.patientName || record.staffName || record.samplingPoint || '',
    microorganismResults: normalizeMicroorganismRows(record),
    subjectCode: record.subjectCode || record.patientCode || record.staffCode || record.sampleCode || '',
    patientName: record.patientName || record.subjectName || '',
    patientCode: record.patientCode || record.subjectCode || '',
    status: withCanonicalLaboratoryStatus(record).status,
    collectionDate: toIso(record.collectionDate),
    receivedDate: toIso(record.receivedDate),
    resultDate: toIso(record.resultDate),
    admissionDate: toIso(record.admissionDate),
    antibiogram: Array.isArray(record.antibiogram) ? record.antibiogram : [],
  }
}

function toIso(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const [day, month, year] = String(value).split('/')
  if (!year) return value
  return `${year}-${month}-${day}`
}

function normalizeMicroorganismRows(record = {}) {
  if (Array.isArray(record.microorganismResults) && record.microorganismResults.length) return record.microorganismResults.map((item, index) => typeof item === 'string' ? { id: `legacy-${index}`, name: item, resistance: '' } : { ...item, name: item.name || item.microorganism || '' })
  if (Array.isArray(record.microorganisms) && record.microorganisms.length) return record.microorganisms.map((item, index) => typeof item === 'string' ? { id: `legacy-${index}`, name: item, resistance: '' } : { ...item, name: item.name || item.microorganism || '' })
  if (record.microorganism) return [{ id: 'legacy-0', name: record.microorganism, resistance: record.resistance || '' }]
  return []
}

function todayIso() { return new Date().toISOString().slice(0, 10) }

function sourcePrefix(sourceType) {
  if (sourceType === 'Προσωπικό') return 'STAFF'
  if (sourceType === 'Περιβάλλον') return 'ENV'
  if (sourceType === 'Νερό') return 'WATER'
  return 'PS'
}

function createPatientCode(patients) {
  const used = new Set(patients.map((item) => item.patientCode).filter(Boolean))
  let number = Math.max(1, patients.length + 1)
  let code = `PAT-${String(number).padStart(6, '0')}`
  while (used.has(code)) {
    number += 1
    code = `PAT-${String(number).padStart(6, '0')}`
  }
  return code
}

function normalizeName(value = '') { return String(value).trim().toLocaleLowerCase('el-GR') }

function matchPatient(record, patients) {
  return patients.find((patient) =>
    (record.patientId && String(patient.id) === String(record.patientId)) ||
    (record.patientCode && patient.patientCode && String(patient.patientCode) === String(record.patientCode)) ||
    ((record.patientName || record.subjectName) && normalizeName(patient.fullName) === normalizeName(record.patientName || record.subjectName))
  ) || null
}

function matchEmployee(record, employees) {
  return employees.find((employee) =>
    (record.employeeId && String(employee.id) === String(record.employeeId)) ||
    ((record.staffCode || record.subjectCode) && employee.employeeCode && String(employee.employeeCode) === String(record.staffCode || record.subjectCode)) ||
    ((record.staffName || record.subjectName) && normalizeName(employeeFullName(employee)) === normalizeName(record.staffName || record.subjectName))
  ) || null
}

function createEmployeeCode(employees) {
  const used = new Set(employees.map((item) => item.employeeCode).filter(Boolean))
  let number = Math.max(1, employees.length + 1)
  let code = `EMP-${String(number).padStart(3, '0')}`
  while (used.has(code)) {
    number += 1
    code = `EMP-${String(number).padStart(3, '0')}`
  }
  return code
}

