import { confirmAction, notifyAction, promptAction } from '../../components/core/feedback/index'
import { useSearchParams } from 'react-router-dom'
import { APP_EVENTS } from '../../core/events'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import {
  Activity,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  Search,
  ShieldAlert,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react'

import './IsolationPage.css'
import HybridPatientSelector from '../../components/core/HybridPatientSelector/HybridPatientSelector'
import { getIsolationStats, ISOLATIONS_EVENT, loadIsolations } from '../../services/isolationsService'
import { deleteClinicalIsolation, loadClinicalIsolations, saveClinicalIsolation } from '../../services/backend/clinicalSupportBackendService'
import { activeMasterItems, loadMasterDataWithFallback } from '../../services/masterDataService'

import { Button, PageHeader, StatCard } from '../../components/core'

const emptyIsolation = {
  patientName: '',
  patientCode: '',
  department: '',
  relatedInfection: '',
  microorganism: '',
  resistance: '',
  isolationType: '',
  startDate: '',
  endDate: '',
  status: 'Ενεργή',
  reason: '',
  responsibleDoctor: '',
  room: '',
  precautions: '',
  outcome: '',
  notes: '',
  attachment: null,
}

const fallbackMasterData = {
  departments: [
    { id: 'dep-1', name: 'ΜΕΘ', status: 'Ενεργό' },
    { id: 'dep-2', name: 'Παθολογική', status: 'Ενεργό' },
    { id: 'dep-3', name: 'Χειρουργική', status: 'Ενεργό' },
    { id: 'dep-4', name: 'Αιμοκάθαρση', status: 'Ενεργό' },
  ],
  microorganisms: [
    { id: 'mic-1', name: 'Klebsiella pneumoniae', status: 'Ενεργό' },
    { id: 'mic-2', name: 'Escherichia coli', status: 'Ενεργό' },
    { id: 'mic-3', name: 'Staphylococcus aureus', status: 'Ενεργό' },
    { id: 'mic-4', name: 'Acinetobacter baumannii', status: 'Ενεργό' },
  ],
  'isolation-types': [
    { id: 'iso-1', name: 'Επαφής', status: 'Ενεργό' },
    { id: 'iso-2', name: 'Σταγονιδίων', status: 'Ενεργό' },
    { id: 'iso-3', name: 'Αερογενής', status: 'Ενεργό' },
    { id: 'iso-4', name: 'Προστατευτική', status: 'Ενεργό' },
    { id: 'iso-5', name: 'Συνδυασμένη', status: 'Ενεργό' },
  ],
}

function loadMasterData() { return loadMasterDataWithFallback(fallbackMasterData) }
const activeItems = activeMasterItems

export default function IsolationPage() {
  const [searchParams] = useSearchParams()
  const [masterData, setMasterData] = useState(loadMasterData)
  const [records, setRecords] = useState(loadIsolations)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'Όλα')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [formData, setFormData] = useState(emptyIsolation)

  useEffect(() => {
    setStatusFilter(searchParams.get('status') || 'Όλα')
  }, [searchParams])

  useAppEvents(APP_EVENTS.MASTER_DATA_UPDATED, () => {
    setMasterData(loadMasterData())
  }, { includeStorage: true })

  async function refreshIsolations(){setRecords(await loadClinicalIsolations())}
  useEffect(()=>{refreshIsolations().catch(()=>{})},[])
  useAppEvents(ISOLATIONS_EVENT, () => {refreshIsolations().catch(()=>{})}, { includeStorage: true })

  const departments = useMemo(
    () => activeItems(masterData, 'departments'),
    [masterData],
  )

  const microorganisms = useMemo(
    () => activeItems(masterData, 'microorganisms'),
    [masterData],
  )

  const isolationTypes = useMemo(
    () => activeItems(masterData, 'isolation-types'),
    [masterData],
  )

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('el-GR')

    return records.filter((record) => {
      const matchesStatus =
        statusFilter === 'Όλα' || record.status === statusFilter

      const matchesSearch =
        !query ||
        [
          record.id,
          record.patientName,
          record.patientCode,
          record.department,
          record.isolationType,
          record.microorganism,
          record.resistance,
          record.room,
        ].some((value) =>
          String(value || '')
            .toLocaleLowerCase('el-GR')
            .includes(query),
        )

      return matchesStatus && matchesSearch
    })
  }, [records, search, statusFilter])

  const stats = useMemo(() => getIsolationStats(records), [records])

  function openNewRecord() {
    setSelectedRecord(null)
    setFormData({
      ...emptyIsolation,
      startDate: new Date().toLocaleDateString('el-GR'),
    })
    setDrawerOpen(true)
  }

  function openRecord(record) {
    setSelectedRecord(record)
    setFormData({
      ...record,
      attachment: null,
    })
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setSelectedRecord(null)
    setFormData(emptyIsolation)
  }

  async function saveRecord(event) {
    event.preventDefault()

    if (
      !formData.patientName ||
      !formData.department ||
      !formData.isolationType ||
      !formData.startDate
    ) {
      notifyAction(
        'Συμπληρώστε ασθενή, τμήμα, τύπο απομόνωσης και ημερομηνία έναρξης.',
      )
      return
    }

    await saveClinicalIsolation({...selectedRecord,...formData,id:selectedRecord?.id||formData.id})
    setRecords(await loadClinicalIsolations())

    closeDrawer()
  }

  function endIsolation() {
    const endDate =
      promptAction(
        'Ημερομηνία λήξης απομόνωσης:',
        new Date().toLocaleDateString('el-GR'),
      ) || ''

    if (!endDate) return

    setFormData((current) => ({
      ...current,
      status: 'Ολοκληρωμένη',
      endDate,
    }))
  }

  function reopenIsolation() {
    setFormData((current) => ({
      ...current,
      status: 'Ενεργή',
      endDate: '',
    }))
  }

  async function deleteRecord(recordId) {
    if (!confirmAction('Να διαγραφεί η απομόνωση;')) {
      return
    }

    await deleteClinicalIsolation(recordId)
    setRecords(await loadClinicalIsolations())
    closeDrawer()
  }

  return (
    <section className="isolations-page">
      <PageHeader
        eyebrow="Healthcare Suite"
        title="Απομονώσεις"
        description="Παρακολούθηση ενεργών και ολοκληρωμένων απομονώσεων ασθενών."
        actions={
          <Button icon={<Plus size={18} />} onClick={openNewRecord}>
            Νέα απομόνωση
          </Button>
        }
      />

      <div className="isolations-kpi-grid">
        <StatCard
          icon={ShieldAlert}
          label="Σύνολο απομονώσεων"
          value={stats.total}
        />
        <StatCard
          icon={Activity}
          label="Ενεργές"
          value={stats.active}
          tone="danger"
        />
        <StatCard
          icon={Stethoscope}
          label="Επαφής"
          value={stats.contact}
          tone="warning"
        />
        <StatCard
          icon={Clock3}
          label="Αερογενείς"
          value={stats.airborne}
          tone="primary"
        />
      </div>

      <div className="isolations-toolbar">
        <label className="isolations-search">
          <Search size={18} />
          <input
            value={search}
            placeholder="Αναζήτηση ασθενούς, τμήματος, τύπου ή μικροοργανισμού..."
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option>Όλα</option>
          <option>Ενεργή</option>
          <option>Ολοκληρωμένη</option>
        </select>
      </div>

      <div className="isolations-table-card">
        <div className="isolations-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Κωδικός</th>
                <th>Ασθενής</th>
                <th>Τμήμα</th>
                <th>Τύπος</th>
                <th>Έναρξη</th>
                <th>Κατάσταση</th>
                <th>Μικροοργανισμός</th>
                <th>Δωμάτιο</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="core-record-row" role="button" tabIndex={0} onClick={() => openRecord(record)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openRecord(record) } }}>
                  <td>{record.id}</td>
                  <td>
                    <button
                      className="isolation-patient-link"
                      type="button"
                      onClick={() => openRecord(record)}
                    >
                      <strong>{record.patientName}</strong>
                      <span>{record.patientCode || 'Χωρίς κωδικό'}</span>
                    </button>
                  </td>
                  <td>{record.department}</td>
                  <td>{record.isolationType}</td>
                  <td>{record.startDate}</td>
                  <td>
                    <span
                      className={`isolation-status status-${record.status}`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td>{record.microorganism || '—'}</td>
                  <td>{record.room || '—'}</td>
                </tr>
              ))}

              {filteredRecords.length === 0 && (
                <tr>
                  <td className="isolations-empty" colSpan={8}>
                    Δεν βρέθηκαν απομονώσεις.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drawerOpen && (
        <div
          className="isolation-drawer-backdrop"
          onMouseDown={closeDrawer}
        >
          <aside
            className="isolation-drawer"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="isolation-drawer-header">
              <div>
                <span>Καρτέλα απομόνωσης</span>
                <h2>
                  {selectedRecord
                    ? selectedRecord.id
                    : 'Νέα απομόνωση'}
                </h2>
              </div>

              <button type="button" onClick={closeDrawer}>
                <X size={20} />
              </button>
            </header>

            <form onSubmit={saveRecord}>
              <div className="isolation-drawer-body">
                <section className="isolation-form-section">
                  <SectionHeading
                    icon={<Stethoscope size={19} />}
                    eyebrow="Ασθενής"
                    title="Στοιχεία ασθενούς"
                  />

                  <div className="isolation-form-grid">
                    <HybridPatientSelector
                      value={formData}
                      onChange={(patientData) =>
                        setFormData((current) => ({
                          ...current,
                          ...patientData,
                        }))
                      }
                    />

                    <SelectField
                      label="Τμήμα"
                      value={formData.department}
                      options={departments}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          department: value,
                        }))
                      }
                    />

                    <Field
                      label="Δωμάτιο / Κλίνη"
                      value={formData.room}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          room: value,
                        }))
                      }
                    />
                  </div>
                </section>

                <section className="isolation-form-section">
                  <SectionHeading
                    icon={<ShieldAlert size={19} />}
                    eyebrow="Απομόνωση"
                    title="Στοιχεία απομόνωσης"
                  />

                  <div className="isolation-form-grid">
                    <SelectField
                      label="Τύπος απομόνωσης"
                      value={formData.isolationType}
                      options={isolationTypes}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          isolationType: value,
                        }))
                      }
                    />

                    <StaticSelectField
                      label="Κατάσταση"
                      value={formData.status}
                      options={['Ενεργή', 'Ολοκληρωμένη']}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          status: value,
                        }))
                      }
                    />

                    <Field
                      label="Ημερομηνία έναρξης"
                      type="date"
                      value={formData.startDate}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          startDate: value,
                        }))
                      }
                    />

                    <Field
                      label="Ημερομηνία λήξης"
                      type="date"
                      value={formData.endDate}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          endDate: value,
                        }))
                      }
                    />

                    <Field
                      label="Σχετική λοίμωξη"
                      value={formData.relatedInfection}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          relatedInfection: value,
                        }))
                      }
                    />

                    <Field
                      label="Υπεύθυνος ιατρός"
                      value={formData.responsibleDoctor}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          responsibleDoctor: value,
                        }))
                      }
                    />

                    <label className="isolation-full-field">
                      <span>Αιτιολογία απομόνωσης</span>
                      <textarea
                        value={formData.reason}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            reason: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="isolation-form-section">
                  <SectionHeading
                    icon={<Activity size={19} />}
                    eyebrow="Μικροβιολογικά στοιχεία"
                    title="Μικροοργανισμός και ανθεκτικότητα"
                  />

                  <div className="isolation-form-grid">
                    <SelectField
                      label="Μικροοργανισμός"
                      value={formData.microorganism}
                      options={microorganisms}
                      allowEmpty
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          microorganism: value,
                        }))
                      }
                    />

                    <StaticSelectField
                      label="Ανθεκτικότητα"
                      value={formData.resistance}
                      options={[
                        '',
                        'MDR',
                        'XDR',
                        'PDR',
                        'CRE',
                        'MRSA',
                        'VRE',
                        'ESBL',
                      ]}
                      allowEmpty
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          resistance: value,
                        }))
                      }
                    />

                    <label className="isolation-full-field">
                      <span>Προφυλάξεις</span>
                      <textarea
                        value={formData.precautions}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            precautions: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="isolation-form-section">
                  <SectionHeading
                    icon={<CheckCircle2 size={19} />}
                    eyebrow="Παρακολούθηση"
                    title="Έκβαση και σημειώσεις"
                  />

                  <div className="isolation-form-grid">
                    <StaticSelectField
                      label="Έκβαση"
                      value={formData.outcome}
                      options={[
                        '',
                        'Σε εξέλιξη',
                        'Ολοκληρώθηκε',
                        'Μεταφορά',
                        'Εξιτήριο',
                      ]}
                      allowEmpty
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          outcome: value,
                        }))
                      }
                    />

                    <label className="isolation-full-field">
                      <span>Σημειώσεις</span>
                      <textarea
                        value={formData.notes}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="isolation-form-section">
                  <SectionHeading
                    icon={<FileText size={19} />}
                    eyebrow="Συνημμένο"
                    title="Έγγραφο απομόνωσης"
                  />

                  <label className="isolation-file-field">
                    <span>PDF ή άλλο αρχείο</span>
                    <input
                      type="file"
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          attachment:
                            event.target.files?.[0] || null,
                        }))
                      }
                    />
                  </label>

                  {selectedRecord?.attachmentInfo && (
                    <div className="isolation-existing-file">
                      Υπάρχον αρχείο:{' '}
                      <strong>
                        {selectedRecord.attachmentInfo.name}
                      </strong>
                    </div>
                  )}
                </section>
              </div>

              <footer className="isolation-drawer-footer">
                {selectedRecord && (
                  <button
                    className="isolation-delete-button"
                    type="button"
                    onClick={() =>
                      deleteRecord(selectedRecord.id)
                    }
                  >
                    <Trash2 size={17} />
                    Διαγραφή
                  </button>
                )}

                <div>
                  {selectedRecord &&
                    formData.status === 'Ενεργή' && (
                      <button
                        type="button"
                        onClick={endIsolation}
                      >
                        Λήξη
                      </button>
                    )}

                  {selectedRecord &&
                    formData.status === 'Ολοκληρωμένη' && (
                      <button
                        type="button"
                        onClick={reopenIsolation}
                      >
                        Αναίρεση λήξης
                      </button>
                    )}

                  <button type="button" onClick={closeDrawer}>
                    Ακύρωση
                  </button>

                  <Button
                    icon={<CheckCircle2 size={18} />}
                    type="submit"
                  >
                    Αποθήκευση
                  </Button>
                </div>
              </footer>
            </form>
          </aside>
        </div>
      )}
    </section>
  )
}

