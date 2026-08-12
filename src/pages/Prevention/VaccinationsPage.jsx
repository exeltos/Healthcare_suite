import { confirmAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { APP_EVENTS, useAppEvents } from '../../core/events'
import { CalendarClock, Download, Plus, Printer, ShieldCheck, Syringe, Trash2, Users } from 'lucide-react'
import HybridMultiSelector from '../../components/core/HybridMultiSelector/HybridMultiSelector'
import {
  Button,
  Drawer,
  EntityCell,
  EntitySummary,
  Form,
  FormActions,
  FormField,
  FormGrid,
  FormSection,
  LibraryField,
  ListWorkspace,
  PageChrome,
  PageHeader,
  StatCard,
} from '../../components/core'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { normalizeText, selectedRows, sortRows, uniqueSortedValues } from '../../core/utils/entityList'
import { required, useCoreForm } from '../../core/forms'
import { loadEmployees } from '../../services/employeesService'
import { deleteStaffVaccination, loadStaffVaccinations, STAFF_VACCINATIONS_EVENT, upsertStaffVaccination } from '../../services/preventionService'
import './PreventionUnified.css'
import { masterNames } from '../../services/masterDataService'

const EMPTY = { vaccine: 'Ηπατίτιδα Β', date: '', dose: '', lot: '', validUntil: '', notes: '' }

function displayDate(value) {
  if (!value) return '—'
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : String(value).split('/').reverse().join('-')
  const date = new Date(`${normalized}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('el-GR')
}

const exportColumns = [
  { label: 'Ημερομηνία', value: (row) => row.date || '' },
  { label: 'Εργαζόμενος', value: (row) => row.employeeName || '' },
  { label: 'Τμήμα', value: (row) => row.department || '' },
  { label: 'Ιδιότητα', value: (row) => row.professionalCategory || '' },
  { label: 'Εμβόλιο', value: (row) => row.vaccine || '' },
  { label: 'Δόση', value: (row) => row.dose || '' },
  { label: 'Παρτίδα', value: (row) => row.lot || '' },
  { label: 'Ισχύει έως', value: (row) => row.validUntil || '' },
]

export default function VaccinationsPage() {
  const [records, setRecords] = useState(loadStaffVaccinations)
  const [employees, setEmployees] = useState(loadEmployees)
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [vaccine, setVaccine] = useState('')
  const [sort, setSort] = useState({ key: 'date', direction: 'desc' })
  const [selectedKeys, setSelectedKeys] = useState([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [subjects, setSubjects] = useState([])
  const vaccinationForm = useCoreForm({
    initialValues: EMPTY,
    validationSchema: {
      vaccine: required('Συμπληρώστε εμβόλιο.'),
      date: required('Συμπληρώστε ημερομηνία.'),
    },
  })
  const { values: form, errors, isDirty: vaccinationFormDirty, setFieldValue: setField, reset: resetForm, replaceValues: replaceForm, validate: validateForm } = vaccinationForm

  useAppEvents([STAFF_VACCINATIONS_EVENT, APP_EVENTS.EMPLOYEES_UPDATED], () => {
    setRecords(loadStaffVaccinations())
    setEmployees(loadEmployees())
  }, { includeStorage: true })

  const departments = masterNames('departments')
  const vaccines = useMemo(() => uniqueSortedValues(records, (item) => item.vaccine), [records])
  const filtered = useMemo(() => {
    const query = normalizeText(search)
    return sortRows(records.filter((item) => (
      (!department || item.department === department)
      && (!vaccine || item.vaccine === vaccine)
      && (!query || normalizeText([item.employeeName, item.department, item.professionalCategory, item.vaccine, item.dose, item.lot].filter(Boolean).join(' ')).includes(query))
    )), sort)
  }, [records, search, department, vaccine, sort])
  const selectedRecords = useMemo(() => selectedRows(filtered, selectedKeys), [filtered, selectedKeys])
  const metrics = useMemo(() => ({
    total: filtered.length,
    employees: new Set(filtered.map((item) => item.employeeId || item.employeeName).filter(Boolean)).size,
    vaccines: new Set(filtered.map((item) => item.vaccine).filter(Boolean)).size,
    withValidity: filtered.filter((item) => item.validUntil).length,
  }), [filtered])

  function openNew() { setEditing(null); setSubjects([]); resetForm(EMPTY); setDrawerOpen(true) }
  function openRecord(record) { setEditing(record); setSubjects([]); replaceForm({ ...EMPTY, ...record }, { asInitial: true }); setDrawerOpen(true) }
  function close() { setDrawerOpen(false); setEditing(null); setSubjects([]); resetForm(EMPTY) }
  function save(event) {
    event.preventDefault()
    const nextErrors = validateForm()
    if (Object.keys(nextErrors).length) return
    if (editing) {
      upsertStaffVaccination({ ...editing, ...form })
    } else {
      if (!subjects.length) return
      subjects.forEach((subject) => {
        const values = subject.values || {}
        const source = subject.source || {}
        upsertStaffVaccination({
          ...form,
          employeeId: subject.manual ? '' : subject.id,
          employeeName: subject.name,
          department: values.department || source.department || subject.meta || '',
          professionalCategory: values.role || source.professionalCategory || '',
        })
      })
    }
    setRecords(loadStaffVaccinations())
    close()
  }
  function remove() {
    if (!editing || !confirmAction('Να διαγραφεί η εγγραφή εμβολιασμού;')) return
    deleteStaffVaccination(editing.id)
    setRecords(loadStaffVaccinations())
    close()
  }
  function printSelected() { printRows({ title: 'Εμβολιασμοί Προσωπικού', columns: exportColumns, rows: selectedRecords }) }
  function exportSelected() { downloadCsv({ filename: `emvoliasmoi-${new Date().toISOString().slice(0, 10)}.csv`, columns: exportColumns, rows: selectedRecords }) }

  const columns = [
    { key: 'date', label: 'Ημερομηνία', width: '135px', sortable: true, render: (row) => displayDate(row.date) },
    { key: 'employeeName', label: 'Εργαζόμενος', sortable: true, render: (row) => <EntityCell primary={row.employeeName || '—'} secondary={row.professionalCategory || ''} /> },
    { key: 'department', label: 'Τμήμα', sortable: true, render: (row) => row.department || '—' },
    { key: 'vaccine', label: 'Εμβόλιο', sortable: true, render: (row) => <EntityCell primary={row.vaccine || '—'} secondary={row.dose ? `Δόση: ${row.dose}` : ''} /> },
    { key: 'lot', label: 'Παρτίδα', width: '130px', render: (row) => row.lot || '—' },
    { key: 'validUntil', label: 'Ισχύει έως', width: '135px', render: (row) => displayDate(row.validUntil) },
  ]

  return <PageChrome className="prevention-unified-page" header={<PageHeader title="Εμβολιασμοί Προσωπικού" description="Καταγραφή και παρακολούθηση εμβολιασμών εργαζομένων." actions={<Button icon={<Plus size={17} />} onClick={openNew}>Νέα καταχώρηση</Button>} />}>
    <ListWorkspace
      stats={<EntitySummary columns={4} ariaLabel="Σύνολα εμβολιασμών"><StatCard compact icon={Syringe} label="Καταχωρήσεις" value={metrics.total}/><StatCard compact icon={Users} label="Εργαζόμενοι" value={metrics.employees}/><StatCard compact icon={ShieldCheck} label="Εμβόλια" value={metrics.vaccines}/><StatCard compact icon={CalendarClock} label="Με ημερομηνία ισχύος" value={metrics.withValidity}/></EntitySummary>}
      searchValue={search} onSearchChange={setSearch} searchPlaceholder="Αναζήτηση εργαζομένου, εμβολίου ή τμήματος…"
      activeFilterCount={[search, department, vaccine].filter(Boolean).length} onClearFilters={() => { setSearch(''); setDepartment(''); setVaccine('') }}
      filters={<><select value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Τμήμα"><option value="">Όλα τα τμήματα</option>{departments.map((item) => <option key={item}>{item}</option>)}</select><select value={vaccine} onChange={(e) => setVaccine(e.target.value)} aria-label="Εμβόλιο"><option value="">Όλα τα εμβόλια</option>{vaccines.map((item) => <option key={item}>{item}</option>)}</select></>}
      selectedCount={selectedRecords.length} selectedLabel="εγγραφές" onClearSelection={() => setSelectedKeys([])}
      bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={printSelected}>Εκτύπωση / PDF</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={exportSelected}>Εξαγωγή CSV</Button></>}
      columns={columns} rows={filtered} getRowKey={(row) => row.id} onRowClick={openRecord} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel="Εμβολιασμοί προσωπικού" footer={<span>{filtered.length} εγγραφές</span>} emptyTitle="Δεν υπάρχουν εμβολιασμοί"
    />

    <Drawer open={drawerOpen} onClose={close} title={editing ? 'Επεξεργασία εμβολιασμού' : 'Νέος εμβολιασμός'} description={editing ? 'Ενημερώστε τα στοιχεία της καταχώρησης.' : 'Επιλέξτε έναν ή περισσότερους εργαζομένους από το μητρώο ή καταχωρήστε χειροκίνητα.'} width={1080} position="center" footer={<FormActions form="vaccination-form" onCancel={close} saveLabel={!editing && subjects.length > 1 ? `Αποθήκευση (${subjects.length})` : 'Αποθήκευση'} extraActions={editing ? <Button variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>Διαγραφή</Button> : null} />}>
      <Form id="vaccination-form" className="prevention-unified-form" onSubmit={save} onCancel={close} isDirty={vaccinationFormDirty}>
        {!editing && <FormSection title="Εργαζόμενοι"><HybridMultiSelector items={employees} selected={subjects} onChange={setSubjects} label="Εργαζόμενοι *" getName={(item) => item.fullName} getMeta={(item) => [item.department, item.professionalCategory].filter(Boolean).join(' · ')} /></FormSection>}
        {editing && <FormSection title="Εργαζόμενος"><FormGrid columns={2}><FormField label="Ονοματεπώνυμο"><input disabled value={editing.employeeName || ''}/></FormField><FormField label="Τμήμα / ιδιότητα"><input disabled value={[editing.department, editing.professionalCategory].filter(Boolean).join(' · ')}/></FormField></FormGrid></FormSection>}
        <FormSection title="Στοιχεία εμβολιασμού"><FormGrid columns={2}>
          <FormField label="Εμβόλιο" required error={errors.vaccine}><LibraryField hideLabel allowManual libraryKey="vaccines" value={form.vaccine} onChange={(value) => setField('vaccine', value)} placeholder="Επιλέξτε ή γράψτε εμβόλιο"/></FormField>
          <FormField label="Ημερομηνία" required error={errors.date}><input required type="date" value={form.date} onChange={(e) => setField('date', e.target.value)}/></FormField>
          <FormField label="Δόση"><input value={form.dose} onChange={(e) => setField('dose', e.target.value)}/></FormField>
          <FormField label="Παρτίδα"><input value={form.lot} onChange={(e) => setField('lot', e.target.value)}/></FormField>
          <FormField label="Ισχύει έως"><input type="date" value={form.validUntil} onChange={(e) => setField('validUntil', e.target.value)}/></FormField>
        </FormGrid></FormSection>
        <FormSection title="Σημειώσεις"><FormField label="Σημειώσεις"><textarea rows="5" value={form.notes} onChange={(e) => setField('notes', e.target.value)}/></FormField></FormSection>
      </Form>
    </Drawer>
  </PageChrome>
}