import { APP_ROUTES, routeFor } from '../../config/routes'
import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { ChevronRight, FlaskConical, GraduationCap, KeyRound, Printer, Trash2, Users } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, IconButton, WorkspaceBody, WorkspaceHeader, WorkspaceShell, WorkspaceTabs } from '../../components/core'
import { employeeFullName, loadAllEmployees, EMPLOYEES_EVENT } from '../../services/employeesService'
import { deleteDirectoryEmployee, deleteEmployeeOccupationalVisit, loadDirectoryEmployees, loadDirectoryUserAccounts, loadEmployeeOccupationalVisits, saveDirectoryEmployee, saveEmployeeOccupationalVisit } from '../../services/backend/directoryService'
import { loadStaffVaccinations, STAFF_VACCINATIONS_EVENT } from '../../services/preventionService'
import { deletePreventionRecord, loadPreventionRecords, savePreventionRecord } from '../../services/backend/preventionBackendService'
import { loadStaffSamples, STAFF_SAMPLES_EVENT } from '../../services/laboratorySourcesService'
import { loadCommittees, loadTraining, ORGANIZATION_EVENT } from '../../services/organizationService'
import { loadUserAccounts, USER_ACCOUNTS_EVENT } from '../../services/userAccountsService'
import { useI18n } from '../../i18n'
import { employeeDisplayValue } from './employeePresentation'
import { EmployeeHealthTab, ProfileTab, ListTab, formatDate, hasProfileData, pickUnsaved, accountStatusLabel } from './EmployeeWorkspaceSections'
import './EmployeeWorkspacePage.css'

const TABS = [
  { id: 'profile', el: 'Στοιχεία', en: 'Profile' },
  { id: 'health', el: 'Υγεία εργαζομένου', en: 'Employee Health' },
  { id: 'training', el: 'Εκπαιδεύσεις', en: 'Training' },
  { id: 'samples', el: 'Καλλιέργειες', en: 'Cultures' },
  { id: 'committees', el: 'Επιτροπές', en: 'Committees' },
]