function SectionHeading({ icon, eyebrow, title }) {
  return (
    <div className="isolation-section-heading">
      {icon}
      <div>
        <span>{eyebrow}</span>
        <h3>{title}</h3>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label>
      <span>{label}</span>
      <div className="smart-date-time-field">
        <input
          type={type}
          value={type === 'date' ? greekToIso(value) : value || ''}
          onChange={(event) =>
            onChange(type === 'date' ? isoToGreek(event.target.value) : event.target.value)
          }
        />
        {(type === 'date' || type === 'time') && (
          <button type="button" onClick={() => onChange(type === 'date' ? todayGreek() : currentTime())}>
            {type === 'date' ? 'Σήμερα' : 'Τώρα'}
          </button>
        )}
      </div>
    </label>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
  allowEmpty = false,
}) {
  return (
    <label>
      <span>{label}</span>
      <select
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
      >
        {allowEmpty && <option value="">—</option>}
        {!allowEmpty && <option value="">Επιλέξτε</option>}

        {options.map((option) => (
          <option key={option.id} value={option.name}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function StaticSelectField({
  label,
  value,
  options,
  onChange,
  allowEmpty = false,
}) {
  return (
    <label>
      <span>{label}</span>
      <select
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
      >
        {allowEmpty && !options.includes('') && (
          <option value="">—</option>
        )}

        {options.map((option) => (
          <option key={option || 'empty'} value={option}>
            {option || '—'}
          </option>
        ))}
      </select>
    </label>
  )
}

function greekToIso(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const [day, month, year] = String(value).split('/')
  return year ? `${year}-${month}-${day}` : ''
}
function isoToGreek(value) {
  if (!value) return ''
  const [year, month, day] = String(value).split('-')
  return day ? `${day}/${month}/${year}` : value
}
function todayGreek() { return isoToGreek(new Date().toISOString().slice(0,10)) }
function currentTime() { return new Date().toTimeString().slice(0,5) }
