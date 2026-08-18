import { routeFor } from '../../config/routes'
import { APP_EVENTS } from '../../core/events'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { useNavigate } from 'react-router-dom'
import { Download, Plus, Printer } from 'lucide-react'

import {
  loadPatientRegistry,
  PATIENT_CONFIG_EVENT,
  PATIENT_REGISTRY_EVENT,
} from '../../services/patientService'
import { loadClinicalPatients, loadClinicalPatientSamples, saveClinicalPatient } from '../../services/backend/clinicalDirectoryService'
import {
  Badge,
  Button,
  EntityBadges,
  EntityCell,
  EntitySummary,
  ListWorkspace,
  PageChrome,
  PageHeader,
  StatCard,
} from '../../components/core'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { loadPatientSamples, PATIENT_SAMPLES_EVENT } from '../../services/patientSamplesService'
import { patientLaboratorySnapshot } from '../../services/patientClinicalStatusService'
import { normalizeText, selectedRows, sortRows, uniqueSortedValues } from '../../core/utils/entityList'
import { masterNames } from '../../services/masterDataService'
import { useI18n } from '../../i18n'
import { patientDisplayValue } from './patientPresentation'
import { IS_PRODUCTION } from '../../core/runtime'


export default function PatientsPage() {
  const navigate = useNavigate()
  const { language, t } = useI18n()

  const patientExportColumns = [
    { label: t('patients.code', "Κωδικός"), value: (patient) => patient.patientCode || '' },
    { label: t('patients.fullName', "Ονοματεπώνυμο"), value: (patient) => patient.fullName || '' },
    { label: t('patients.amka', "ΑΜΚΑ"), value: (patient) => patient.amka || '' },
    { label: t('patients.department', "Τμήμα"), value: (patient) => patient.department || '' },
    { label: t('patients.room', "Θάλαμος / Κλίνη"), value: (patient) => patient.room || '' },
    { label: t('patients.status', "Κατάσταση"), value: (patient) => patient.status || '' },
    { label: t('patients.diagnosis', "Κύρια διάγνωση"), value: (patient) => patient.primaryDiagnosis || '' },
    { label: t('patients.positiveCulture', "Θετική καλλιέργεια"), value: (patient) => patient.positiveCulture ? t('common.yes', "Ναι") : t('common.no', "Όχι") },
    { label: 'MDR / XDR', value: (patient) => patient.mdr ? t('common.yes', "Ναι") : t('common.no', "Όχι") },
    { label: t('patients.isolation', "Απομόνωση"), value: (patient) => patient.isolation ? t('common.yes', "Ναι") : t('common.no', "Όχι") },
  ]
  const [patients, setPatients] = useState(loadPatientRegistry)
  const [patientSamples, setPatientSamples] = useState(loadPatientSamples)
  const [clinicalLoading,setClinicalLoading]=useState(true)
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('')
  const [risk, setRisk] = useState('')
  const [sort, setSort] = useState({ key: 'fullName', direction: 'asc' })
  const [selectedKeys, setSelectedKeys] = useState([])

  async function refreshClinicalList(){
    try{
      const [patientRows,sampleRows]=await Promise.all([loadClinicalPatients(),loadClinicalPatientSamples()])
      setPatients(patientRows)
      setPatientSamples(sampleRows)
    } finally {
      setClinicalLoading(false)
    }
  }

  useEffect(()=>{refreshClinicalList()},[])

  useAppEvents([
    PATIENT_REGISTRY_EVENT,
    PATIENT_CONFIG_EVENT,
    APP_EVENTS.MASTER_DATA_UPDATED,
    PATIENT_SAMPLES_EVENT,
  ], () => { refreshClinicalList() }, { includeStorage: true })

  const departments = masterNames('departments')

  const laboratoryByPatient = useMemo(() => new Map(
    patients.map((patient) => [String(patient.id), patientLaboratorySnapshot(patient, patientSamples)]),
  ), [patients, patientSamples])

  const filteredPatients = useMemo(() => {
    const query = normalizeText(search)
    const result = patients.filter((patient) => {
      const haystack = normalizeText([
        patient.fullName,
        patient.patientCode,
        patient.amka,
        patient.department,
        patient.room,
        patient.primaryDiagnosis,
      ].filter(Boolean).join(' '))

      return (!query || haystack.includes(query))
        && (!department || patient.department === department)
        && (!status || patient.status === status)
        && (!risk
          || (risk === 'positive' && laboratoryByPatient.get(String(patient.id))?.positive)
          || (risk === 'mdr' && patient.mdr)
          || (risk === 'isolation' && patient.isolation))
    })

    return sortRows(result, sort)
  }, [patients, search, department, status, risk, sort, laboratoryByPatient])

  const summary = useMemo(() => ({
    records: filteredPatients.length,
    admitted: filteredPatients.filter((patient) => patient.status === 'Νοσηλεύεται').length,
    positive: filteredPatients.filter((patient) => laboratoryByPatient.get(String(patient.id))?.positive).length,
    mdr: filteredPatients.filter((patient) => patient.mdr).length,
    isolation: filteredPatients.filter((patient) => patient.isolation).length,
  }), [filteredPatients, laboratoryByPatient])

  const activeFilterCount = [search, department, status, risk].filter(Boolean).length

  function clearFilters() {
    setSearch('')
    setDepartment('')
    setStatus('')
    setRisk('')
  }


  const selectedPatients = useMemo(
    () => selectedRows(filteredPatients, selectedKeys),
    [filteredPatients, selectedKeys],
  )

  function exportSelectedPatients() {
    downloadCsv({
      filename: `astheneis-${new Date().toISOString().slice(0, 10)}.csv`,
      columns: patientExportColumns,
      rows: selectedPatients,
    })
  }

  function printSelectedPatients() {
    printRows({ title: t('patients.selectedPatients', "Επιλεγμένοι ασθενείς"), columns: patientExportColumns, rows: selectedPatients })
  }

  const columns = [
    {
      key: 'patientCode', label: t('patients.code', "Κωδικός"), sortable: true, width: '150px',
      render: (patient) => <EntityCell primary={patient.patientCode || '—'} secondary={patient.amka ? `${t('patients.amka', "ΑΜΚΑ")} ${patient.amka}` : t('patients.noAmka', "Χωρίς ΑΜΚΑ")} />,
    },
    {
      key: 'fullName', label: t('patients.patient', "Ασθενής"), sortable: true,
      render: (patient) => <EntityCell primary={patient.fullName} secondary={patient.primaryDiagnosis || t('patients.noDiagnosis', "Χωρίς διάγνωση")} />,
    },
    {
      key: 'department', label: t('patients.departmentRoom', "Τμήμα / Θάλαμος"), sortable: true,
      render: (patient) => <EntityCell primary={patient.department || '—'} secondary={patient.room || t('patients.noRoom', "Χωρίς θάλαμο / κλίνη")} />,
    },
    {
      key: 'admissionDate', label: t('patients.hospitalization', "Νοσηλεία"), sortable: true, width: '150px',
      render: (patient) => <EntityCell primary={patient.admissionDate || '—'} secondary={`${patient.daysInHospital || 0} ${t('patients.days', "ημέρες")}`} />,
    },
    {
      key: 'status', label: t('patients.status', "Κατάσταση"), sortable: true, width: '130px',
      render: (patient) => <Badge tone={patient.status === 'Νοσηλεύεται' ? 'success' : 'neutral'}>{patientDisplayValue(patient.status, language) || '—'}</Badge>,
    },
    {
      key: 'risk', label: t('patients.flags', "Ενδείξεις"), width: '230px',
      render: (patient) => (
        <EntityBadges>
          {(() => { const lab = laboratoryByPatient.get(String(patient.id)); return lab?.status ? <Badge tone={lab.status === 'Θετικό' ? 'warning' : lab.status === 'Αρνητικό' ? 'success' : 'neutral'}>{patientDisplayValue(lab.status, language)}</Badge> : null })()}
          {patient.mdr && <Badge tone="danger">MDR / XDR</Badge>}
          {patient.isolation && <Badge tone="info">Απομόνωση</Badge>}
        </EntityBadges>
      ),
    },
  ]

  return (
    <>
      {!IS_PRODUCTION&&<div className="patient-runtime-warning" role="status">{language==='en'?'Demo/local mode — patient changes are not saved to Supabase.':'Demo/local mode — οι αλλαγές ασθενών δεν αποθηκεύονται στο Supabase.'}</div>}
      <PageChrome
      className="patients-page"
      header={
        <PageHeader
          title={t('patients.title', "Ασθενείς")}
          description={t('patients.description', "Μητρώο και παρακολούθηση ασθενών")}
          actions={<Button icon={<Plus size={17} />} onClick={() => navigate(routeFor.patientWorkflow('new'))}>{t('patients.newPatient', "Νέος ασθενής")}</Button>}
        />
      }
    >
      <ListWorkspace
        stats={(
          <EntitySummary columns={5} ariaLabel={t('patients.summaryAria', "Σύνολα ασθενών")}>
            <StatCard compact label={t('patients.total', "Σύνολο")} value={summary.records} />
            <StatCard compact label={t('patients.admitted', "Νοσηλεύονται")} value={summary.admitted} />
            <StatCard compact label={t('patients.positive', "Θετικές")} value={summary.positive} />
            <StatCard compact label="MDR / XDR" value={summary.mdr} />
            <StatCard compact label={t('patients.isolations', "Απομονώσεις")} value={summary.isolation} />
          </EntitySummary>
        )}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('patients.searchPlaceholder', "Αναζήτηση με όνομα, κωδικό, ΑΜΚΑ ή διάγνωση…")}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
        filters={(
          <>
            <select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label={t('patients.department', "Τμήμα")}>
              <option value="">{t('patients.allDepartments', "Όλα τα τμήματα")}</option>
              {departments.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label={t('patients.status', "Κατάσταση")}>
              <option value="">{t('patients.allStatuses', "Όλες οι καταστάσεις")}</option>
              <option value="Νοσηλεύεται">{patientDisplayValue("Νοσηλεύεται", language)}</option>
              <option value="Εξιτήριο">{patientDisplayValue("Εξιτήριο", language)}</option>
            </select>
            <select value={risk} onChange={(event) => setRisk(event.target.value)} aria-label={t('patients.clinicalFlag', "Κλινική ένδειξη")}>
              <option value="">{t('patients.allFlags', "Όλες οι ενδείξεις")}</option>
              <option value="positive">{t('patients.positiveCulture', "Θετική καλλιέργεια")}</option>
              <option value="mdr">MDR / XDR</option>
              <option value="isolation">{t('patients.inIsolation', "Σε απομόνωση")}</option>
            </select>
          </>
        )}
        selectedCount={selectedPatients.length}
        selectedLabel={t('patients.selectedLabel', "ασθενείς")}
        onClearSelection={() => setSelectedKeys([])}
        bulkActions={(
          <>
            <Button variant="secondary" size="sm" icon={<Printer size={16} />} onClick={printSelectedPatients}>{t('patients.printPdf', "Εκτύπωση / PDF")}</Button>
            <Button variant="secondary" size="sm" icon={<Download size={16} />} onClick={exportSelectedPatients}>{t('patients.exportCsv', "Εξαγωγή CSV")}</Button>
          </>
        )}
        columns={columns}
        rows={filteredPatients}
        getRowKey={(patient) => patient.id}
        onRowClick={(patient) => navigate(routeFor.patientWorkflow(patient.id))}
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        sort={sort}
        onSortChange={setSort}
        ariaLabel={t('patients.registryAria', "Μητρώο ασθενών")}
        footer={<span>{clinicalLoading?t('common.loading',"Φόρτωση…"):`${filteredPatients.length} ${t('patients.records', "εγγραφές")}${selectedKeys.length ? ` · ${selectedKeys.length} ${t('patients.selected', "επιλεγμένες")}` : ''}`}</span>}
        emptyTitle={clinicalLoading?t('common.loading',"Φόρτωση…"):t('patients.noRecords',"Δεν υπάρχουν ασθενείς")}
      />
    </PageChrome>
    </>
  )
}