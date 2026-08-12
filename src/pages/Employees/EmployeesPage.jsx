import { APP_EVENTS } from '../../core/events'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { Download, GraduationCap, Plus, Printer, Syringe } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import LibraryField from '../../components/core/LibraryField/LibraryField'
import { Badge, Button, Drawer, EntityCell, EntitySummary, Form, FormActions, ListWorkspace, PageChrome, PageHeader, StatCard } from '../../components/core'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { normalizeText, searchableText, selectedRows, sortRows, uniqueSortedValues } from '../../core/utils/entityList'
import { email, required, useCoreForm } from '../../core/forms'
import { loadAllEmployees, upsertEmployee, EMPLOYEES_EVENT, employeeFullName } from '../../services/employeesService'
import { upsertTraining } from '../../services/organizationService'
import { upsertStaffVaccination } from '../../services/preventionService'
import './EmployeesPage.css'
import { masterNames } from '../../services/masterDataService'

const emptyEmployee = {
  firstName: '', lastName: '', fatherName: '', employeeCode: '', department: '', professionalCategory: '',
  email: '', phone: '', hireDate: '', status: 'Ενεργό', vaccinations: [], notes: '',
}

const employeeExportColumns = [
  { label: 'Κωδικός', value: (record) => record.employeeCode || '' },
  { label: 'Επώνυμο', value: (record) => record.lastName || '' },
  { label: 'Όνομα', value: (record) => record.firstName || '' },
  { label: 'Πατρώνυμο', value: (record) => record.fatherName || '' },
  { label: 'Τμήμα', value: (record) => record.department || '' },
  { label: 'Ιδιότητα', value: (record) => record.professionalCategory || '' },
  { label: 'Κατάσταση', value: (record) => record.status || '' },
  { label: 'Email', value: (record) => record.email || '' },
  { label: 'Τηλέφωνο', value: (record) => record.phone || '' },
]

