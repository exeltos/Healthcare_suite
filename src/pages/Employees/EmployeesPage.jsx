import { routeFor } from '../../config/routes'
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
import { loadAllEmployees, EMPLOYEES_EVENT, employeeFullName } from '../../services/employeesService'
import { loadDirectoryDepartments, loadDirectoryEmployees, saveDirectoryEmployee } from '../../services/backend/directoryService'
import { saveOperationalTraining } from '../../services/backend/organizationBackendService'
import { savePreventionRecord } from '../../services/backend/preventionBackendService'
import './EmployeesPage.css'
import { masterNames } from '../../services/masterDataService'
import { useI18n } from '../../i18n'
import { employeeDisplayValue } from './employeePresentation'

const emptyEmployee = {
  firstName: '', lastName: '', fatherName: '', gender: '', employeeCode: '', department: '', professionalCategory: '',
  email: '', phone: '', hireDate: '', status: 'Ενεργό', vaccinations: [], notes: '',
}


export default function EmployeesPage() {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const navigate = useNavigate()
  const [records, setRecords] = useState(loadAllEmployees)
  const [directoryLoading, setDirectoryLoading] = useState(true)
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
      firstName: required(L('Συμπληρώστε όνομα.', 'Enter first name.')),
      lastName: required(L('Συμπληρώστε επώνυμο.', 'Enter last name.')),
      email: email(L('Μη έγκυρη διεύθυνση email.', 'Invalid email address.')),
    },
  })
  const { values: form, errors: formErrors, isDirty: employeeFormDirty, setFieldValue: setEmployeeField, reset: resetEmployeeForm, validate: validateEmployeeForm } = employeeForm

  async function refreshDirectory(){
    try{
      await loadDirectoryDepartments()
      setRecords(await loadDirectoryEmployees())
    } finally {
      setDirectoryLoading(false)
    }
  }

  useEffect(()=>{ refreshDirectory() },[])

  useAppEvents([EMPLOYEES_EVENT, APP_EVENTS.MASTER_DATA_UPDATED], () => {
    refreshDirectory()
  })

  const departments = masterNames('departments')
  const categories = masterNames('professional-categories')
  const employeeExportColumns = [
    { label: L('Κωδικός', 'Code'), value: (record) => record.employeeCode || '' },
    { label: L('Επώνυμο', 'Last name'), value: (record) => record.lastName || '' },
    { label: L('Όνομα', 'First name'), value: (record) => record.firstName || '' },
    { label: L('Πατρώνυμο', "Father's name"), value: (record) => record.fatherName || '' },
    { label: L('Φύλο', 'Sex'), value: (record) => employeeDisplayValue(record.gender, language) || '' },
    { label: L('Τμήμα', 'Department'), value: (record) => record.department || '' },
    { label: L('Ιδιότητα', 'Professional category'), value: (record) => record.professionalCategory || '' },
    { label: L('Κατάσταση', 'Status'), value: (record) => employeeDisplayValue(record.status, language) || '' },
    { label: 'Email', value: (record) => record.email || '' },
    { label: L('Τηλέφωνο', 'Phone'), value: (record) => record.phone || '' },
  ]

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
    { key: 'employeeCode', label: L('Κωδικός', 'Code'), sortable: true, width: '130px' },
    { key: 'lastName', label: L('Εργαζόμενος', 'Employee'), sortable: true, render: (record) => <EntityCell primary={employeeFullName(record)} secondary={record.email || record.phone || '—'} /> },
    { key: 'department', label: L('Τμήμα', 'Department'), sortable: true },
    { key: 'professionalCategory', label: L('Ιδιότητα', 'Professional category'), sortable: true },
    { key: 'status', label: L('Κατάσταση', 'Status'), sortable: true, width: '120px', render: (record) => <Badge tone={record.status === 'Ανενεργό' ? 'neutral' : 'success'}>{employeeDisplayValue(record.status, language)}</Badge> },
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
    printRows({ title: L('Επιλεγμένοι εργαζόμενοι', 'Selected employees'), columns: employeeExportColumns, rows: selectedEmployees })
  }

  function openCreateEmployee() {
    resetEmployeeForm(emptyEmployee)
    setCreateOpen(true)
  }

  function closeCreateEmployee() {
    setCreateOpen(false)
    resetEmployeeForm(emptyEmployee)
  }

  async function createEmployee(event) {
    event.preventDefault()
    const nextErrors = validateEmployeeForm()
    if (Object.keys(nextErrors).length) return
    const item = await saveDirectoryEmployee({
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      fatherName: form.fatherName.trim(),
      employeeCode: form.employeeCode.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    })
    setRecords(await loadDirectoryEmployees())
    closeCreateEmployee()
    navigate(routeFor.employeeWorkspace(item.id))
  }

  async function applyBulkVaccination(event) {
    event.preventDefault()
    if (!bulkVaccine.date || !selectedEmployees.length) return
    for(const employee of selectedEmployees) {
      await savePreventionRecord('staff_vaccination',{
        ...bulkVaccine,
        employeeId: employee.id,
        employeeName: employeeFullName(employee),
        department: employee.department || '',
        professionalCategory: employee.professionalCategory || '',
      })
    }
    setBulkMode(null)
    setSelectedKeys([])
    setBulkVaccine({ vaccine: 'Γρίπη', date: '', dose: '', validUntil: '' })
  }

  async function applyBulkTraining(event) {
    event.preventDefault()
    if (!bulkTraining.title || !bulkTraining.date || !selectedEmployees.length) return
    await saveOperationalTraining({
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
      header={<PageHeader title={L("Εργαζόμενοι", "Employees")} description={L("Κεντρικό μητρώο προσωπικού", "Central staff registry")} actions={<Button icon={<Plus size={17} />} onClick={() => navigate(routeFor.employeeWorkspace('new'))}>{L('Νέος εργαζόμενος', 'New employee')}</Button>} />}
    >
      <ListWorkspace
        stats={<EntitySummary ariaLabel={L("Σύνολα εργαζομένων", "Employee totals")}><StatCard compact label={L("Σύνολο", "Total")} value={stats.total} /><StatCard compact label={L("Ενεργοί", "Active")} value={stats.active} /><StatCard compact label={L("Ιατροί", "Physicians")} value={stats.doctors} /><StatCard compact label={L("Νοσηλευτικό προσωπικό", "Nursing staff")} value={stats.nurses} /></EntitySummary>}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder={L("Αναζήτηση με όνομα, κωδικό, τμήμα ή ιδιότητα…", "Search by name, code, department or category…")}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearListFilters}
        filters={<><select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} aria-label={L("Τμήμα", "Department")}><option value="">{L('Όλα τα τμήματα', 'All departments')}</option>{departments.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label={L("Ιδιότητα", "Professional category")}><option value="">{L('Όλες οι ιδιότητες', 'All categories')}</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label={L("Κατάσταση", "Status")}><option value="Όλοι">{L('Όλες οι καταστάσεις', 'All statuses')}</option><option value="Ενεργό">{employeeDisplayValue("Ενεργό", language)}</option><option value="Ανενεργό">{employeeDisplayValue("Ανενεργό", language)}</option></select></>}
        selectedCount={selectedEmployees.length}
        selectedLabel={L("εργαζόμενοι", "employees")}
        onClearSelection={() => setSelectedKeys([])}
        bulkActions={<><Button variant="secondary" size="sm" icon={<GraduationCap size={16} />} onClick={() => setBulkMode('training')}>{L('Εκπαίδευση', 'Training')}</Button><Button variant="secondary" size="sm" icon={<Syringe size={16} />} onClick={() => setBulkMode('vaccine')}>{L('Εμβολιασμός', 'Vaccination')}</Button><Button variant="secondary" size="sm" icon={<Printer size={16} />} onClick={printSelectedEmployees}>{L('Εκτύπωση / PDF', 'Print / PDF')}</Button><Button variant="secondary" size="sm" icon={<Download size={16} />} onClick={exportSelectedEmployees}>{L('Εξαγωγή CSV', 'Export CSV')}</Button></>}
        columns={employeeColumns}
        rows={filtered}
        getRowKey={(record) => record.id}
        onRowClick={(record) => navigate(routeFor.employeeWorkspace(record.id))}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        sort={sort}
        onSortChange={setSort}
        ariaLabel={L("Μητρώο εργαζομένων", "Employee registry")}
        footer={<span>{language === 'en' ? `${filtered.length} records${selectedKeys.length ? ` · ${selectedKeys.length} selected` : ''}` : `${filtered.length} εγγραφές${selectedKeys.length ? ` · ${selectedKeys.length} επιλεγμένες` : ''}`}</span>}
        emptyTitle={L("Δεν βρέθηκαν εργαζόμενοι", "No employees found")}
      />


      <Drawer open={Boolean(bulkMode)} onClose={() => setBulkMode(null)} title={bulkMode === 'training' ? L('Μαζική ανάθεση εκπαίδευσης', 'Bulk training assignment') : L('Μαζικός εμβολιασμός', 'Bulk vaccination')} description={language === 'en' ? `${selectedEmployees.length} selected employees` : `${selectedEmployees.length} επιλεγμένοι εργαζόμενοι`} width={720} position="center">
        {bulkMode === 'training' ? <form className="employee-bulk-form" onSubmit={applyBulkTraining}><label><span>{L("Τίτλος εκπαίδευσης *", "Training title *")}</span><input required value={bulkTraining.title} onChange={(e) => setBulkTraining({ ...bulkTraining, title: e.target.value })} /></label><label><span>{L("Κατηγορία", "Category")}</span><select value={bulkTraining.category} onChange={(e) => setBulkTraining({ ...bulkTraining, category: e.target.value })}><option value="Κλινική εκπαίδευση">{employeeDisplayValue("Κλινική εκπαίδευση", language)}</option><option value="Ασφάλεια">{employeeDisplayValue("Ασφάλεια", language)}</option><option value="Πρόληψη λοιμώξεων">{employeeDisplayValue("Πρόληψη λοιμώξεων", language)}</option><option value="Υγιεινή χεριών">{employeeDisplayValue("Υγιεινή χεριών", language)}</option><option value="Άλλο">{employeeDisplayValue("Άλλο", language)}</option></select></label><label><span>{L("Ημερομηνία *", "Date *")}</span><input required type="date" value={bulkTraining.date} onChange={(e) => setBulkTraining({ ...bulkTraining, date: e.target.value })} /></label><label><span>{L("Εκπαιδευτής", "Trainer")}</span><input value={bulkTraining.trainer} onChange={(e) => setBulkTraining({ ...bulkTraining, trainer: e.target.value })} /></label><label><span>{L("Ισχύς έως", "Valid until")}</span><input type="date" value={bulkTraining.validUntil} onChange={(e) => setBulkTraining({ ...bulkTraining, validUntil: e.target.value })} /></label><div className="employee-bulk-selected">{selectedEmployees.map((employee) => <Badge key={employee.id} tone="neutral">{employeeFullName(employee)}</Badge>)}</div><div className="employee-bulk-actions"><Button variant="secondary" type="button" onClick={() => setBulkMode(null)}>{L('Ακύρωση', 'Cancel')}</Button><Button type="submit">{L('Ανάθεση εκπαίδευσης', 'Assign training')}</Button></div></form> : <form className="employee-bulk-form" onSubmit={applyBulkVaccination}><label><span>{L("Εμβόλιο", "Vaccine")}</span><select value={bulkVaccine.vaccine} onChange={(e) => setBulkVaccine({ ...bulkVaccine, vaccine: e.target.value })}><option value="Ηπατίτιδα Β">{employeeDisplayValue("Ηπατίτιδα Β", language)}</option><option value="Γρίπη">{employeeDisplayValue("Γρίπη", language)}</option><option>COVID-19</option><option>MMR</option><option value="Ανεμευλογιά">{employeeDisplayValue("Ανεμευλογιά", language)}</option><option value="Τέτανος / Διφθερίτιδα">{employeeDisplayValue("Τέτανος / Διφθερίτιδα", language)}</option><option value="Άλλο">{employeeDisplayValue("Άλλο", language)}</option></select></label><label><span>{L("Ημερομηνία *", "Date *")}</span><input required type="date" value={bulkVaccine.date} onChange={(e) => setBulkVaccine({ ...bulkVaccine, date: e.target.value })} /></label><label><span>{L("Δόση", "Dose")}</span><input value={bulkVaccine.dose} onChange={(e) => setBulkVaccine({ ...bulkVaccine, dose: e.target.value })} /></label><label><span>{L("Ισχύς / επανάληψη έως", "Valid / repeat until")}</span><input type="date" value={bulkVaccine.validUntil} onChange={(e) => setBulkVaccine({ ...bulkVaccine, validUntil: e.target.value })} /></label><div className="employee-bulk-selected">{selectedEmployees.map((employee) => <Badge key={employee.id} tone="neutral">{employeeFullName(employee)}</Badge>)}</div><div className="employee-bulk-actions"><Button variant="secondary" type="button" onClick={() => setBulkMode(null)}>{L('Ακύρωση', 'Cancel')}</Button><Button type="submit">{L('Καταχώρηση εμβολιασμού', 'Record vaccination')}</Button></div></form>}
      </Drawer>
    </PageChrome>
  )
}