export default function EmployeeWorkspacePage() {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const isNewEmployee = String(employeeId) === 'new'
  const emptyEmployee = {firstName:'',lastName:'',fatherName:'',gender:'',employeeCode:'',department:'',professionalCategory:'',email:'',phone:'',hireDate:'',status:'Ενεργό',notes:'',vaccinations:[]}
  const initialEmployee = isNewEmployee ? emptyEmployee : (loadAllEmployees().find((item) => String(item.id) === String(employeeId)) || null)
  const [employee, setEmployee] = useState(initialEmployee)
  const [form, setForm] = useState(initialEmployee || {})
  const [tab, setTab] = useState('profile')
  const [editingProfile, setEditingProfile] = useState(() => isNewEmployee || !hasProfileData(employee))
  const editingProfileRef = useRef(editingProfile)
  const [profileSaving, setProfileSaving] = useState(false)
  const [vaccinations, setVaccinations] = useState(loadStaffVaccinations)
  const [healthLoading, setHealthLoading] = useState(false)
  const [samples, setSamples] = useState(loadStaffSamples)
  const [training, setTraining] = useState(loadTraining)
  const [committees, setCommittees] = useState(loadCommittees)
  const [userAccount, setUserAccount] = useState(() => loadUserAccounts().find((item) => String(item.employeeId) === String(employeeId)) || null)
  const [occupationalDraft, setOccupationalDraft] = useState(null)
  const [healthView, setHealthView] = useState('vaccinations')
  const [selectedVaccination, setSelectedVaccination] = useState(null)
  const [lastVaccinationId, setLastVaccinationId] = useState('')
  const [occupationalVisitsState,setOccupationalVisitsState]=useState(()=>Array.isArray(employee?.occupationalVisits)?employee.occupationalVisits:[])

  useEffect(() => { editingProfileRef.current = editingProfile }, [editingProfile])

  useEffect(() => {
    setTab('profile')
    setHealthView('vaccinations')
    setSelectedVaccination(null)
    setOccupationalDraft(null)
    setEditingProfile(isNewEmployee)
  }, [employeeId])

  async function refreshEmployeeDirectory({preserveDraft=true}={}){
    if(isNewEmployee) return employee
    const employeeRows=await loadDirectoryEmployees()
    const next=employeeRows.find((item)=>String(item.id)===String(employeeId))||null
    setEmployee(next)
    setForm((current)=>next
      ? (preserveDraft?{...next,...pickUnsaved(current,next)}:next)
      : {})
    // Background refreshes must never close a profile the user is actively editing.
    setEditingProfile((current)=>current || !(next&&hasProfileData(next)))
    const userRows=await loadDirectoryUserAccounts()
    setUserAccount(userRows.find((item)=>String(item.employeeId)===String(employeeId))||null)
    try{setOccupationalVisitsState(await loadEmployeeOccupationalVisits(employeeId))}catch{}
    return next
  }

  useEffect(()=>{
    if(isNewEmployee){ setEmployee({...emptyEmployee}); setForm({...emptyEmployee}); setEditingProfile(true); return }
    let active=true
    setHealthLoading(true)
    Promise.all([
      loadDirectoryEmployees(),
      loadDirectoryUserAccounts(),
      loadEmployeeOccupationalVisits(employeeId),
      loadPreventionRecords('staff_vaccination'),
    ])
      .then(([employeeRows,userRows,occupationalRows,vaccinationRows])=>{
        if(!active)return
        const next=employeeRows.find((item)=>String(item.id)===String(employeeId))||null
        setEmployee(next)
        setForm(next||{})
        setEditingProfile((current)=>current || !(next&&hasProfileData(next)))
        setUserAccount(userRows.find((item)=>String(item.employeeId)===String(employeeId))||null)
        setOccupationalVisitsState(occupationalRows)
        setVaccinations(vaccinationRows)
      })
      .catch((error)=>{
        console.error('Employee workspace hydration failed',error)
        if(active) notifyAction(String(error?.message||'') || L('Η φόρτωση των δεδομένων προσωπικού από το Supabase απέτυχε.', 'Failed to load staff data from Supabase.'))
      })
      .finally(()=>{if(active)setHealthLoading(false)})
    return()=>{active=false}
  },[employeeId,isNewEmployee])

  // Keep an active edit draft completely isolated from background directory hydration.
  // Employee/user-account events may update the record only while the profile is read-only.
  useAppEvents([EMPLOYEES_EVENT, USER_ACCOUNTS_EVENT], () => {
    if (!editingProfileRef.current) refreshEmployeeDirectory({ preserveDraft: false }).catch(()=>{})
  })

  // Domain-specific caches can refresh independently without touching the employee draft.
  useAppEvents([STAFF_VACCINATIONS_EVENT], () => setVaccinations(loadStaffVaccinations()))
  useAppEvents([STAFF_SAMPLES_EVENT], () => setSamples(loadStaffSamples()))
  useAppEvents([ORGANIZATION_EVENT], () => {
    setTraining(loadTraining())
    setCommittees(loadCommittees())
  })

  const employeeVaccinations = useMemo(() => {
    const central = vaccinations.filter((item) => String(item.employeeId || '') === String(employeeId))
    if (central.length) return central
    return (employee?.vaccinations || []).map((item) => ({ ...item, employeeId, employeeName: employeeFullName(employee), legacy: true }))
  }, [vaccinations, employee, employeeId])

  const employeeSamples = useMemo(() => samples.filter((item) => {
    const byId = String(item.employeeId || item.subjectId || '') === String(employeeId)
    const byName = String(item.employeeName || item.staffName || item.personName || '') === String(employeeFullName(employee))
    return byId || byName
  }), [samples, employee, employeeId])

  const employeeTraining = useMemo(() => training.flatMap((item) => (item.attendance || [])
    .filter((attendance) => String(attendance.employeeId || '') === String(employeeId))
    .map((attendance) => ({ ...attendance, trainingId: item.id, title: item.title, category: item.category, date: item.date, trainer: item.trainer, validUntil: item.validUntil }))), [training, employeeId])

  const employeeCommittees = useMemo(
    () => committees.filter((committee) => (committee.memberIds || []).map(String).includes(String(employeeId))),
    [committees, employeeId],
  )

  const occupationalVisits = occupationalVisitsState

  if (!employee && !isNewEmployee) {
    return <div className="ew-page"><div className="ew-missing">
      <p>{L('Ο εργαζόμενος δεν βρέθηκε.', 'Employee not found.')}</p>
      <Button onClick={() => navigate(APP_ROUTES.EMPLOYEES)}>{L('Επιστροφή', 'Back')}</Button>
    </div></div>
  }

  async function save() {
    if (profileSaving) return
    if (!String(form.firstName || '').trim() || !String(form.lastName || '').trim()) {
      notifyAction(L('Συμπληρώστε όνομα και επώνυμο.', 'Enter first and last name.'))
      return
    }
    try {
      setProfileSaving(true)
      const saved = await saveDirectoryEmployee({ ...(isNewEmployee?{}:employee), ...form })
      setEmployee(saved)
      setForm(saved)
      editingProfileRef.current = false
      setEditingProfile(false)
      notifyAction(isNewEmployee ? L('Ο εργαζόμενος δημιουργήθηκε και αποθηκεύτηκε στο Supabase.', 'Employee created and saved to Supabase.') : L('Τα στοιχεία του εργαζομένου αποθηκεύτηκαν στο Supabase.', 'Employee details saved to Supabase.'))
      if(isNewEmployee){
        navigate(routeFor.employeeWorkspace(saved.id), { replace:true, state:{ createdEmployee:true } })
      }
    } catch (error) {
      console.error('Employee save failed', error)
      const message=String(error?.message||'').trim()
      notifyAction(message || L('Η αποθήκευση του εργαζομένου απέτυχε.', 'Employee save failed.'))
    } finally {
      setProfileSaving(false)
    }
  }

  async function remove() {
    if (!confirmAction(L('Να διαγραφεί ο εργαζόμενος;', 'Delete this employee?'))) return
    await deleteDirectoryEmployee(employee.id)
    navigate(APP_ROUTES.EMPLOYEES)
  }

  async function saveVaccinationRecord(event) {
    event?.preventDefault?.()
    if (!selectedVaccination?.vaccine || !selectedVaccination?.date) {
      notifyAction(L('Συμπληρώστε εμβόλιο και ημερομηνία.', 'Enter vaccine and date.'))
      return
    }
    try {
      setHealthLoading(true)
      const saved = await savePreventionRecord('staff_vaccination', {
        ...selectedVaccination,
        employeeId: employee.id,
        employeeName: employeeFullName(employee),
        department: employee.department || '',
        professionalCategory: employee.professionalCategory || '',
      })
      setVaccinations(await loadPreventionRecords('staff_vaccination'))
      setLastVaccinationId(saved.id)
      setSelectedVaccination(null)
      notifyAction(L('Ο εμβολιασμός αποθηκεύτηκε.', 'Vaccination saved.'))
    } catch(error) {
      console.error('Employee vaccination save failed',error)
      notifyAction(String(error?.message||'') || L('Η αποθήκευση του εμβολιασμού απέτυχε.', 'Vaccination save failed.'))
    } finally { setHealthLoading(false) }
  }

  async function removeVaccinationRecord(id) {
    if (!id || !confirmAction(L('Να διαγραφεί ο εμβολιασμός;', 'Delete this vaccination record?'))) return
    await deletePreventionRecord('staff_vaccination', id)
    setVaccinations(await loadPreventionRecords('staff_vaccination'))
    setSelectedVaccination(null)
  }

  async function saveOccupationalVisit(event) {
    event.preventDefault()
    if (!occupationalDraft?.date) {
      notifyAction(L('Συμπληρώστε ημερομηνία εξέτασης.', 'Enter examination date.'))
      return
    }
    try {
      setHealthLoading(true)
      await saveEmployeeOccupationalVisit(employee.id,occupationalDraft)
      setOccupationalVisitsState(await loadEmployeeOccupationalVisits(employee.id))
      setOccupationalDraft(null)
      notifyAction(L('Η επίσκεψη στον ιατρό εργασίας αποθηκεύτηκε.', 'Occupational-health visit saved.'))
    } catch(error) {
      console.error('Occupational-health save failed',error)
      notifyAction(String(error?.message||'') || L('Η αποθήκευση της επίσκεψης απέτυχε.', 'Occupational-health visit save failed.'))
    } finally { setHealthLoading(false) }
  }

  async function removeOccupationalVisit(id) {
    if (!confirmAction(L('Να διαγραφεί η καταχώρηση ιατρού εργασίας;', 'Delete this occupational-health record?'))) return
    await deleteEmployeeOccupationalVisit(employee.id,id)
    setOccupationalVisitsState(await loadEmployeeOccupationalVisits(employee.id))
    setOccupationalDraft(null)
  }

  const tabItems = (isNewEmployee ? TABS.filter(item=>item.id==='profile') : TABS).map((item) => ({
    id: item.id,
    label: language === 'en' ? item.en : item.el,
    count: item.id === 'health'
      ? employeeVaccinations.length + occupationalVisits.length
      : item.id === 'training'
        ? employeeTraining.length
        : item.id === 'samples'
          ? employeeSamples.length
            : item.id === 'committees'
              ? employeeCommittees.length
              : undefined,
  }))

  return (
    <WorkspaceShell className="ew-page">
      <WorkspaceHeader
        backLabel={(selectedVaccination || occupationalDraft) ? L('Ένα βήμα πίσω', 'Back one step') : L('Επιστροφή στους εργαζομένους', 'Back to employees')}
        onBack={() => {
          if (selectedVaccination) { setSelectedVaccination(null); return }
          if (occupationalDraft) { setOccupationalDraft(null); return }
          navigate(APP_ROUTES.EMPLOYEES, isNewEmployee ? undefined : { state: { returnFromDetail: true, listScope: APP_ROUTES.EMPLOYEES, highlightRowKey: employee.id } })
        }}
        eyebrow={isNewEmployee ? L('ΝΕΟΣ ΕΡΓΑΖΟΜΕΝΟΣ','NEW EMPLOYEE') : L('ΚΑΡΤΕΛΑ ΕΡΓΑΖΟΜΕΝΟΥ', 'EMPLOYEE RECORD')}
        title={employeeFullName(form) || (isNewEmployee ? L('Νέος εργαζόμενος','New employee') : L('Εργαζόμενος', 'Employee'))}
        badges={<>
          <Badge tone={form.status === 'Ανενεργό' ? 'neutral' : 'success'}>{employeeDisplayValue(form.status || 'Ενεργό', language)}</Badge>
          <Badge tone={userAccount?.status === 'active' ? 'success' : userAccount ? 'warning' : 'neutral'}>
            {userAccount
              ? `${L('Λογαριασμός', 'Account')}: ${accountStatusLabel(userAccount.status, language)}`
              : L('Χωρίς λογαριασμό', 'No account')}
          </Badge>
        </>}
        meta={[form.professionalCategory, form.department, form.employeeCode].filter(Boolean).join(' · ')}
        actions={isNewEmployee ? null : <>
          <Button
            variant="secondary"
            size="sm"
            icon={<KeyRound size={16} />}
            onClick={() => navigate(`${APP_ROUTES.STUDIO_USERS}?employeeId=${encodeURIComponent(employee.id)}`, { state: { fromEmployeeAccount: true } })}
          >
            {userAccount ? L('Διαχείριση λογαριασμού', 'Manage account') : L('Δημιουργία λογαριασμού', 'Create account')}
          </Button>
          <IconButton label={L('Εκτύπωση καρτέλας εργαζομένου', 'Print employee record')} onClick={() => window.print()}><Printer size={17} /></IconButton>
          <IconButton variant="danger" label={L('Διαγραφή εργαζομένου', 'Delete employee')} onClick={remove}><Trash2 size={17} /></IconButton>
        </>}
      />

      <WorkspaceTabs ariaLabel={L('Καρτέλα εργαζομένου', 'Employee record')} value={tab} onChange={setTab} items={tabItems} />

      <WorkspaceBody className="ew-body" data-health-loading={healthLoading ? 'true' : 'false'}>
        {tab === 'profile' && <ProfileTab language={language} form={form} setForm={setForm} editing={editingProfile} saving={profileSaving} onEdit={() => { editingProfileRef.current = true; setEditingProfile(true) }} onCancel={() => { if(isNewEmployee){navigate(APP_ROUTES.EMPLOYEES);return} setForm(employee); editingProfileRef.current = false; setEditingProfile(false) }} onSave={save} />}

        {tab === 'health' && <EmployeeHealthTab
          language={language}
          view={healthView}
          setView={(next) => { setHealthView(next); setSelectedVaccination(null) }}
          vaccinations={employeeVaccinations}
          selectedVaccination={selectedVaccination}
          setSelectedVaccination={(item) => { if (item?.id) setLastVaccinationId(item.id); setSelectedVaccination(item) }}
          lastVaccinationId={lastVaccinationId}
          employee={employee}
          onSaveVaccination={saveVaccinationRecord}
          onDeleteVaccination={removeVaccinationRecord}
          visits={occupationalVisits}
          occupationalDraft={occupationalDraft}
          setOccupationalDraft={setOccupationalDraft}
          onSaveOccupational={saveOccupationalVisit}
          onDeleteOccupational={removeOccupationalVisit}
        />}

        {tab === 'training' && <ListTab
          icon={<GraduationCap size={22} />}
          eyebrow={L('ΕΚΠΑΙΔΕΥΣΗ', 'TRAINING')}
          title={L('Συμμετοχές εκπαίδευσης', 'Training participation')}
          text={L('Ιστορικό συμμετοχής του εργαζομένου στις εκπαιδεύσεις του οργανισμού.', 'Employee participation history in organizational training.')}
          empty={L('Δεν υπάρχουν συμμετοχές σε εκπαίδευση.', 'No training participation recorded.')}
          rows={employeeTraining}
          render={(item) => <><div><strong>{item.title}</strong><small>{[employeeDisplayValue(item.category, language), item.trainer, employeeDisplayValue(item.status, language)].filter(Boolean).join(' · ')}</small></div><span>{formatDate(item.date, language)}</span><ChevronRight size={17} /></>}
        />}

        {tab === 'samples' && <ListTab
          icon={<FlaskConical size={22} />}
          eyebrow={L('ΕΠΙΤΗΡΗΣΗ ΠΡΟΣΩΠΙΚΟΥ', 'STAFF SURVEILLANCE')}
          title={L('Καλλιέργειες / screening', 'Cultures / screening')}
          text={L('Δείγματα και αποτελέσματα που συνδέονται με τον συγκεκριμένο εργαζόμενο. Τα εργαστηριακά αποτελέσματα οριστικοποιούνται στο Εργαστήριο.', 'Samples and results linked to this employee. Laboratory results are finalized in Laboratory.')}
          empty={L('Δεν υπάρχουν καταχωρημένες καλλιέργειες.', 'No cultures recorded.')}
          rows={employeeSamples}
          render={(item) => <><div><strong>{employeeDisplayValue(item.sampleType || item.type || 'Δείγμα', language)}</strong><small>{[item.microorganism, item.resistance].filter(Boolean).join(' · ') || L('Χωρίς μικροοργανισμό', 'No microorganism')}</small></div><div className="ew-row-badges"><Badge tone={item.status === 'Θετικό' ? 'danger' : item.status === 'Αρνητικό' ? 'success' : 'neutral'}>{employeeDisplayValue(item.status || 'Εκκρεμεί', language)}</Badge><span>{formatDate(item.collectionDate || item.date, language)}</span></div><ChevronRight size={17} /></>}
        />}

        {tab === 'committees' && <ListTab
          icon={<Users size={22} />}
          eyebrow={L('ΕΠΙΤΡΟΠΕΣ', 'COMMITTEES')}
          title={L('Συμμετοχή σε επιτροπές', 'Committee participation')}
          text={L('Οι συμμετοχές ενημερώνονται από την κεντρική ενότητα Επιτροπών.', 'Membership is maintained in the central Committees area.')}
          empty={L('Ο εργαζόμενος δεν συμμετέχει σε επιτροπή.', 'The employee is not assigned to a committee.')}
          rows={employeeCommittees}
          render={(item) => <><div><strong>{item.name}</strong><small>{[item.type, employeeDisplayValue(item.status, language)].filter(Boolean).join(' · ')}</small></div><span>{item.nextMeeting ? `${L('Επόμενη', 'Next')} ${formatDate(item.nextMeeting, language)}` : ''}</span><ChevronRight size={17} /></>}
        />}
      </WorkspaceBody>
    </WorkspaceShell>
  )
}
