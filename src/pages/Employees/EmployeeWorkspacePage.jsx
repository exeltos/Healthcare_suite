import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { ChevronRight, ClipboardList, Edit3, FlaskConical, GraduationCap, KeyRound, Printer, Save, ShieldCheck, Syringe, Trash2, Users, X } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import LibraryField from '../../components/core/LibraryField/LibraryField'
import { Badge, Button, IconButton, WorkspaceBody, WorkspaceHeader, WorkspaceSectionHeader, WorkspaceShell, WorkspaceTabs } from '../../components/core'
import { deleteEmployee, employeeFullName, loadAllEmployees, upsertEmployee, EMPLOYEES_EVENT } from '../../services/employeesService'
import { loadStaffVaccinations, STAFF_VACCINATIONS_EVENT } from '../../services/preventionService'
import { loadStaffSamples, STAFF_SAMPLES_EVENT } from '../../services/laboratorySourcesService'
import { loadCommittees, loadTraining, ORGANIZATION_EVENT } from '../../services/organizationService'
import { loadUserAccounts, roleLabel, USER_ACCOUNTS_EVENT } from '../../services/userAccountsService'
import './EmployeeWorkspacePage.css'

const TABS = [
  { id: 'profile', label: 'Στοιχεία' },
  { id: 'vaccinations', label: 'Εμβολιασμοί' },
  { id: 'training', label: 'Εκπαιδεύσεις' },
  { id: 'samples', label: 'Καλλιέργειες' },
  { id: 'committees', label: 'Επιτροπές' },
]

