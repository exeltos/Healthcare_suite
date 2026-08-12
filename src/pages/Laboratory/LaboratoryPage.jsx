import { APP_ROUTES, routeFor } from '../../config/routes'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Download, FlaskConical, Plus, Printer } from 'lucide-react'

import {
  LABORATORY_SOURCE_EVENTS,
  loadAllLaboratoryRecords,
} from '../../services/laboratoryService'
import {
  Badge,
  Button,
  EntityCell,
  EntitySummary,
  ListWorkspace,
  PageChrome,
  PageHeader,
  StatCard,
} from '../../components/core'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { normalizeText, selectedRows, sortRows } from '../../core/utils/entityList'
import { LABORATORY_RESISTANT_MARKERS, laboratoryStatus } from '../../core/constants/laboratory'
import { useI18n } from '../../i18n'
import { laboratoryDisplayValue } from './laboratoryPresentation'

export default function LaboratoryPage() {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const navigate = useNavigate()
  const params = useParams()
  const view = params.view || ''
  const [searchParams, setSearchParams] = useSearchParams()
  const [records, setRecords] = useState(loadAllLaboratoryRecords)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState(() => view === 'environment' ? 'Περιβάλλον' : view === 'water' ? 'Νερό' : view === 'staff' ? 'Προσωπικό' : '')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '')
  const [resistanceFilter, setResistanceFilter] = useState(() => searchParams.get('attention') === 'resistant' ? 'resistant' : '')
  const [sort, setSort] = useState({ key: 'collectionDate', direction: 'desc' })
  const [selectedKeys, setSelectedKeys] = useState([])

  useEffect(() => {
    setSourceFilter(view === 'environment' ? 'Περιβάλλον' : view === 'water' ? 'Νερό' : view === 'staff' ? 'Προσωπικό' : '')
  }, [view])

  useEffect(() => {
    setStatusFilter(searchParams.get('status') || '')
    setResistanceFilter(searchParams.get('attention') === 'resistant' ? 'resistant' : '')
  }, [searchParams])

  useAppEvents(LABORATORY_SOURCE_EVENTS, () => {
    setRecords(loadAllLaboratoryRecords())
  }, { includeStorage: true })

  const filtered = useMemo(() => {
    const q = normalizeText(search)
    const next = records.filter((record) => {
      const status = laboratoryStatus(record)
      const matchesSource = !sourceFilter || record.sourceType === sourceFilter
      const matchesStatus = !statusFilter || status === statusFilter
      const matchesResistance = !resistanceFilter || (resistanceFilter === 'resistant' && LABORATORY_RESISTANT_MARKERS.has(record.resistance))
      const matchesSearch = !q || [
        record.id,
        record.subjectName,
        record.subjectCode,
        record.patientName,
        record.patientCode,
        record.department,
        record.sampleType,
        record.microorganism,
        record.resistance,
      ].some((value) => normalizeText(value).includes(q))
      return matchesSource && matchesStatus && matchesResistance && matchesSearch
    })
    return sortRows(next, sort)
  }, [records, search, sourceFilter, statusFilter, resistanceFilter, sort])

  const summary = useMemo(() => ({
    total: records.length,
    pending: records.filter((item) => laboratoryStatus(item) === 'Εκκρεμεί').length,
    positive: records.filter((item) => laboratoryStatus(item) === 'Θετικό').length,
    resistant: records.filter((item) => LABORATORY_RESISTANT_MARKERS.has(item.resistance)).length,
  }), [records])

  const selectedRecords = useMemo(
    () => selectedRows(filtered, selectedKeys, (row) => `${row.sourceType}:${row.id}`),
    [filtered, selectedKeys],
  )

  const exportColumns = [
    { label: L('Κωδικός', 'Code'), value: (row) => row.id || '' },
    { label: L('Πηγή', 'Source'), value: (row) => laboratoryDisplayValue(row.sourceType, language) || '' },
    { label: L('Αφορά', 'Subject'), value: (row) => row.subjectName || '' },
    { label: L('Κωδικός ασθενούς/πηγής', 'Patient/source code'), value: (row) => row.subjectCode || '' },
    { label: L('Τμήμα', 'Department'), value: (row) => row.department || '' },
    { label: L('Δείγμα', 'Sample'), value: (row) => laboratoryDisplayValue(row.sampleType, language) || '' },
    { label: L('Ημερομηνία', 'Date'), value: (row) => row.collectionDate || '' },
    { label: L('Κατάσταση', 'Status'), value: (row) => laboratoryDisplayValue(laboratoryStatus(row), language) },
    { label: L('Μικροοργανισμός', 'Microorganism'), value: (row) => row.microorganism || '' },
    { label: L('Ανθεκτικότητα', 'Resistance'), value: (row) => row.resistance || '' },
  ]

  const columns = [
    {
      key: 'id',
      label: L('Κωδικός', 'Code'),
      sortable: true,
      width: '140px',
      render: (row) => <EntityCell primary={row.id || '—'} secondary={laboratoryDisplayValue(row.sourceType, language) || '—'} />,
    },
    {
      key: 'subjectName',
      label: L('Αφορά', 'Subject'),
      sortable: true,
      render: (row) => <EntityCell primary={row.subjectName || '—'} secondary={row.subjectCode || L('Χωρίς κωδικό', 'No code')} />,
    },
    {
      key: 'department',
      label: L('Τμήμα', 'Department'),
      sortable: true,
      render: (row) => row.department || '—',
    },
    {
      key: 'sampleType',
      label: L('Δείγμα', 'Sample'),
      sortable: true,
      render: (row) => <EntityCell primary={laboratoryDisplayValue(row.sampleType, language) || '—'} secondary={row.collectionDate || '—'} />,
    },
    {
      key: 'status',
      label: L('Κατάσταση', 'Status'),
      sortable: true,
      width: '130px',
      render: (row) => {
        const status = laboratoryStatus(row)
        return <Badge tone={status === 'Θετικό' ? 'danger' : status === 'Αρνητικό' ? 'success' : 'warning'}>{laboratoryDisplayValue(status, language)}</Badge>
      },
    },
    {
      key: 'microorganism',
      label: L('Μικροοργανισμός', 'Microorganism'),
      sortable: true,
      render: (row) => <EntityCell primary={row.microorganism || '—'} secondary={row.resistance || ''} />,
    },
  ]

  const activeFilterCount = [search, sourceFilter, statusFilter, resistanceFilter].filter(Boolean).length

  function clearFilters() {
    setSearch('')
    setSourceFilter('')
    setStatusFilter('')
    setResistanceFilter('')
    setSearchParams({}, { replace: true })
  }

  function exportSelected() {
    downloadCsv({
      filename: `laboratory-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: exportColumns,
      rows: selectedRecords,
    })
  }

  function printSelected() {
    printRows({
      title: L('Εργαστηριακές εγγραφές', 'Laboratory records'),
      columns: exportColumns,
      rows: selectedRecords,
    })
  }

  const title = view === 'environment'
    ? L('Έλεγχος Επιφανειών', 'Surface monitoring')
    : view === 'water'
      ? L('Έλεγχος Νερού', 'Water monitoring')
      : L('Εργαστήριο', 'Laboratory')

  const description = view === 'environment'
    ? L('Καλλιέργειες και μικροβιολογικός έλεγχος επιφανειών και περιβάλλοντος', 'Cultures and microbiological monitoring of surfaces and environment')
    : view === 'water'
      ? L('Δειγματοληψίες και μικροβιολογικός έλεγχος νερού', 'Water sampling and microbiological monitoring')
      : L('Δείγματα, καλλιέργειες, αποτελέσματα και αντιβιογράμματα', 'Samples, cultures, results and antibiograms')

  const newLabel = view === 'environment'
    ? L('Νέα καλλιέργεια επιφάνειας', 'New surface culture')
    : view === 'water'
      ? L('Νέα δειγματοληψία νερού', 'New water sample')
      : L('Νέα εγγραφή', 'New record')

  return (
    <PageChrome
      className="laboratory-page"
      header={(
        <PageHeader
          title={title}
          description={description}
          actions={<Button
            icon={<Plus size={17} />}
            onClick={() => navigate(APP_ROUTES.LABORATORY_NEW_WORKSPACE, {
              state: { prefillSourceType: view === 'environment' ? 'Περιβάλλον' : view === 'water' ? 'Νερό' : '' },
            })}
          >{newLabel}</Button>}
        />
      )}
    >
      <ListWorkspace
        stats={(
          <EntitySummary ariaLabel={L('Σύνολα εργαστηρίου', 'Laboratory totals')}>
            <StatCard compact label={L('Σύνολο', 'Total')} value={summary.total} icon={FlaskConical} />
            <StatCard compact label={L('Εκκρεμή', 'Pending')} value={summary.pending} />
            <StatCard compact label={L('Θετικά', 'Positive')} value={summary.positive} />
            <StatCard compact label="MDR / XDR" value={summary.resistant} />
          </EntitySummary>
        )}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={L('Αναζήτηση με κωδικό, ασθενή, δείγμα ή μικροοργανισμό…', 'Search by code, patient, sample or microorganism…')}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
        filters={(
          <>
            <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} aria-label={L('Πηγή', 'Source')}>
              <option value="">{L('Όλες οι πηγές', 'All sources')}</option>
              <option value="Ασθενής">{L('Ασθενείς', 'Patients')}</option>
              <option value="Προσωπικό">{L('Προσωπικό', 'Staff')}</option>
              <option value="Περιβάλλον">{L('Περιβάλλον', 'Environment')}</option>
              <option value="Νερό">{L('Νερό', 'Water')}</option>
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label={L('Κατάσταση', 'Status')}>
              <option value="">{L('Όλες οι καταστάσεις', 'All statuses')}</option>
              <option value="Εκκρεμεί">{laboratoryDisplayValue('Εκκρεμεί', language)}</option>
              <option value="Αρνητικό">{laboratoryDisplayValue('Αρνητικό', language)}</option>
              <option value="Θετικό">{laboratoryDisplayValue('Θετικό', language)}</option>
            </select>
            <select value={resistanceFilter} onChange={(event) => setResistanceFilter(event.target.value)} aria-label={L('Ανθεκτικότητα', 'Resistance')}>
              <option value="">{L('Όλη η ανθεκτικότητα', 'All resistance')}</option>
              <option value="resistant">MDR / XDR</option>
            </select>
          </>
        )}
        selectedCount={selectedRecords.length}
        selectedLabel={L('εγγραφές', 'records')}
        onClearSelection={() => setSelectedKeys([])}
        bulkActions={(
          <>
            <Button variant="secondary" size="sm" icon={<Printer size={16} />} onClick={printSelected}>{L('Εκτύπωση / PDF', 'Print / PDF')}</Button>
            <Button variant="secondary" size="sm" icon={<Download size={16} />} onClick={exportSelected}>{L('Εξαγωγή CSV', 'Export CSV')}</Button>
          </>
        )}
        columns={columns}
        rows={filtered}
        getRowKey={(row) => `${row.sourceType}:${row.id}`}
        onRowClick={(row) => navigate(routeFor.laboratoryRecordWorkspace(encodeURIComponent(row.sourceType), encodeURIComponent(row.id)))}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        sort={sort}
        onSortChange={setSort}
        ariaLabel={L('Εργαστηριακές εγγραφές', 'Laboratory records')}
        footer={<span>{language === 'en'
          ? `${filtered.length} records${selectedKeys.length ? ` · ${selectedKeys.length} selected` : ''}`
          : `${filtered.length} εγγραφές${selectedKeys.length ? ` · ${selectedKeys.length} επιλεγμένες` : ''}`}</span>}
        emptyTitle={L('Δεν υπάρχουν εγγραφές', 'No records')}
        emptyMessage={L('Δημιουργήστε νέα εργαστηριακή εγγραφή ή αλλάξτε τα φίλτρα.', 'Create a laboratory record or change the filters.')}
      />
    </PageChrome>
  )
}
