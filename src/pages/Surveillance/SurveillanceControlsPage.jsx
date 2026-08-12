import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, Download, Plus, Printer, Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  Drawer,
  EntityCell,
  EntitySummary,
  FormActions,
  FormField,
  FormGrid,
  LibraryField,
  ListWorkspace,
  PageChrome,
  PageHeader,
  StatCard,
} from '../../components/core'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { normalizeText, selectedRows, sortRows } from '../../core/utils/entityList'
import {
  completeProgram,
  deleteControlProgram,
  loadControlExecutions,
  loadControlPrograms,
  SURVEILLANCE_EXECUTIONS_EVENT,
  SURVEILLANCE_PROGRAMS_EVENT,
  upsertControlProgram,
} from '../../services/surveillanceControlsService'
import { useRecordDeepLink } from '../../core/navigation/recordDeepLink'
import { useI18n } from '../../i18n'
import { surveillanceDisplayValue, surveillanceProgramState, surveillanceRecurrenceLabel } from './surveillancePresentation'
import './SurveillanceControlsPage.css'

const emptyProgram = {
  title: '',
  category: 'Περιβάλλον',
  controlType: '',
  department: '',
  location: '',
  controlPoints: [],
  owner: '',
  startDate: '',
  recurrence: 'months',
  interval: 1,
  reminderDays: 10,
  nextDueDate: '',
  active: true,
  notes: '',
}

const emptyExecution = {
  performedDate: '', dueDate: '', department: '', location: '', owner: '', notes: '', items: [],
}

function todayIso() { return new Date().toISOString().slice(0, 10) }
function parseIso(value) {
  if (!value) return null
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}
function daysUntil(value) {
  const due = parseIso(value)
  const today = parseIso(todayIso())
  if (!due || !today) return null
  return Math.ceil((due - today) / 86400000)
}
function formatDate(value) {
  const date = parseIso(value)
  return date ? date.toLocaleDateString('el-GR') : '—'
}
function programState(program) {
  if (!program.active) return { label: 'Ανενεργό', tone: 'neutral', key: 'inactive' }
  const days = daysUntil(program.nextDueDate)
  if (days === null) return { label: 'Χωρίς ημερομηνία', tone: 'neutral', key: 'unscheduled' }
  if (days < 0) return { label: 'Εκπρόθεσμο', tone: 'danger', key: 'overdue' }
  if (days === 0) return { label: 'Σήμερα', tone: 'warning', key: 'today' }
  if (days <= Number(program.reminderDays || 0)) return { label: `Σε ${days} ημέρ${days === 1 ? 'α' : 'ες'}`, tone: 'warning', key: 'due-soon' }
  return { label: 'Προγραμματισμένο', tone: 'success', key: 'scheduled' }
}
const programExportColumns = [
  { label: 'Έλεγχος', value: (row) => row.title || '' },
  { label: 'Κατηγορία', value: (row) => row.category || '' },
  { label: 'Τύπος', value: (row) => row.controlType || '' },
  { label: 'Τμήμα', value: (row) => row.department || '' },
  { label: 'Χώρος', value: (row) => row.location || '' },
  { label: 'Σημεία ελέγχου', value: (row) => (row.controlPoints || []).join(' · ') },
  { label: 'Συχνότητα', value: (row) => surveillanceRecurrenceLabel(row, 'el') },
  { label: 'Επόμενος έλεγχος', value: (row) => row.nextDueDate || '' },
  { label: 'Υπεύθυνος', value: (row) => row.owner || '' },
  { label: 'Κατάσταση', value: (row) => programState(row).label },
]

const executionExportColumns = [
  { label: 'Ημερομηνία', value: (row) => row.performedDate || '' },
  { label: 'Κατηγορία', value: (row) => row.category || '' },
  { label: 'Τμήμα', value: (row) => row.department || '' },
  { label: 'Χώρος', value: (row) => row.location || '' },
  { label: 'Υπεύθυνος', value: (row) => row.owner || '' },
  { label: 'Σημεία', value: (row) => row.items?.length || 0 },
]

