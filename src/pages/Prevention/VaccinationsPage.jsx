import { confirmAction, notifyAction } from '../../components/core/feedback/index'
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
import { loadStaffVaccinations, STAFF_VACCINATIONS_EVENT } from '../../services/preventionService'
import { deletePreventionRecord, loadPreventionRecords, savePreventionRecord } from '../../services/backend/preventionBackendService'
import './PreventionUnified.css'
import { masterNames } from '../../services/masterDataService'
import { useI18n } from '../../i18n'
import { preventionDisplayValue } from './preventionPresentation'

const EMPTY = { vaccine: 'Ηπατίτιδα Β', date: '', dose: '', lot: '', validUntil: '', notes: '' }

function displayDate(value, language='el') {
  if (!value) return '—'
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : String(value).split('/').reverse().join('-')
  const date = new Date(`${normalized}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(language === 'en' ? 'en-GB' : 'el-GR')
}

const buildExportColumns = (L) => [
  { label: L('Ημερομηνία', 'Date'), value: (row) => row.date || '' },
  { label: L('Εργαζόμενος', 'Employee'), value: (row) => row.employeeName || '' },
  { label: L('Τμήμα', 'Department'), value: (row) => row.department || '' },
  { label: 'Ιδιότητα', value: (row) => row.professionalCategory || '' },
  { label: L('Εμβόλιο', 'Vaccine'), value: (row) => row.vaccine || '' },
  { label: 'Δόση', value: (row) => row.dose || '' },
  { label: L('Παρτίδα', 'Lot'), value: (row) => row.lot || '' },
  { label: L('Ισχύει έως', 'Valid until'), value: (row) => row.validUntil || '' },
]

export default function VaccinationsPage() {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const exportColumns = buildExportColumns(L)
  const [records, setRecords] = useState(loadStaffVaccinations)
  useEffect(()=>{loadPreventionRecords('staff_vaccination').then(setRecords).catch(()=>{})},[])
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
      vaccine: required(L('Συμπληρώστε εμβόλιο.', 'Enter vaccine.')),
      date: required(L('Συμπληρώστε ημερομηνία.', 'Enter date.')),
    },
  })
  const { values: form, errors, isDirty: vaccinationFormDirty, setFieldValue: setField, reset: resetForm, replaceValues: replaceForm, validate: validateForm } = vaccinationForm

  useAppEvents([STAFF_VACCINATIONS_EVENT, APP_EVENTS.EMPLOYEES_UPDATED], () => {
    loadPreventionRecords('staff_vaccination').then(setRecords).catch(()=>{})
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
  async function save(event) {
    event.preventDefault()
    const nextErrors = validateForm()
    if (Object.keys(nextErrors).length) return
    if (editing) {
      await savePreventionRecord('staff_vaccination',{ ...editing, ...form })
    } else {
      if (!subjects.length) return
      let created = 0
      for (const subject of subjects) {
        const values = subject.values || {}
        const source = subject.source || {}
        const employeeId = subject.manual ? '' : subject.id
        const duplicate = records.some((item) =>
          String(item.employeeId || item.employeeName || '') === String(employeeId || subject.name || '') &&
          String(item.vaccine || '') === String(form.vaccine || '') &&
          String(item.date || '') === String(form.date || '')
        )
        if (duplicate) continue
        await savePreventionRecord('staff_vaccination',{
          ...form,
          employeeId,
          employeeName: subject.name,
          department: values.department || source.department || subject.meta || '',
          professionalCategory: values.role || source.professionalCategory || '',
        })
        created += 1
      }
      if (!created) {
        notifyAction(L('Οι επιλεγμένοι εμβολιασμοί υπάρχουν ήδη για την ίδια ημερομηνία.', 'The selected vaccination records already exist for the same date.'))
        return
      }
    }
    try {
      const refreshed = await loadPreventionRecords('staff_vaccination')
      setRecords(refreshed)
      if (editing) {
        const persisted = refreshed.find((item) => String(item.id) === String(editing.id))
        if (!persisted) throw new Error(L('Η αποθήκευση δεν επιβεβαιώθηκε από το Supabase.', 'The save could not be verified in Supabase.'))
      }
      notifyAction(L('Ο εμβολιασμός αποθηκεύτηκε.', 'Vaccination saved.'))
      close()
    } catch (error) {
      notifyAction(error?.message || L('Η αποθήκευση του εμβολιασμού απέτυχε.', 'Vaccination save failed.'))
    }
  }
  async function remove() {
    if (!editing || !confirmAction(L('Να διαγραφεί η εγγραφή εμβολιασμού;', 'Delete this vaccination record?'))) return
    try {
      await deletePreventionRecord('staff_vaccination',editing.id)
      const refreshed = await loadPreventionRecords('staff_vaccination')
      if (refreshed.some((item) => String(item.id) === String(editing.id))) {
        throw new Error(L('Η διαγραφή δεν επιβεβαιώθηκε από το Supabase.', 'The delete could not be verified in Supabase.'))
      }
      setRecords(refreshed)
      notifyAction(L('Ο εμβολιασμός διαγράφηκε.', 'Vaccination deleted.'))
      close()
    } catch (error) {
      notifyAction(error?.message || L('Η διαγραφή του εμβολιασμού απέτυχε.', 'Vaccination delete failed.'))
    }
  }
  function printSelected() { printRows({ title: L('Εμβολιασμοί Προσωπικού', 'Staff Vaccinations'), columns: exportColumns, rows: selectedRecords }) }
  function exportSelected() { downloadCsv({ filename: `emvoliasmoi-${new Date().toISOString().slice(0, 10)}.csv`, columns: exportColumns, rows: selectedRecords }) }

  const columns = [
    { key: 'date', label: L('Ημερομηνία', 'Date'), width: '135px', sortable: true, render: (row) => displayDate(row.date, language) },
    { key: 'employeeName', label: L('Εργαζόμενος', 'Employee'), sortable: true, render: (row) => <EntityCell primary={row.employeeName || '—'} secondary={row.professionalCategory || ''} /> },
    { key: 'department', label: L('Τμήμα', 'Department'), sortable: true, render: (row) => row.department || '—' },
    { key: 'vaccine', label: L('Εμβόλιο', 'Vaccine'), sortable: true, render: (row) => <EntityCell primary={preventionDisplayValue(row.vaccine, language) || '—'} secondary={row.dose ? `${L('Δόση','Dose')}: ${row.dose}` : ''} /> },
    { key: 'lot', label: L('Παρτίδα', 'Lot'), width: '130px', render: (row) => row.lot || '—' },
    { key: 'validUntil', label: L('Ισχύει έως', 'Valid until'), width: '135px', render: (row) => displayDate(row.validUntil, language) },
  ]

  return <PageChrome className="prevention-unified-page" header={<PageHeader title={L("Εμβολιασμοί Προσωπικού","Staff Vaccinations")} description={L("Καταγραφή και παρακολούθηση εμβολιασμών εργαζομένων.","Record and monitor staff vaccinations.")} actions={<Button icon={<Plus size={17} />} onClick={openNew}>{L('Νέα καταχώρηση','New record')}</Button>} />}>
    <ListWorkspace
      stats={<EntitySummary columns={4} ariaLabel={L("Σύνολα εμβολιασμών","Vaccination totals")}><StatCard compact icon={Syringe} label={L("Καταχωρήσεις","Records")} value={metrics.total}/><StatCard compact icon={Users} label={L("Εργαζόμενοι","Employees")} value={metrics.employees}/><StatCard compact icon={ShieldCheck} label={L("Εμβόλια","Vaccines")} value={metrics.vaccines}/><StatCard compact icon={CalendarClock} label={L("Με ημερομηνία ισχύος","With validity date")} value={metrics.withValidity}/></EntitySummary>}
      searchValue={search} onSearchChange={setSearch} searchPlaceholder={L("Αναζήτηση εργαζομένου, εμβολίου ή τμήματος…","Search employee, vaccine or department…")}
      activeFilterCount={[search, department, vaccine].filter(Boolean).length} onClearFilters={() => { setSearch(''); setDepartment(''); setVaccine('') }}
      filters={<><select value={department} onChange={(e) => setDepartment(e.target.value)} aria-label={L("Τμήμα","Department")}><option value="">{L('Όλα τα τμήματα','All departments')}</option>{departments.map((item) => <option key={item}>{item}</option>)}</select><select value={vaccine} onChange={(e) => setVaccine(e.target.value)} aria-label={L("Εμβόλιο","Vaccine")}><option value="">{L('Όλα τα εμβόλια','All vaccines')}</option>{vaccines.map((item) => <option key={item} value={item}>{preventionDisplayValue(item,language)}</option>)}</select></>}
      selectedCount={selectedRecords.length} selectedLabel={L("εγγραφές","records")} onClearSelection={() => setSelectedKeys([])}
      bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={printSelected}>{L('Εκτύπωση / PDF','Print / PDF')}</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={exportSelected}>{L('Εξαγωγή CSV','Export CSV')}</Button></>}
      columns={columns} rows={filtered} getRowKey={(row) => row.id} onRowClick={openRecord} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel={L("Εμβολιασμοί προσωπικού","Staff vaccinations")} footer={<span>{filtered.length} {L('εγγραφές','records')}</span>} emptyTitle={L("Δεν υπάρχουν εμβολιασμοί","No vaccinations")}
    />

    <Drawer open={drawerOpen} onClose={close} title={editing ? L('Επεξεργασία εμβολιασμού','Edit vaccination') : L('Νέος εμβολιασμός','New vaccination')} description={editing ? L('Ενημερώστε τα στοιχεία της καταχώρησης.','Update the vaccination record.') : L('Επιλέξτε έναν ή περισσότερους εργαζομένους από το μητρώο ή καταχωρήστε χειροκίνητα.','Select one or more employees from the registry or enter manually.')} width={1080} position="center" footer={<FormActions form="vaccination-form" onCancel={close} saveLabel={!editing && subjects.length > 1 ? `${L('Αποθήκευση','Save')} (${subjects.length})` : L('Αποθήκευση','Save')} extraActions={editing ? <Button variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>{L('Διαγραφή','Delete')}</Button> : null} />}>
      <Form id="vaccination-form" className="prevention-unified-form" onSubmit={save} onCancel={close} isDirty={vaccinationFormDirty}>
        {!editing && <FormSection title={L("Εργαζόμενοι","Employees")}><HybridMultiSelector items={employees.filter((item) => item.status !== 'Ανενεργό')} selected={subjects} onChange={setSubjects} label={L("Εργαζόμενοι *","Employees *")} getName={(item) => item.fullName} getMeta={(item) => [item.department, item.professionalCategory].filter(Boolean).join(' · ')} /></FormSection>}
        {editing && <FormSection title={L("Εργαζόμενος","Employee")}><FormGrid columns={2}><FormField label={L("Ονοματεπώνυμο","Full name")}><input disabled value={editing.employeeName || ''}/></FormField><FormField label={L("Τμήμα / ιδιότητα","Department / category")}><input disabled value={[editing.department, editing.professionalCategory].filter(Boolean).join(' · ')}/></FormField></FormGrid></FormSection>}
        <FormSection title={L("Στοιχεία εμβολιασμού","Vaccination details")}><FormGrid columns={2}>
          <FormField label={L("Εμβόλιο","Vaccine")} required error={errors.vaccine}><LibraryField hideLabel allowManual libraryKey="vaccines" value={form.vaccine} onChange={(value) => setField('vaccine', value)} placeholder={L("Επιλέξτε ή γράψτε εμβόλιο","Select or enter vaccine")}/></FormField>
          <FormField label={L("Ημερομηνία","Date")} required error={errors.date}><input required type="date" value={form.date} onChange={(e) => setField('date', e.target.value)}/></FormField>
          <FormField label={L("Δόση","Dose")}><input value={form.dose} onChange={(e) => setField('dose', e.target.value)}/></FormField>
          <FormField label={L("Παρτίδα","Lot")}><input value={form.lot} onChange={(e) => setField('lot', e.target.value)}/></FormField>
          <FormField label={L("Ισχύει έως","Valid until")}><input type="date" value={form.validUntil} onChange={(e) => setField('validUntil', e.target.value)}/></FormField>
        </FormGrid></FormSection>
        <FormSection title={L("Σημειώσεις","Notes")}><FormField label={L("Σημειώσεις","Notes")}><textarea rows="5" value={form.notes} onChange={(e) => setField('notes', e.target.value)}/></FormField></FormSection>
      </Form>
    </Drawer>
  </PageChrome>
}