export default function EmployeeWorkspacePage() {
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

  useAppEvents([EMPLOYEES_EVENT, STAFF_VACCINATIONS_EVENT, STAFF_SAMPLES_EVENT, ORGANIZATION_EVENT, USER_ACCOUNTS_EVENT], () => {

      const next = loadAllEmployees().find((item) => String(item.id) === String(employeeId)) || null
      setEmployee(next)
      setForm((current) => next ? { ...next, ...pickUnsaved(current, next) } : {})
      if (next && hasProfileData(next)) setEditingProfile(false)
      setVaccinations(loadStaffVaccinations())
      setSamples(loadStaffSamples())
      setTraining(loadTraining())
      setCommittees(loadCommittees())
      setUserAccount(loadUserAccounts().find((item) => String(item.employeeId) === String(employeeId)) || null)
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

  const employeeCommittees = useMemo(() => committees.filter((committee) => (committee.memberIds || []).map(String).includes(String(employeeId))), [committees, employeeId])

  if (!employee) return <div className="ew-page"><div className="ew-missing"><p>Ο εργαζόμενος δεν βρέθηκε.</p><Button onClick={() => navigate('/employees')}>Επιστροφή</Button></div></div>

  function save() {
    const saved = upsertEmployee({ ...employee, ...form })
    setEmployee(saved)
    setForm(saved)
    setEditingProfile(false)
    notifyAction('Τα στοιχεία του εργαζομένου αποθηκεύτηκαν.')
  }

  function remove() {
    if (!confirmAction('Να διαγραφεί ο εργαζόμενος;')) return
    deleteEmployee(employee.id)
    navigate('/employees')
  }

  return (
    <WorkspaceShell className="ew-page">
      <WorkspaceHeader
        backLabel="Επιστροφή στους εργαζομένους"
        onBack={() => navigate('/employees', { state: { returnFromDetail: true, listScope: '/employees', highlightRowKey: employee.id } })}
        eyebrow="ΚΑΡΤΕΛΑ ΕΡΓΑΖΟΜΕΝΟΥ"
        title={employeeFullName(form) || 'Εργαζόμενος'}
        badges={<><Badge tone={form.status === 'Ανενεργό' ? 'neutral' : 'success'}>{form.status || 'Ενεργό'}</Badge><Badge tone={userAccount?.status==='active'?'success':userAccount?'warning':'neutral'}>{userAccount?`Λογαριασμός: ${accountStatusLabel(userAccount.status)}`:'Χωρίς λογαριασμό'}</Badge></>}
        meta={[form.professionalCategory, form.department, form.employeeCode].filter(Boolean).join(' · ')}
        actions={<><Button variant="secondary" size="sm" icon={<KeyRound size={16} />} onClick={() => navigate(`/studio/users?employeeId=${encodeURIComponent(employee.id)}`, { state: { fromEmployeeAccount: true } })}>{userAccount?'Διαχείριση λογαριασμού':'Δημιουργία λογαριασμού'}</Button><IconButton label="Εκτύπωση καρτέλας εργαζομένου" onClick={() => window.print()}><Printer size={17} /></IconButton><IconButton variant="danger" label="Διαγραφή εργαζομένου" onClick={remove}><Trash2 size={17} /></IconButton></>}
      />
      <WorkspaceTabs ariaLabel="Καρτέλα εργαζομένου" value={tab} onChange={setTab} items={TABS.map((item) => ({ ...item, count: item.id === 'vaccinations' ? employeeVaccinations.length : item.id === 'training' ? employeeTraining.length : item.id === 'samples' ? employeeSamples.length : item.id === 'committees' ? employeeCommittees.length : undefined }))} />
      <WorkspaceBody className="ew-body">
          {tab === 'profile' && <ProfileTab form={form} setForm={setForm} editing={editingProfile} onEdit={() => setEditingProfile(true)} onCancel={() => { setForm(employee); setEditingProfile(false) }} onSave={save} />}
          {tab === 'vaccinations' && <ListTab icon={<Syringe size={22} />} eyebrow="ΕΜΒΟΛΙΑΣΜΟΙ" title="Ιστορικό εμβολιασμών" text="Οι καταχωρήσεις προέρχονται από την κεντρική ενότητα Εμβολιασμών ή από μαζική καταχώρηση." empty="Δεν υπάρχουν εμβολιασμοί." rows={employeeVaccinations} render={(item) => <><div><strong>{item.vaccine || 'Εμβολιασμός'}</strong><small>{[item.dose, item.lot ? `Παρτίδα ${item.lot}` : '', item.validUntil ? `Ισχύς έως ${formatDate(item.validUntil)}` : ''].filter(Boolean).join(' · ') || 'Χωρίς πρόσθετα στοιχεία'}</small></div><span>{formatDate(item.date)}</span><ChevronRight size={17} /></>} />}
          {tab === 'training' && <ListTab icon={<GraduationCap size={22} />} eyebrow="ΕΚΠΑΙΔΕΥΣΗ" title="Συμμετοχές εκπαίδευσης" text="Ιστορικό συμμετοχής του εργαζομένου στις εκπαιδεύσεις του οργανισμού." empty="Δεν υπάρχουν συμμετοχές σε εκπαίδευση." rows={employeeTraining} render={(item) => <><div><strong>{item.title}</strong><small>{[item.category, item.trainer, item.status].filter(Boolean).join(' · ')}</small></div><span>{formatDate(item.date)}</span><ChevronRight size={17} /></>} />}
          {tab === 'samples' && <ListTab icon={<FlaskConical size={22} />} eyebrow="ΕΠΙΤΗΡΗΣΗ ΠΡΟΣΩΠΙΚΟΥ" title="Καλλιέργειες / screening" text="Δείγματα και αποτελέσματα που συνδέονται με τον συγκεκριμένο εργαζόμενο." empty="Δεν υπάρχουν καταχωρημένες καλλιέργειες." rows={employeeSamples} render={(item) => <><div><strong>{item.sampleType || item.type || 'Δείγμα'}</strong><small>{[item.microorganism, item.resistance].filter(Boolean).join(' · ') || 'Χωρίς μικροοργανισμό'}</small></div><div className="ew-row-badges"><Badge tone={item.status === 'Θετικό' ? 'danger' : item.status === 'Αρνητικό' ? 'success' : 'neutral'}>{item.status || 'Εκκρεμεί'}</Badge><span>{formatDate(item.collectionDate || item.date)}</span></div><ChevronRight size={17} /></>} />}
          {tab === 'committees' && <ListTab icon={<Users size={22} />} eyebrow="ΕΠΙΤΡΟΠΕΣ" title="Συμμετοχή σε επιτροπές" text="Οι συμμετοχές ενημερώνονται από την κεντρική ενότητα Επιτροπών." empty="Ο εργαζόμενος δεν συμμετέχει σε επιτροπή." rows={employeeCommittees} render={(item) => <><div><strong>{item.name}</strong><small>{[item.type, item.status].filter(Boolean).join(' · ')}</small></div><span>{item.nextMeeting ? `Επόμενη ${formatDate(item.nextMeeting)}` : ''}</span><ChevronRight size={17} /></>} />}
      </WorkspaceBody>
    </WorkspaceShell>
  )
}

function ProfileTab({ form, setForm, editing, onEdit, onCancel, onSave }) {
  return <div className="ew-profile">
    <section className="ew-section"><WorkspaceSectionHeader icon={<ClipboardList size={18} />} title="Προσωπικά στοιχεία" text="Στοιχεία ταυτοποίησης του εργαζομένου." actions={editing ? <><IconButton label="Ακύρωση" size="sm" onClick={onCancel}><X size={15} /></IconButton><Button size="sm" icon={<Save size={15} />} onClick={onSave}>Αποθήκευση</Button></> : <IconButton label="Επεξεργασία" size="sm" onClick={onEdit}><Edit3 size={15} /></IconButton>} /><div className="ew-grid ew-grid--three"><Field label="Επώνυμο *"><input disabled={!editing} required value={form.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field><Field label="Όνομα *"><input disabled={!editing} required value={form.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field><Field label="Πατρώνυμο"><input disabled={!editing} value={form.fatherName || ''} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} /></Field></div></section>

    <section className="ew-section"><WorkspaceSectionHeader icon={<ShieldCheck size={18} />} title="Γενικά & υπηρεσιακά στοιχεία" text="Κωδικός, ιδιότητα, τμήμα και κατάσταση απασχόλησης." /><div className="ew-grid ew-grid--three"><Field label="Κωδικός εργαζομένου"><input disabled={!editing} value={form.employeeCode || ''} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} /></Field><LibraryField disabled={!editing} label="Ιδιότητα" libraryKey="professional-categories" value={form.professionalCategory || ''} onChange={(value) => setForm({ ...form, professionalCategory: value })} /><LibraryField disabled={!editing} label="Τμήμα" libraryKey="departments" value={form.department || ''} onChange={(value) => setForm({ ...form, department: value })} /><Field label="Ημερομηνία πρόσληψης"><input disabled={!editing} type="date" value={form.hireDate || ''} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} /></Field><Field label="Κατάσταση"><select disabled={!editing} value={form.status || 'Ενεργό'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Ενεργό</option><option>Ανενεργό</option></select></Field></div></section>

    <section className="ew-section"><WorkspaceSectionHeader icon={<ShieldCheck size={18} />} title="Στοιχεία επικοινωνίας" text="Υπηρεσιακά στοιχεία επικοινωνίας." /><div className="ew-grid ew-grid--two"><Field label="Email"><input disabled={!editing} type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field><Field label="Τηλέφωνο"><input disabled={!editing} value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field><Field label="Σημειώσεις" wide><textarea disabled={!editing} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field></div></section>
  </div>
}

function ListTab({ icon, eyebrow, title, text, empty, rows, render }) {
  return <section className="ew-list-section"><WorkspaceSectionHeader icon={icon} eyebrow={eyebrow} title={title} text={text} />{rows.length ? <div className="ew-record-list">{rows.map((item, index) => <article key={item.id || item.trainingId || index} className="ew-record-row">{render(item)}</article>)}</div> : <div className="ew-empty">{icon}<strong>{empty}</strong></div>}</section>
}

function Field({ label, wide, children }) {
  return <label className={wide ? 'ew-field ew-field--wide' : 'ew-field'}><span>{label}</span>{children}</label>
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('el-GR').format(date)
}

function hasProfileData(record = {}) {
  return Boolean(record.firstName || record.lastName || record.employeeCode || record.professionalCategory || record.department)
}

function pickUnsaved(current, next) {
  if (!current?.id || String(current.id) !== String(next?.id)) return {}
  return {}
}

function accountStatusLabel(value){return ({pending:'Εκκρεμεί',invited:'Πρόσκληση',active:'Ενεργός',disabled:'Ανενεργός'})[value]||value||'—'}