export default function EmployeesPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState(loadAllEmployees)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('Όλοι')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedKeys, setSelectedKeys] = useState([])
  const [sort, setSort] = useState({ key: 'lastName', direction: 'asc' })
  const [bulkMode, setBulkMode] = useState(null)
  const [bulkVaccine, setBulkVaccine] = useState({ vaccine: 'Γρίπη', date: '', dose: '', validUntil: '' })
  const [bulkTraining, setBulkTraining] = useState({ title: '', category: 'Κλινική εκπαίδευση', date: '', trainer: '', validUntil: '' })
  const [createOpen, setCreateOpen] = useState(false)
  const employeeForm = useCoreForm({
    initialValues: emptyEmployee,
    validationSchema: {
      firstName: required('Συμπληρώστε όνομα.'),
      lastName: required('Συμπληρώστε επώνυμο.'),
      email: email('Μη έγκυρη διεύθυνση email.'),
    },
  })
  const { values: form, errors: formErrors, isDirty: employeeFormDirty, setFieldValue: setEmployeeField, reset: resetEmployeeForm, validate: validateEmployeeForm } = employeeForm

  useAppEvents([EMPLOYEES_EVENT, APP_EVENTS.MASTER_DATA_UPDATED], () => {
    setRecords(loadAllEmployees())
  })

  const departments = masterNames('departments')
  const categories = masterNames('professional-categories')

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeText(query)
    const result = records.filter((record) => {
      const haystack = searchableText([record.lastName, record.firstName, record.fatherName, employeeFullName(record), record.employeeCode, record.department, record.professionalCategory, record.email, record.phone])
      return (!normalizedQuery || haystack.includes(normalizedQuery))
        && (statusFilter === 'Όλοι' || record.status === statusFilter)
        && (!departmentFilter || record.department === departmentFilter)
        && (!categoryFilter || record.professionalCategory === categoryFilter)
    })
    return sortRows(result, sort)
  }, [records, query, statusFilter, departmentFilter, categoryFilter, sort])

  const selectedEmployees = useMemo(
    () => selectedRows(filtered, selectedKeys),
    [filtered, selectedKeys],
  )

  const stats = useMemo(() => ({
    total: records.length,
    active: records.filter((record) => record.status !== 'Ανενεργό').length,
    doctors: records.filter((record) => String(record.professionalCategory || '').toLocaleLowerCase('el-GR').includes('ιατρ')).length,
    nurses: records.filter((record) => String(record.professionalCategory || '').toLocaleLowerCase('el-GR').includes('νοσηλ')).length,
  }), [records])

  const activeFilterCount = [query, departmentFilter, categoryFilter, statusFilter !== 'Όλοι' ? statusFilter : ''].filter(Boolean).length

  const employeeColumns = [
    { key: 'employeeCode', label: 'Κωδικός', sortable: true, width: '130px' },
    { key: 'lastName', label: 'Εργαζόμενος', sortable: true, render: (record) => <EntityCell primary={employeeFullName(record)} secondary={record.email || record.phone || '—'} /> },
    { key: 'department', label: 'Τμήμα', sortable: true },
    { key: 'professionalCategory', label: 'Ιδιότητα', sortable: true },
    { key: 'status', label: 'Κατάσταση', sortable: true, width: '120px', render: (record) => <Badge tone={record.status === 'Ανενεργό' ? 'neutral' : 'success'}>{record.status}</Badge> },
  ]

  function clearListFilters() {
    setQuery('')
    setDepartmentFilter('')
    setCategoryFilter('')
    setStatusFilter('Όλοι')
  }

  function exportSelectedEmployees() {
    downloadCsv({ filename: `ergazomenoi-${new Date().toISOString().slice(0, 10)}.csv`, columns: employeeExportColumns, rows: selectedEmployees })
  }

  function printSelectedEmployees() {
    printRows({ title: 'Επιλεγμένοι εργαζόμενοι', columns: employeeExportColumns, rows: selectedEmployees })
  }

  function openCreateEmployee() {
    resetEmployeeForm(emptyEmployee)
    setCreateOpen(true)
  }

  function closeCreateEmployee() {
    setCreateOpen(false)
    resetEmployeeForm(emptyEmployee)
  }

  function createEmployee(event) {
    event.preventDefault()
    const nextErrors = validateEmployeeForm()
    if (Object.keys(nextErrors).length) return
    const item = upsertEmployee({
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      fatherName: form.fatherName.trim(),
      employeeCode: form.employeeCode.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    })
    closeCreateEmployee()
    navigate(`/employees/${item.id}/workspace`)
  }

  function applyBulkVaccination(event) {
    event.preventDefault()
    if (!bulkVaccine.date || !selectedEmployees.length) return
    selectedEmployees.forEach((employee) => upsertStaffVaccination({
      ...bulkVaccine,
      employeeId: employee.id,
      employeeName: employeeFullName(employee),
      department: employee.department || '',
      professionalCategory: employee.professionalCategory || '',
    }))
    setBulkMode(null)
    setSelectedKeys([])
    setBulkVaccine({ vaccine: 'Γρίπη', date: '', dose: '', validUntil: '' })
  }

  function applyBulkTraining(event) {
    event.preventDefault()
    if (!bulkTraining.title || !bulkTraining.date || !selectedEmployees.length) return
    upsertTraining({
      ...bulkTraining,
      status: 'Προγραμματισμένη', durationHours: 1, department: '', attachments: [], notes: '',
      attendance: selectedEmployees.map((employee) => ({ employeeId: employee.id, employeeName: employeeFullName(employee), status: 'Προγραμματισμένος' })),
    })
    setBulkMode(null)
    setSelectedKeys([])
    setBulkTraining({ title: '', category: 'Κλινική εκπαίδευση', date: '', trainer: '', validUntil: '' })
  }

  return (
    <PageChrome
      className="employees-page"
      header={<PageHeader title="Εργαζόμενοι" description="Κεντρικό μητρώο προσωπικού" actions={<Button icon={<Plus size={17} />} onClick={openCreateEmployee}>Νέος εργαζόμενος</Button>} />}
    >
      <ListWorkspace
        stats={<EntitySummary ariaLabel="Σύνολα εργαζομένων"><StatCard compact label="Σύνολο" value={stats.total} /><StatCard compact label="Ενεργοί" value={stats.active} /><StatCard compact label="Ιατροί" value={stats.doctors} /><StatCard compact label="Νοσηλευτικό προσωπικό" value={stats.nurses} /></EntitySummary>}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Αναζήτηση με όνομα, κωδικό, τμήμα ή ιδιότητα…"
        activeFilterCount={activeFilterCount}
        onClearFilters={clearListFilters}
        filters={<><select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} aria-label="Τμήμα"><option value="">Όλα τα τμήματα</option>{departments.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Ιδιότητα"><option value="">Όλες οι ιδιότητες</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Κατάσταση"><option value="Όλοι">Όλες οι καταστάσεις</option><option value="Ενεργό">Ενεργό</option><option value="Ανενεργό">Ανενεργό</option></select></>}
        selectedCount={selectedEmployees.length}
        selectedLabel="εργαζόμενοι"
        onClearSelection={() => setSelectedKeys([])}
        bulkActions={<><Button variant="secondary" size="sm" icon={<GraduationCap size={16} />} onClick={() => setBulkMode('training')}>Εκπαίδευση</Button><Button variant="secondary" size="sm" icon={<Syringe size={16} />} onClick={() => setBulkMode('vaccine')}>Εμβολιασμός</Button><Button variant="secondary" size="sm" icon={<Printer size={16} />} onClick={printSelectedEmployees}>Εκτύπωση / PDF</Button><Button variant="secondary" size="sm" icon={<Download size={16} />} onClick={exportSelectedEmployees}>Εξαγωγή CSV</Button></>}
        columns={employeeColumns}
        rows={filtered}
        getRowKey={(record) => record.id}
        onRowClick={(record) => navigate(`/employees/${record.id}/workspace`)}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        sort={sort}
        onSortChange={setSort}
        ariaLabel="Μητρώο εργαζομένων"
        footer={<span>{filtered.length} εγγραφές{selectedKeys.length ? ` · ${selectedKeys.length} επιλεγμένες` : ''}</span>}
        emptyTitle="Δεν βρέθηκαν εργαζόμενοι"
      />

      <Drawer
        open={createOpen}
        onClose={closeCreateEmployee}
        title="Νέος εργαζόμενος"
        width={900}
        position="center"
        footer={<FormActions form="employee-create-form" onCancel={closeCreateEmployee} />}
      >
        <Form id="employee-create-form" className="employee-create-form" onSubmit={createEmployee} onCancel={closeCreateEmployee} isDirty={employeeFormDirty}>
          <section><h3>Προσωπικά στοιχεία</h3><div className="employee-create-grid"><label><span>Επώνυμο *</span><input required aria-invalid={Boolean(formErrors.lastName)} value={form.lastName} onChange={(e) => setEmployeeField('lastName', e.target.value)} />{formErrors.lastName && <small className="core-field__error">{formErrors.lastName}</small>}</label><label><span>Όνομα *</span><input required aria-invalid={Boolean(formErrors.firstName)} value={form.firstName} onChange={(e) => setEmployeeField('firstName', e.target.value)} />{formErrors.firstName && <small className="core-field__error">{formErrors.firstName}</small>}</label><label><span>Πατρώνυμο</span><input value={form.fatherName} onChange={(e) => setEmployeeField('fatherName', e.target.value)} /></label></div></section>
          <section><h3>Υπηρεσιακά στοιχεία</h3><div className="employee-create-grid"><label><span>Κωδικός</span><input value={form.employeeCode} onChange={(e) => setEmployeeField('employeeCode', e.target.value)} /></label><LibraryField label="Τμήμα" libraryKey="departments" value={form.department} onChange={(value) => setEmployeeField('department', value)} /><LibraryField label="Ιδιότητα" libraryKey="professional-categories" value={form.professionalCategory} onChange={(value) => setEmployeeField('professionalCategory', value)} /><label><span>Ημερομηνία πρόσληψης</span><input type="date" value={form.hireDate} onChange={(e) => setEmployeeField('hireDate', e.target.value)} /></label><label><span>Κατάσταση</span><select value={form.status} onChange={(e) => setEmployeeField('status', e.target.value)}><option>Ενεργό</option><option>Ανενεργό</option></select></label></div></section>
          <section><h3>Επικοινωνία</h3><div className="employee-create-grid"><label><span>Email</span><input type="email" aria-invalid={Boolean(formErrors.email)} value={form.email} onChange={(e) => setEmployeeField('email', e.target.value)} />{formErrors.email && <small className="core-field__error">{formErrors.email}</small>}</label><label><span>Τηλέφωνο</span><input value={form.phone} onChange={(e) => setEmployeeField('phone', e.target.value)} /></label></div></section>
        </Form>
      </Drawer>

      <Drawer open={Boolean(bulkMode)} onClose={() => setBulkMode(null)} title={bulkMode === 'training' ? 'Μαζική ανάθεση εκπαίδευσης' : 'Μαζικός εμβολιασμός'} description={`${selectedEmployees.length} επιλεγμένοι εργαζόμενοι`} width={720} position="center">
        {bulkMode === 'training' ? <form className="employee-bulk-form" onSubmit={applyBulkTraining}><label><span>Τίτλος εκπαίδευσης *</span><input required value={bulkTraining.title} onChange={(e) => setBulkTraining({ ...bulkTraining, title: e.target.value })} /></label><label><span>Κατηγορία</span><select value={bulkTraining.category} onChange={(e) => setBulkTraining({ ...bulkTraining, category: e.target.value })}><option>Κλινική εκπαίδευση</option><option>Ασφάλεια</option><option>Πρόληψη λοιμώξεων</option><option>Υγιεινή χεριών</option><option>Άλλο</option></select></label><label><span>Ημερομηνία *</span><input required type="date" value={bulkTraining.date} onChange={(e) => setBulkTraining({ ...bulkTraining, date: e.target.value })} /></label><label><span>Εκπαιδευτής</span><input value={bulkTraining.trainer} onChange={(e) => setBulkTraining({ ...bulkTraining, trainer: e.target.value })} /></label><label><span>Ισχύς έως</span><input type="date" value={bulkTraining.validUntil} onChange={(e) => setBulkTraining({ ...bulkTraining, validUntil: e.target.value })} /></label><div className="employee-bulk-selected">{selectedEmployees.map((employee) => <Badge key={employee.id} tone="neutral">{employeeFullName(employee)}</Badge>)}</div><div className="employee-bulk-actions"><Button variant="secondary" type="button" onClick={() => setBulkMode(null)}>Ακύρωση</Button><Button type="submit">Ανάθεση εκπαίδευσης</Button></div></form> : <form className="employee-bulk-form" onSubmit={applyBulkVaccination}><label><span>Εμβόλιο</span><select value={bulkVaccine.vaccine} onChange={(e) => setBulkVaccine({ ...bulkVaccine, vaccine: e.target.value })}><option>Ηπατίτιδα Β</option><option>Γρίπη</option><option>COVID-19</option><option>MMR</option><option>Ανεμευλογιά</option><option>Τέτανος / Διφθερίτιδα</option><option>Άλλο</option></select></label><label><span>Ημερομηνία *</span><input required type="date" value={bulkVaccine.date} onChange={(e) => setBulkVaccine({ ...bulkVaccine, date: e.target.value })} /></label><label><span>Δόση</span><input value={bulkVaccine.dose} onChange={(e) => setBulkVaccine({ ...bulkVaccine, dose: e.target.value })} /></label><label><span>Ισχύς / επανάληψη έως</span><input type="date" value={bulkVaccine.validUntil} onChange={(e) => setBulkVaccine({ ...bulkVaccine, validUntil: e.target.value })} /></label><div className="employee-bulk-selected">{selectedEmployees.map((employee) => <Badge key={employee.id} tone="neutral">{employeeFullName(employee)}</Badge>)}</div><div className="employee-bulk-actions"><Button variant="secondary" type="button" onClick={() => setBulkMode(null)}>Ακύρωση</Button><Button type="submit">Καταχώρηση εμβολιασμού</Button></div></form>}
      </Drawer>
    </PageChrome>
  )
}