function newExecutionFor(program) {
  const points = program.controlPoints.length ? program.controlPoints : [program.location || '']
  return {
    ...emptyExecution,
    performedDate: todayIso(),
    dueDate: program.nextDueDate,
    department: program.department,
    location: program.location,
    owner: program.owner,
    items: points.map((samplingPoint, index) => ({
      id: `item-${Date.now()}-${index}`,
      samplingPoint,
      sampleCode: '',
      sampleType: program.controlType || (program.category === 'Νερό' ? 'Δείγμα νερού' : 'Περιβαλλοντικό δείγμα'),
      resultStatus: 'Εκκρεμεί',
      microorganism: '',
      acceptable: '',
      resultNotes: '',
    })),
  }
}

export default function SurveillanceControlsPage() {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const [programs, setPrograms] = useState(loadControlPrograms)
  const [executions, setExecutions] = useState(loadControlExecutions)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [mode, setMode] = useState('programs')
  const [sort, setSort] = useState({ key: 'nextDueDate', direction: 'asc' })
  const [selectedKeys, setSelectedKeys] = useState([])
  const [programDrawer, setProgramDrawer] = useState(false)
  const [executionDrawer, setExecutionDrawer] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [programForm, setProgramForm] = useState(emptyProgram)
  const [executionForm, setExecutionForm] = useState(emptyExecution)

  const notificationLink = useRecordDeepLink(programs)

  useAppEvents(SURVEILLANCE_PROGRAMS_EVENT, () => setPrograms(loadControlPrograms()), { includeStorage: true })
  useAppEvents(SURVEILLANCE_EXECUTIONS_EVENT, () => setExecutions(loadControlExecutions()), { includeStorage: true })

  useEffect(() => { setSelectedKeys([]) }, [mode])

  const stats = useMemo(() => {
    const active = programs.filter((item) => item.active)
    return {
      total: programs.length,
      today: active.filter((item) => programState(item).key === 'today').length,
      upcoming: active.filter((item) => {
        const days = daysUntil(item.nextDueDate)
        return days !== null && days >= 0 && days <= 30
      }).length,
      overdue: active.filter((item) => programState(item).key === 'overdue').length,
      completed: executions.length,
    }
  }, [programs, executions])

  const filteredPrograms = useMemo(() => {
    const query = normalizeText(search)
    const result = programs.filter((program) => {
      const state = surveillanceProgramState(program, language)
      const haystack = normalizeText([
        program.title, program.category, program.controlType, program.department,
        program.location, program.owner, ...(program.controlPoints || []),
      ].filter(Boolean).join(' '))
      return (!query || haystack.includes(query))
        && (!category || program.category === category)
        && (!status || state.key === status)
    })
    return sortRows(result, sort)
  }, [programs, search, category, status, sort])

  const filteredExecutions = useMemo(() => {
    const query = normalizeText(search)
    const result = executions.filter((execution) => {
      const program = programs.find((item) => item.id === execution.programId)
      const haystack = normalizeText([
        program?.title, execution.category, execution.department, execution.location, execution.owner,
      ].filter(Boolean).join(' '))
      return (!query || haystack.includes(query)) && (!category || execution.category === category)
    })
    return sortRows(result, sort)
  }, [executions, programs, search, category, sort])

  const visibleRows = mode === 'programs' ? filteredPrograms : filteredExecutions
  const selectedControlRows = useMemo(
    () => selectedRows(visibleRows, selectedKeys),
    [visibleRows, selectedKeys],
  )

  const localizedProgramExportColumns = [
    { label: L('Έλεγχος', 'Control'), value: (row) => row.title || '' },
    { label: L('Κατηγορία', 'Category'), value: (row) => surveillanceDisplayValue(row.category, language) || '' },
    { label: L('Τύπος', 'Type'), value: (row) => row.controlType || '' },
    { label: L('Τμήμα', 'Department'), value: (row) => row.department || '' },
    { label: L('Χώρος', 'Location'), value: (row) => row.location || '' },
    { label: L('Σημεία ελέγχου', 'Control points'), value: (row) => (row.controlPoints || []).join(' · ') },
    { label: L('Συχνότητα', 'Frequency'), value: (row) => surveillanceRecurrenceLabel(row, language) },
    { label: L('Επόμενος έλεγχος', 'Next control'), value: (row) => row.nextDueDate || '' },
    { label: L('Υπεύθυνος', 'Owner'), value: (row) => row.owner || '' },
    { label: L('Κατάσταση', 'Status'), value: (row) => surveillanceProgramState(row, language).label },
  ]
  const localizedExecutionExportColumns = [
    { label: L('Ημερομηνία', 'Date'), value: (row) => row.performedDate || '' },
    { label: L('Κατηγορία', 'Category'), value: (row) => surveillanceDisplayValue(row.category, language) || '' },
    { label: L('Τμήμα', 'Department'), value: (row) => row.department || '' },
    { label: L('Χώρος', 'Location'), value: (row) => row.location || '' },
    { label: L('Υπεύθυνος', 'Owner'), value: (row) => row.owner || '' },
    { label: L('Σημεία', 'Points'), value: (row) => row.items?.length || 0 },
  ]

  const activeFilterCount = [search, category, mode === 'programs' ? status : ''].filter(Boolean).length
  function clearFilters() { setSearch(''); setCategory(''); setStatus('') }

  function openNewProgram() {
    setSelectedProgram(null)
    setProgramForm({ ...emptyProgram, startDate: todayIso(), nextDueDate: todayIso() })
    setProgramDrawer(true)
  }
  function openProgram(program) {
    notificationLink.markOpened(program.id)
    setSelectedProgram(program)
    setProgramForm({ ...program, controlPoints: [...(program.controlPoints || [])] })
    setProgramDrawer(true)
  }
  function closeProgramDrawer() {
    notificationLink.completeReview()
    setProgramDrawer(false)
  }
  function saveProgram(event) {
    event.preventDefault()
    if (!programForm.title.trim() || !programForm.category || !programForm.nextDueDate) {
      notifyAction(L('Συμπληρώστε τίτλο, κατηγορία και επόμενη ημερομηνία ελέγχου.', 'Enter title, category and next control date.'))
      return
    }
    upsertControlProgram({ ...programForm, id: selectedProgram?.id || programForm.id })
    closeProgramDrawer()
  }
  function removeProgram() {
    if (!selectedProgram || !confirmAction(L('Να διαγραφεί το πρόγραμμα ελέγχου;', 'Delete this control program?'))) return
    deleteControlProgram(selectedProgram.id)
    closeProgramDrawer()
  }
  function openExecution(program, event) {
    event?.stopPropagation?.()
    setSelectedProgram(program)
    setExecutionForm(newExecutionFor(program))
    setExecutionDrawer(true)
  }
  function updateExecutionItem(index, patch) {
    setExecutionForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }))
  }
  function saveExecution(event) {
    event.preventDefault()
    if (!selectedProgram || !executionForm.performedDate) return
    completeProgram(selectedProgram, executionForm)
    setExecutionDrawer(false)
    setSelectedProgram(null)
  }

  function exportSelectedControls() {
    const columns = mode === 'programs' ? localizedProgramExportColumns : localizedExecutionExportColumns
    const prefix = mode === 'programs' ? 'programma-elegxon' : 'istoriko-elegxon'
    downloadCsv({ filename: `${prefix}-${todayIso()}.csv`, columns, rows: selectedControlRows })
  }

  function printSelectedControls() {
    const columns = mode === 'programs' ? localizedProgramExportColumns : localizedExecutionExportColumns
    const title = mode === 'programs' ? L('Πρόγραμμα ελέγχων', 'Control schedule') : L('Ιστορικό ελέγχων', 'Control history')
    printRows({ title, columns, rows: selectedControlRows })
  }

  const programColumns = [
    {
      key: 'title', label: L('Έλεγχος', 'Control'), sortable: true,
      render: (program) => <EntityCell primary={program.title} secondary={program.controlType || L('Χωρίς τύπο', 'No type')} />,
    },
    {
      key: 'category', label: L('Κατηγορία', 'Category'), sortable: true, width: '130px',
      render: (program) => <Badge tone={program.category === 'Νερό' ? 'info' : 'neutral'}>{surveillanceDisplayValue(program.category, language)}</Badge>,
    },
    {
      key: 'department', label: L('Τμήμα / Χώρος', 'Department / Location'), sortable: true,
      render: (program) => <EntityCell primary={program.department || '—'} secondary={program.location || program.controlPoints?.join(', ') || L('Χωρίς χώρο', 'No location')} />,
    },
    {
      key: 'recurrence', label: L('Συχνότητα', 'Frequency'), width: '145px',
      render: (program) => surveillanceRecurrenceLabel(program, language),
    },
    {
      key: 'nextDueDate', label: L('Επόμενος έλεγχος', 'Next control'), sortable: true, width: '155px',
      render: (program) => formatDate(program.nextDueDate),
    },
    { key: 'owner', label: L('Υπεύθυνος', 'Owner'), sortable: true, width: '145px', render: (program) => program.owner || '—' },
    {
      key: 'state', label: L('Κατάσταση', 'Status'), width: '150px',
      render: (program) => { const state = surveillanceProgramState(program, language); return <Badge tone={state.tone}>{state.label}</Badge> },
    },
    {
      key: 'action', label: '', width: '142px',
      render: (program) => <Button size="sm" variant="secondary" icon={<ClipboardCheck size={15} />} onClick={(event) => openExecution(program, event)}>{L('Καταχώρηση', 'Record')}</Button>,
    },
  ]

  const executionColumns = [
    {
      key: 'programTitle', label: L('Έλεγχος', 'Control'),
      render: (execution) => {
        const program = programs.find((item) => item.id === execution.programId)
        return <EntityCell primary={program?.title || L('Έλεγχος', 'Control')} secondary={surveillanceDisplayValue(execution.category, language) || '—'} />
      },
    },
    { key: 'performedDate', label: L('Ημερομηνία', 'Date'), sortable: true, width: '145px', render: (execution) => formatDate(execution.performedDate) },
    {
      key: 'department', label: L('Τμήμα / Χώρος', 'Department / Location'), sortable: true,
      render: (execution) => <EntityCell primary={execution.department || '—'} secondary={execution.location || L('Χωρίς χώρο', 'No location')} />,
    },
    { key: 'items', label: L('Σημεία', 'Points'), width: '100px', render: (execution) => execution.items?.length || 0 },
    { key: 'owner', label: L('Υπεύθυνος', 'Owner'), sortable: true, width: '145px', render: (execution) => execution.owner || '—' },
    { key: 'completed', label: L('Κατάσταση', 'Status'), width: '150px', render: () => <Badge tone="success">{L('Πραγματοποιήθηκε', 'Performed')}</Badge> },
  ]

  return (
    <PageChrome
      className="surveillance-controls-page"
      header={(
        <PageHeader
          title={L("Έλεγχοι", "Controls")}
          description={L("Προγραμματισμός ελέγχων νερού και περιβάλλοντος, υπενθυμίσεις και ιστορικό.", "Schedule water and environmental controls, reminders and history.")}
          actions={<Button icon={<Plus size={17} />} onClick={openNewProgram}>{L('Νέο πρόγραμμα ελέγχου', 'New control program')}</Button>}
        />
      )}
    >
      <ListWorkspace
        stats={(
          <EntitySummary columns={5} ariaLabel={L("Σύνολα ελέγχων", "Control totals")}>
            <StatCard compact label={L("Σύνολο", "Total")} value={stats.total} />
            <StatCard compact icon={CalendarClock} label={L("Σήμερα", "Today")} value={stats.today} tone={stats.today ? 'warning' : 'default'} />
            <StatCard compact icon={CalendarClock} label={L("Επόμενες 30 ημέρες", "Next 30 days")} value={stats.upcoming} />
            <StatCard compact icon={AlertTriangle} label={L("Εκπρόθεσμα", "Overdue")} value={stats.overdue} tone={stats.overdue ? 'danger' : 'default'} />
            <StatCard compact icon={CheckCircle2} label={L("Πραγματοποιημένοι", "Performed")} value={stats.completed} tone="success" />
          </EntitySummary>
        )}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={L("Αναζήτηση ελέγχου, χώρου ή υπευθύνου…", "Search control, location or owner…")}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
        filters={(
          <>
            <select value={mode} onChange={(event) => setMode(event.target.value)} aria-label={L("Προβολή", "View")}>
              <option value="programs">{L('Πρόγραμμα ελέγχων', 'Control schedule')}</option>
              <option value="history">{L('Ιστορικό ελέγχων', 'Control history')}</option>
            </select>
            <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label={L("Κατηγορία", "Category")}>
              <option value="">{L('Όλες οι κατηγορίες', 'All categories')}</option>
              <option value="Περιβάλλον">{L("Περιβάλλον", "Environment")}</option>
              <option value="Νερό">{L("Νερό", "Water")}</option>
            </select>
            {mode === 'programs' && (
              <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label={L("Κατάσταση", "Status")}>
                <option value="">{L('Όλες οι καταστάσεις', 'All statuses')}</option>
                <option value="today">{L("Σήμερα", "Today")}</option>
                <option value="due-soon">{L("Πλησιάζει", "Due soon")}</option>
                <option value="overdue">{L("Εκπρόθεσμο", "Overdue")}</option>
                <option value="scheduled">{L("Προγραμματισμένο", "Scheduled")}</option>
                <option value="inactive">{L("Ανενεργό", "Inactive")}</option>
              </select>
            )}
          </>
        )}
        selectedCount={selectedControlRows.length}
        selectedLabel={L("εγγραφές", "records")}
        onClearSelection={() => setSelectedKeys([])}
        bulkActions={(
          <>
            <Button variant="secondary" size="sm" icon={<Printer size={16} />} onClick={printSelectedControls}>{L('Εκτύπωση / PDF', 'Print / PDF')}</Button>
            <Button variant="secondary" size="sm" icon={<Download size={16} />} onClick={exportSelectedControls}>{L('Εξαγωγή CSV', 'Export CSV')}</Button>
          </>
        )}
        columns={mode === 'programs' ? programColumns : executionColumns}
        rows={mode === 'programs' ? filteredPrograms : filteredExecutions}
        getRowKey={(row) => row.id}
        onRowClick={mode === 'programs' ? openProgram : undefined}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        sort={sort}
        onSortChange={setSort}
        highlightedKey={mode === 'programs' ? notificationLink.highlightedId : ''}
        ariaLabel={mode === 'programs' ? L('Πρόγραμμα ελέγχων', 'Control schedule') : L('Ιστορικό ελέγχων', 'Control history')}
        footer={<span>{mode === 'programs' ? filteredPrograms.length : filteredExecutions.length} {L('εγγραφές', 'records')}</span>}
        emptyTitle={mode === 'programs' ? L('Δεν βρέθηκαν προγράμματα ελέγχου', 'No control programs found') : L('Δεν υπάρχουν ολοκληρωμένοι έλεγχοι', 'No completed controls')}
      />

      <Drawer
        open={programDrawer}
        onClose={closeProgramDrawer}
        title={selectedProgram ? L('Πρόγραμμα ελέγχου', 'Control program') : L('Νέο πρόγραμμα ελέγχου', 'New control program')}
        description={L("Ορίστε τι πρέπει να ελέγχεται, πού, από ποιον και με ποια συχνότητα.", "Define what is controlled, where, by whom and how often.")}
        width={1080}
        position="center"
        footer={(
          <FormActions
            form="surveillance-program-form"
            onCancel={closeProgramDrawer}
            extraActions={selectedProgram ? <Button variant="danger" icon={<Trash2 size={16} />} onClick={removeProgram}>{L('Διαγραφή', 'Delete')}</Button> : null}
          />
        )}
      >
        <form id="surveillance-program-form" onSubmit={saveProgram} className="surveillance-controls-form">
          <section className="surveillance-form-section">
            <h3>{L("Βασικά στοιχεία", "Basic details")}</h3>
            <FormGrid columns={2}>
              <FormField label={L("Τίτλος ελέγχου", "Control title")} required><input value={programForm.title} onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })} /></FormField>
              <FormField label={L("Κατηγορία", "Category")} required><select value={programForm.category} onChange={(e) => setProgramForm({ ...programForm, category: e.target.value, controlPoints: [] })}><option value="Περιβάλλον">{L("Περιβάλλον", "Environment")}</option><option value="Νερό">{L("Νερό", "Water")}</option></select></FormField>
              <FormField label={L("Τύπος / υποκατηγορία", "Type / subcategory")}><LibraryField hideLabel allowManual libraryKey="control-types" category={programForm.category} value={programForm.controlType} onChange={(value) => setProgramForm({ ...programForm, controlType: value })} placeholder={L("Επιλέξτε ή γράψτε τύπο", "Select or enter type")} /></FormField>
              <FormField label={L("Τμήμα", "Department")}><LibraryField hideLabel libraryKey="departments" value={programForm.department} onChange={(value) => setProgramForm({ ...programForm, department: value })} placeholder={L("Τμήμα / μονάδα", "Department / unit")} /></FormField>
              <FormField label={L("Χώρος", "Location")}><input value={programForm.location} onChange={(e) => setProgramForm({ ...programForm, location: e.target.value })} placeholder={L("π.χ. Δίκτυο ζεστού νερού", "e.g. hot-water network")} /></FormField>
              <FormField label={L("Υπεύθυνος", "Owner")}><input value={programForm.owner} onChange={(e) => setProgramForm({ ...programForm, owner: e.target.value })} placeholder={L("ΝΕΛ / υπεύθυνος", "Infection control / owner")} /></FormField>
            </FormGrid>
          </section>

          <section className="surveillance-form-section">
            <h3>{L("Σημεία ελέγχου", "Control points")}</h3>
            <FormField helpText={L("Ένα σημείο ανά γραμμή. Μεταφέρονται αυτόματα στην καταχώρηση του ελέγχου.", "One point per line. Points are copied automatically to each control execution.")}>
              <textarea rows="7" value={programForm.controlPoints.join('\n')} onChange={(e) => setProgramForm({ ...programForm, controlPoints: e.target.value.split('\n').map((value) => value.trim()).filter(Boolean) })} placeholder={L("Ντους ΜΕΘ\nΔεξαμενή 1\nΒρύση δωματίου 201", "ICU shower\nTank 1\nRoom 201 tap")} />
            </FormField>
          </section>

          <section className="surveillance-form-section">
            <h3>{L("Προγραμματισμός", "Schedule")}</h3>
            <FormGrid columns={3}>
              <FormField label={L("Ημερομηνία έναρξης", "Start date")}><input type="date" value={programForm.startDate} onChange={(e) => setProgramForm({ ...programForm, startDate: e.target.value })} /></FormField>
              <FormField label={L("Επόμενος έλεγχος", "Next control")} required><input type="date" value={programForm.nextDueDate} onChange={(e) => setProgramForm({ ...programForm, nextDueDate: e.target.value })} /></FormField>
              <FormField label={L("Υπενθύμιση πριν (ημέρες)", "Reminder before (days)")}><input type="number" min="0" value={programForm.reminderDays} onChange={(e) => setProgramForm({ ...programForm, reminderDays: e.target.value })} /></FormField>
              <FormField label={L("Επανάληψη", "Recurrence")}><select value={programForm.recurrence} onChange={(e) => setProgramForm({ ...programForm, recurrence: e.target.value })}><option value="once">{L("Μία φορά", "Once")}</option><option value="days">{L("Ημέρες", "Days")}</option><option value="weeks">{L("Εβδομάδες", "Weeks")}</option><option value="months">{L("Μήνες", "Months")}</option><option value="years">{L("Έτη", "Years")}</option></select></FormField>
              <FormField label={L("Κάθε", "Every")}><input type="number" min="1" value={programForm.interval} disabled={programForm.recurrence === 'once'} onChange={(e) => setProgramForm({ ...programForm, interval: e.target.value })} /></FormField>
              <FormField label={L("Κατάσταση", "Status")}><select value={programForm.active ? 'active' : 'inactive'} onChange={(e) => setProgramForm({ ...programForm, active: e.target.value === 'active' })}><option value="active">{L("Ενεργό", "Active")}</option><option value="inactive">{L("Ανενεργό", "Inactive")}</option></select></FormField>
            </FormGrid>
          </section>

          <section className="surveillance-form-section">
            <h3>{L("Σημειώσεις", "Notes")}</h3>
            <FormField><textarea rows="5" value={programForm.notes} onChange={(e) => setProgramForm({ ...programForm, notes: e.target.value })} /></FormField>
          </section>
        </form>
      </Drawer>

      <Drawer
        open={executionDrawer}
        onClose={() => setExecutionDrawer(false)}
        title={L("Καταχώρηση ελέγχου", "Record control")}
        description={selectedProgram?.title || ''}
        width={1180}
        position="center"
        footer={<FormActions form="surveillance-execution-form" onCancel={() => setExecutionDrawer(false)} saveLabel={L("Καταχώρηση εκτέλεσης", "Record execution")} />}
      >
        <form id="surveillance-execution-form" onSubmit={saveExecution} className="surveillance-controls-form">
          <section className="surveillance-form-section">
            <h3>{L("Στοιχεία εκτέλεσης", "Execution details")}</h3>
            <FormGrid columns={4}>
              <FormField label={L("Προγραμματισμένη ημερομηνία", "Scheduled date")}><input type="date" value={executionForm.dueDate} readOnly /></FormField>
              <FormField label={L("Ημερομηνία πραγματοποίησης", "Performed date")} required><input type="date" value={executionForm.performedDate} onChange={(e) => setExecutionForm({ ...executionForm, performedDate: e.target.value })} /></FormField>
              <FormField label={L("Τμήμα", "Department")}><LibraryField hideLabel libraryKey="departments" value={executionForm.department} onChange={(value) => setExecutionForm({ ...executionForm, department: value })} /></FormField>
              <FormField label={L("Υπεύθυνος", "Owner")}><input value={executionForm.owner} onChange={(e) => setExecutionForm({ ...executionForm, owner: e.target.value })} /></FormField>
            </FormGrid>
          </section>

          <section className="surveillance-form-section">
            <div className="surveillance-execution-items__header"><div><h3>{L("Σημεία & δείγματα", "Points & samples")}</h3><small>{L("Η εκτέλεση δημιουργεί εκκρεμείς εργαστηριακές εγγραφές. Αποτέλεσμα, μικροοργανισμός και αντοχή οριστικοποιούνται στο Εργαστήριο.", "Execution creates pending laboratory records. Result, microorganism and resistance are finalized in Laboratory.")}</small></div><span>{executionForm.items.length} {L("σημεία", "points")}</span></div>
            <div className="surveillance-execution-items">
              {executionForm.items.map((item, index) => (
                <article key={item.id} className="surveillance-execution-item">
                  <strong>{index + 1}. {item.samplingPoint || L('Σημείο ελέγχου', 'Control point')}</strong>
                  <FormGrid columns={3} compact>
                    <FormField label={L("Σημείο", "Point")}><input value={item.samplingPoint} onChange={(e) => updateExecutionItem(index, { samplingPoint: e.target.value })} /></FormField>
                    <FormField label={L("Κωδικός δείγματος", "Sample code")}><input value={item.sampleCode} onChange={(e) => updateExecutionItem(index, { sampleCode: e.target.value })} /></FormField>
                    <FormField label={L("Είδος δείγματος", "Sample type")}><input value={item.sampleType} onChange={(e) => updateExecutionItem(index, { sampleType: e.target.value })} /></FormField>
                    <FormField label={L("Εργαστηριακή κατάσταση", "Laboratory status")}>
                      <input readOnly value={L("Εκκρεμεί — ολοκληρώνεται στο Εργαστήριο", "Pending — finalized in Laboratory")} />
                    </FormField>
                  </FormGrid>
                </article>
              ))}
            </div>
          </section>

          <section className="surveillance-form-section">
            <h3>{L("Γενικές σημειώσεις", "General notes")}</h3>
            <FormField><textarea rows="4" value={executionForm.notes} onChange={(e) => setExecutionForm({ ...executionForm, notes: e.target.value })} /></FormField>
          </section>
        </form>
      </Drawer>
    </PageChrome>
  )
}
