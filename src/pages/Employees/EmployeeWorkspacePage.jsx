import { APP_ROUTES } from '../../config/routes'
import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { ChevronRight, ClipboardList, Edit3, FlaskConical, GraduationCap, KeyRound, Plus, Printer, Save, ShieldCheck, Stethoscope, Syringe, Trash2, Users, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import LibraryField from '../../components/core/LibraryField/LibraryField'
import { Badge, Button, IconButton, WorkspaceBody, WorkspaceHeader, WorkspaceSectionHeader, WorkspaceShell, WorkspaceTabs } from '../../components/core'
import { employeeFullName, loadAllEmployees, EMPLOYEES_EVENT } from '../../services/employeesService'
import { deleteDirectoryEmployee, deleteEmployeeOccupationalVisit, loadDirectoryEmployees, loadDirectoryUserAccounts, loadEmployeeOccupationalVisits, saveDirectoryEmployee, saveEmployeeOccupationalVisit } from '../../services/backend/directoryService'
import { loadStaffVaccinations, STAFF_VACCINATIONS_EVENT } from '../../services/preventionService'
import { loadStaffSamples, STAFF_SAMPLES_EVENT } from '../../services/laboratorySourcesService'
import { loadCommittees, loadTraining, ORGANIZATION_EVENT } from '../../services/organizationService'
import { loadUserAccounts, USER_ACCOUNTS_EVENT } from '../../services/userAccountsService'
import { useI18n } from '../../i18n'
import { employeeDisplayValue } from './employeePresentation'
import './EmployeeWorkspacePage.css'

const TABS = [
  { id: 'profile', el: 'Στοιχεία', en: 'Profile' },
  { id: 'vaccinations', el: 'Εμβολιασμοί', en: 'Vaccinations' },
  { id: 'training', el: 'Εκπαιδεύσεις', en: 'Training' },
  { id: 'samples', el: 'Καλλιέργειες', en: 'Cultures' },
  { id: 'occupational', el: 'Ιατρός εργασίας', en: 'Occupational Health' },
  { id: 'committees', el: 'Επιτροπές', en: 'Committees' },
]

const emptyOccupationalVisit = {
  date: '',
  fitness: 'Κατάλληλος',
  nextReviewDate: '',
  notes: '',
}

export default function EmployeeWorkspacePage() {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState(() => loadAllEmployees().find((item) => String(item.id) === String(employeeId)) || null)
  const [form, setForm] = useState(employee || {})
  const [tab, setTab] = useState('profile')
  const [editingProfile, setEditingProfile] = useState(() => !hasProfileData(employee))
  const [vaccinations, setVaccinations] = useState(loadStaffVaccinations)
  const [samples, setSamples] = useState(loadStaffSamples)
  const [training, setTraining] = useState(loadTraining)
  const [committees, setCommittees] = useState(loadCommittees)
  const [userAccount, setUserAccount] = useState(() => loadUserAccounts().find((item) => String(item.employeeId) === String(employeeId)) || null)
  const [occupationalDraft, setOccupationalDraft] = useState(null)
  const [occupationalVisitsState,setOccupationalVisitsState]=useState(()=>Array.isArray(employee?.occupationalVisits)?employee.occupationalVisits:[])

  async function refreshEmployeeDirectory({preserveDraft=true}={}){
    const employeeRows=await loadDirectoryEmployees()
    const next=employeeRows.find((item)=>String(item.id)===String(employeeId))||null
    setEmployee(next)
    setForm((current)=>next
      ? (preserveDraft?{...next,...pickUnsaved(current,next)}:next)
      : {})
    if(next&&hasProfileData(next)) setEditingProfile(false)
    const userRows=await loadDirectoryUserAccounts()
    setUserAccount(userRows.find((item)=>String(item.employeeId)===String(employeeId))||null)
    try{setOccupationalVisitsState(await loadEmployeeOccupationalVisits(employeeId))}catch{}
    return next
  }

  useEffect(()=>{
    let active=true
    Promise.all([loadDirectoryEmployees(),loadDirectoryUserAccounts(),loadEmployeeOccupationalVisits(employeeId)])
      .then(([employeeRows,userRows,occupationalRows])=>{
        if(!active)return
        const next=employeeRows.find((item)=>String(item.id)===String(employeeId))||null
        setEmployee(next)
        setForm(next||{})
        if(next&&hasProfileData(next)) setEditingProfile(false)
        setUserAccount(userRows.find((item)=>String(item.employeeId)===String(employeeId))||null)
        setOccupationalVisitsState(occupationalRows)
      })
      .catch(()=>{})
    return()=>{active=false}
  },[employeeId])

  useAppEvents([EMPLOYEES_EVENT, STAFF_VACCINATIONS_EVENT, STAFF_SAMPLES_EVENT, ORGANIZATION_EVENT, USER_ACCOUNTS_EVENT], () => {
    refreshEmployeeDirectory().catch(()=>{})
    setVaccinations(loadStaffVaccinations())
    setSamples(loadStaffSamples())
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

  if (!employee) {
    return <div className="ew-page"><div className="ew-missing">
      <p>{L('Ο εργαζόμενος δεν βρέθηκε.', 'Employee not found.')}</p>
      <Button onClick={() => navigate(APP_ROUTES.EMPLOYEES)}>{L('Επιστροφή', 'Back')}</Button>
    </div></div>
  }

  async function save() {
    if (!String(form.firstName || '').trim() || !String(form.lastName || '').trim()) {
      notifyAction(L('Συμπληρώστε όνομα και επώνυμο.', 'Enter first and last name.'))
      return
    }
    const saved = await saveDirectoryEmployee({ ...employee, ...form })
    setEmployee(saved)
    setForm(saved)
    setEditingProfile(false)
    notifyAction(L('Τα στοιχεία του εργαζομένου αποθηκεύτηκαν.', 'Employee details saved.'))
  }

  async function remove() {
    if (!confirmAction(L('Να διαγραφεί ο εργαζόμενος;', 'Delete this employee?'))) return
    await deleteDirectoryEmployee(employee.id)
    navigate(APP_ROUTES.EMPLOYEES)
  }

  async function saveOccupationalVisit(event) {
    event.preventDefault()
    if (!occupationalDraft?.date) {
      notifyAction(L('Συμπληρώστε ημερομηνία εξέτασης.', 'Enter examination date.'))
      return
    }
    await saveEmployeeOccupationalVisit(employee.id,occupationalDraft)
    setOccupationalVisitsState(await loadEmployeeOccupationalVisits(employee.id))
    setOccupationalDraft(null)
  }

  async function removeOccupationalVisit(id) {
    if (!confirmAction(L('Να διαγραφεί η καταχώρηση ιατρού εργασίας;', 'Delete this occupational-health record?'))) return
    await deleteEmployeeOccupationalVisit(employee.id,id)
    setOccupationalVisitsState(await loadEmployeeOccupationalVisits(employee.id))
    setOccupationalDraft(null)
  }

  const tabItems = TABS.map((item) => ({
    id: item.id,
    label: language === 'en' ? item.en : item.el,
    count: item.id === 'vaccinations'
      ? employeeVaccinations.length
      : item.id === 'training'
        ? employeeTraining.length
        : item.id === 'samples'
          ? employeeSamples.length
          : item.id === 'occupational'
            ? occupationalVisits.length
            : item.id === 'committees'
              ? employeeCommittees.length
              : undefined,
  }))

  return (
    <WorkspaceShell className="ew-page">
      <WorkspaceHeader
        backLabel={L('Επιστροφή στους εργαζομένους', 'Back to employees')}
        onBack={() => navigate(APP_ROUTES.EMPLOYEES, { state: { returnFromDetail: true, listScope: APP_ROUTES.EMPLOYEES, highlightRowKey: employee.id } })}
        eyebrow={L('ΚΑΡΤΕΛΑ ΕΡΓΑΖΟΜΕΝΟΥ', 'EMPLOYEE RECORD')}
        title={employeeFullName(form) || L('Εργαζόμενος', 'Employee')}
        badges={<>
          <Badge tone={form.status === 'Ανενεργό' ? 'neutral' : 'success'}>{employeeDisplayValue(form.status || 'Ενεργό', language)}</Badge>
          <Badge tone={userAccount?.status === 'active' ? 'success' : userAccount ? 'warning' : 'neutral'}>
            {userAccount
              ? `${L('Λογαριασμός', 'Account')}: ${accountStatusLabel(userAccount.status, language)}`
              : L('Χωρίς λογαριασμό', 'No account')}
          </Badge>
        </>}
        meta={[form.professionalCategory, form.department, form.employeeCode].filter(Boolean).join(' · ')}
        actions={<>
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

      <WorkspaceBody className="ew-body">
        {tab === 'profile' && <ProfileTab language={language} form={form} setForm={setForm} editing={editingProfile} onEdit={() => setEditingProfile(true)} onCancel={() => { setForm(employee); setEditingProfile(false) }} onSave={save} />}

        {tab === 'vaccinations' && <ListTab
          icon={<Syringe size={22} />}
          eyebrow={L('ΕΜΒΟΛΙΑΣΜΟΙ', 'VACCINATIONS')}
          title={L('Ιστορικό εμβολιασμών', 'Vaccination history')}
          text={L('Οι καταχωρήσεις προέρχονται από την κεντρική ενότητα Εμβολιασμών ή από μαζική καταχώρηση.', 'Records come from the central Vaccinations area or bulk entry.')}
          empty={L('Δεν υπάρχουν εμβολιασμοί.', 'No vaccinations recorded.')}
          rows={employeeVaccinations}
          render={(item) => <><div><strong>{employeeDisplayValue(item.vaccine || 'Εμβολιασμός', language)}</strong><small>{[
            item.dose,
            item.lot ? `${L('Παρτίδα', 'Lot')} ${item.lot}` : '',
            item.validUntil ? `${L('Ισχύς έως', 'Valid until')} ${formatDate(item.validUntil, language)}` : '',
          ].filter(Boolean).join(' · ') || L('Χωρίς πρόσθετα στοιχεία', 'No additional details')}</small></div><span>{formatDate(item.date, language)}</span><ChevronRight size={17} /></>}
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

        {tab === 'occupational' && <OccupationalHealthTab
          language={language}
          visits={occupationalVisits}
          draft={occupationalDraft}
          setDraft={setOccupationalDraft}
          onSave={saveOccupationalVisit}
          onDelete={removeOccupationalVisit}
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

function ProfileTab({ language, form, setForm, editing, onEdit, onCancel, onSave }) {
  const L = (el, en) => language === 'en' ? en : el
  return <div className="ew-profile">
    <section className="ew-section">
      <WorkspaceSectionHeader
        icon={<ClipboardList size={18} />}
        title={L('Προσωπικά στοιχεία', 'Personal details')}
        text={L('Στοιχεία ταυτοποίησης του εργαζομένου.', 'Employee identification details.')}
        actions={editing
          ? <><IconButton label={L('Ακύρωση', 'Cancel')} size="sm" onClick={onCancel}><X size={15} /></IconButton><Button size="sm" icon={<Save size={15} />} onClick={onSave}>{L('Αποθήκευση', 'Save')}</Button></>
          : <IconButton label={L('Επεξεργασία', 'Edit')} size="sm" onClick={onEdit}><Edit3 size={15} /></IconButton>}
      />
      <div className="ew-grid ew-grid--three">
        <Field label={L('Επώνυμο *', 'Last name *')}><input disabled={!editing} required value={form.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
        <Field label={L('Όνομα *', 'First name *')}><input disabled={!editing} required value={form.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
        <Field label={L('Πατρώνυμο', "Father's name")}><input disabled={!editing} value={form.fatherName || ''} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} /></Field>
        <Field label={L('Φύλο', 'Sex')}><select disabled={!editing} value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">{L('Επιλέξτε', 'Select')}</option><option value="Άνδρας">{employeeDisplayValue('Άνδρας', language)}</option><option value="Γυναίκα">{employeeDisplayValue('Γυναίκα', language)}</option><option value="Άλλο / μη δηλωμένο">{employeeDisplayValue('Άλλο / μη δηλωμένο', language)}</option></select></Field>
      </div>
    </section>

    <section className="ew-section">
      <WorkspaceSectionHeader icon={<ShieldCheck size={18} />} title={L('Γενικά & υπηρεσιακά στοιχεία', 'Employment details')} text={L('Κωδικός, ιδιότητα, τμήμα και κατάσταση απασχόλησης.', 'Code, professional category, department and employment status.')} />
      <div className="ew-grid ew-grid--three">
        <Field label={L('Κωδικός εργαζομένου', 'Employee code')}><input disabled={!editing} value={form.employeeCode || ''} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} /></Field>
        <LibraryField disabled={!editing} label={L('Ιδιότητα', 'Professional category')} libraryKey="professional-categories" value={form.professionalCategory || ''} onChange={(value) => setForm({ ...form, professionalCategory: value })} />
        <LibraryField disabled={!editing} label={L('Τμήμα', 'Department')} libraryKey="departments" value={form.department || ''} onChange={(value) => setForm({ ...form, department: value })} />
        <Field label={L('Ημερομηνία πρόσληψης', 'Hire date')}><input disabled={!editing} type="date" value={form.hireDate || ''} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} /></Field>
        <Field label={L('Κατάσταση', 'Status')}><select disabled={!editing} value={form.status || 'Ενεργό'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="Ενεργό">{employeeDisplayValue('Ενεργό', language)}</option><option value="Ανενεργό">{employeeDisplayValue('Ανενεργό', language)}</option></select></Field>
      </div>
    </section>

    <section className="ew-section">
      <WorkspaceSectionHeader icon={<ShieldCheck size={18} />} title={L('Στοιχεία επικοινωνίας', 'Contact details')} text={L('Υπηρεσιακά στοιχεία επικοινωνίας.', 'Work contact details.')} />
      <div className="ew-grid ew-grid--two">
        <Field label="Email"><input disabled={!editing} type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label={L('Τηλέφωνο', 'Phone')}><input disabled={!editing} value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label={L('Σημειώσεις', 'Notes')} wide><textarea disabled={!editing} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      </div>
    </section>
  </div>
}

function OccupationalHealthTab({ language, visits, draft, setDraft, onSave, onDelete }) {
  const L = (el, en) => language === 'en' ? en : el
  return <section className="ew-list-section">
    <WorkspaceSectionHeader
      icon={<Stethoscope size={20} />}
      eyebrow={L('ΙΑΤΡΟΣ ΕΡΓΑΣΙΑΣ', 'OCCUPATIONAL HEALTH')}
      title={L('Ιατρική καταλληλότητα & επανέλεγχοι', 'Fitness assessments & reviews')}
      text={L('Καταγράφονται μόνο στοιχεία καταλληλότητας, ημερομηνίες και επανέλεγχοι — όχι διάγνωση ή αναλυτικό ιατρικό ιστορικό.', 'Only fitness status, dates and reviews are recorded — not diagnoses or detailed medical history.')}
      actions={<Button size="sm" icon={<Plus size={15} />} onClick={() => setDraft({ ...emptyOccupationalVisit })}>{L('Νέα καταχώρηση', 'New record')}</Button>}
    />

    {draft && <form className="ew-section" onSubmit={onSave}>
      <div className="ew-grid ew-grid--three">
        <Field label={L('Ημερομηνία εξέτασης *', 'Examination date *')}><input required type="date" value={draft.date || ''} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
        <Field label={L('Καταλληλότητα', 'Fitness')}><select value={draft.fitness || 'Κατάλληλος'} onChange={(e) => setDraft({ ...draft, fitness: e.target.value })}><option value="Κατάλληλος">{employeeDisplayValue('Κατάλληλος', language)}</option><option value="Κατάλληλος με περιορισμούς">{employeeDisplayValue('Κατάλληλος με περιορισμούς', language)}</option><option value="Προσωρινά μη κατάλληλος">{employeeDisplayValue('Προσωρινά μη κατάλληλος', language)}</option></select></Field>
        <Field label={L('Επόμενος επανέλεγχος', 'Next review')}><input type="date" value={draft.nextReviewDate || ''} onChange={(e) => setDraft({ ...draft, nextReviewDate: e.target.value })} /></Field>
        <Field label={L('Σημειώσεις', 'Notes')} wide><textarea value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
      </div>
      <div className="ew-form-actions"><Button variant="secondary" type="button" onClick={() => setDraft(null)}>{L('Ακύρωση', 'Cancel')}</Button><Button type="submit">{L('Αποθήκευση', 'Save')}</Button></div>
    </form>}

    {visits.length ? <div className="ew-record-list">{visits.map((item) => <article key={item.id} className="ew-record-row is-clickable" onClick={() => setDraft({ ...item })}>
      <div><strong>{employeeDisplayValue(item.fitness, language) || '—'}</strong><small>{item.nextReviewDate ? `${L('Επανέλεγχος', 'Review')} ${formatDate(item.nextReviewDate, language)}` : L('Χωρίς προγραμματισμένο επανέλεγχο', 'No review scheduled')}</small></div>
      <span>{formatDate(item.date, language)}</span>
      <IconButton label={L('Διαγραφή', 'Delete')} variant="danger" onClick={(event) => { event.stopPropagation(); onDelete(item.id) }}><Trash2 size={15} /></IconButton>
    </article>)}</div> : <div className="ew-empty"><Stethoscope size={22} /><strong>{L('Δεν υπάρχουν καταχωρήσεις ιατρού εργασίας.', 'No occupational-health records.')}</strong></div>}
  </section>
}

function ListTab({ icon, eyebrow, title, text, empty, rows, render }) {
  return <section className="ew-list-section"><WorkspaceSectionHeader icon={icon} eyebrow={eyebrow} title={title} text={text} />{rows.length ? <div className="ew-record-list">{rows.map((item, index) => <article key={item.id || item.trainingId || index} className="ew-record-row">{render(item)}</article>)}</div> : <div className="ew-empty">{icon}<strong>{empty}</strong></div>}</section>
}

function Field({ label, wide, children }) {
  return <label className={wide ? 'ew-field ew-field--wide' : 'ew-field'}><span>{label}</span>{children}</label>
}

function formatDate(value, language='el') {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'el-GR').format(date)
}

function hasProfileData(record = {}) {
  return Boolean(record.firstName || record.lastName || record.employeeCode || record.professionalCategory || record.department)
}

function pickUnsaved(current, next) {
  if (!current?.id || String(current.id) !== String(next?.id)) return {}
  return {}
}

function accountStatusLabel(value, language='el') {
  const el = { pending: 'Εκκρεμεί', invited: 'Πρόσκληση', active: 'Ενεργός', disabled: 'Ανενεργός' }
  const en = { pending: 'Pending', invited: 'Invited', active: 'Active', disabled: 'Disabled' }
  return (language === 'en' ? en : el)[value] || value || '—'
}
