import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useSearchParams } from 'react-router-dom'
import { APP_EVENTS } from '../../core/events'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import {
  Activity,
  Biohazard,
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

import './InfectionsPage.css'
import HybridPatientSelector from '../../components/core/HybridPatientSelector/HybridPatientSelector'
import { deleteInfection, getInfectionStats, INFECTIONS_EVENT, loadInfections, saveInfection } from '../../services/infectionsService'
import { activeMasterItems, loadMasterDataWithFallback } from '../../services/masterDataService'

import { Button, PageHeader, StatCard } from '../../components/core'

const emptyInfection = {
  patientName: '',
  patientCode: '',
  department: '',
  admissionDate: '',
  infectionDate: '',
  infectionType: '',
  infectionSite: '',
  origin: 'Νοσοκομειακή',
  status: 'Ενεργή',
  microorganism: '',
  resistance: '',
  relatedSample: '',
  isolationType: '',
  diagnosis: '',
  symptoms: '',
  treatment: '',
  responsibleDoctor: '',
  outcome: '',
  notes: '',
  attachment: null,
}

const fallbackMasterData = {
  departments: [
    { id: 'dep-1', name: 'ΜΕΘ', status: 'Ενεργό' },
    { id: 'dep-2', name: 'Χειρουργείο', status: 'Ενεργό' },
    { id: 'dep-3', name: 'Παθολογική', status: 'Ενεργό' },
    { id: 'dep-4', name: 'Αιμοκάθαρση', status: 'Ενεργό' },
  ],
  microorganisms: [
    { id: 'mic-1', name: 'Klebsiella pneumoniae', status: 'Ενεργό' },
    { id: 'mic-2', name: 'Escherichia coli', status: 'Ενεργό' },
    { id: 'mic-3', name: 'Staphylococcus aureus', status: 'Ενεργό' },
    { id: 'mic-4', name: 'Acinetobacter baumannii', status: 'Ενεργό' },
  ],
  'infection-types': [
    {
      id: 'inf-1',
      name: 'Λοίμωξη ουροποιητικού σχετιζόμενη με καθετήρα',
      code: 'CAUTI',
      status: 'Ενεργό',
    },
    {
      id: 'inf-2',
      name: 'Λοίμωξη αιματικής ροής σχετιζόμενη με κεντρική γραμμή',
      code: 'CLABSI',
      status: 'Ενεργό',
    },
    {
      id: 'inf-3',
      name: 'Πνευμονία σχετιζόμενη με αναπνευστήρα',
      code: 'VAP',
      status: 'Ενεργό',
    },
    {
      id: 'inf-4',
      name: 'Λοίμωξη χειρουργικού πεδίου',
      code: 'SSI',
      status: 'Ενεργό',
    },
  ],
  'body-sites': [
    { id: 'bs-1', name: 'Αναπνευστικό', status: 'Ενεργό' },
    { id: 'bs-2', name: 'Ουροποιητικό', status: 'Ενεργό' },
    { id: 'bs-3', name: 'Αίμα', status: 'Ενεργό' },
    { id: 'bs-4', name: 'Δέρμα', status: 'Ενεργό' },
  ],
  'isolation-types': [
    { id: 'iso-1', name: 'Επαφής', status: 'Ενεργό' },
    { id: 'iso-2', name: 'Σταγονιδίων', status: 'Ενεργό' },
    { id: 'iso-3', name: 'Αερογενής', status: 'Ενεργό' },
    { id: 'iso-4', name: 'Προστατευτική', status: 'Ενεργό' },
  ],
}

function loadMasterData() { return loadMasterDataWithFallback(fallbackMasterData) }
const activeItems = activeMasterItems

export default function InfectionsPage() {
  const [searchParams] = useSearchParams()
  const [masterData, setMasterData] = useState(loadMasterData)
  const [records, setRecords] = useState(loadInfections)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') === 'active' ? 'Ενεργή' : (searchParams.get('status') || 'Όλα'))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [formData, setFormData] = useState(emptyInfection)

  useEffect(() => {
    setStatusFilter(searchParams.get('status') === 'active' ? 'Ενεργή' : (searchParams.get('status') || 'Όλα'))
  }, [searchParams])

  useAppEvents(APP_EVENTS.MASTER_DATA_UPDATED, () => {
    setMasterData(loadMasterData())
  }, { includeStorage: true })

  useAppEvents(INFECTIONS_EVENT, () => {
    setRecords(loadInfections())
  }, { includeStorage: true })

  const departments = useMemo(
    () => activeItems(masterData, 'departments'),
    [masterData],
  )

  const microorganisms = useMemo(
    () => activeItems(masterData, 'microorganisms'),
    [masterData],
  )

  const infectionTypes = useMemo(
    () => activeItems(masterData, 'infection-types'),
    [masterData],
  )

  const bodySites = useMemo(
    () => activeItems(masterData, 'body-sites'),
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
          record.infectionType,
          record.microorganism,
          record.resistance,
        ].some((value) =>
          String(value || '')
            .toLocaleLowerCase('el-GR')
            .includes(query),
        )

      return matchesStatus && matchesSearch
    })
  }, [records, search, statusFilter])

  const stats = useMemo(() => getInfectionStats(records), [records])

  function openNewRecord() {
    setSelectedRecord(null)
    setFormData({
      ...emptyInfection,
      infectionDate: new Date().toLocaleDateString('el-GR'),
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
    setFormData(emptyInfection)
  }

  function saveRecord(event) {
    event.preventDefault()

    if (
      !formData.patientName ||
      !formData.department ||
      !formData.infectionDate ||
      !formData.infectionType
    ) {
      notifyAction(
        'Συμπληρώστε ασθενή, τμήμα, ημερομηνία και τύπο λοίμωξης.',
      )
      return
    }

    saveInfection(formData, selectedRecord)
    setRecords(loadInfections())

    closeDrawer()
  }

  function deleteRecord(recordId) {
    if (!confirmAction('Να διαγραφεί η λοίμωξη;')) {
      return
    }

    const nextRecords = deleteInfection(recordId)
    setRecords(nextRecords)
    closeDrawer()
  }

  return (
    <section className="infections-page">
      <PageHeader
        eyebrow="Healthcare Suite"
        title="Λοιμώξεις"
        description="Καταγραφή, αξιολόγηση και παρακολούθηση ενεργών και ολοκληρωμένων λοιμώξεων."
        actions={
          <Button icon={<Plus size={18} />} onClick={openNewRecord}>
            Νέα λοίμωξη
          </Button>
        }
      />

      <div className="infections-kpi-grid">
        <StatCard
          icon={Biohazard}
          label="Σύνολο λοιμώξεων"
          value={stats.total}
        />
        <StatCard
          icon={Activity}
          label="Ενεργές"
          value={stats.active}
          tone="danger"
        />
        <StatCard
          icon={Clock3}
          label="Υπό διερεύνηση"
          value={stats.investigating}
          tone="warning"
        />
        <StatCard
          icon={ShieldAlert}
          label="MDR / XDR / CRE"
          value={stats.resistant}
          tone="danger"
        />
      </div>

      <div className="infections-toolbar">
        <label className="infections-search">
          <Search size={18} />
          <input
            value={search}
            placeholder="Αναζήτηση ασθενούς, λοίμωξης ή μικροοργανισμού..."
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option>Όλα</option>
          <option>Ενεργή</option>
          <option>Υπό διερεύνηση</option>
          <option>Ολοκληρωμένη</option>
        </select>
      </div>

      <div className="infections-table-card">
        <div className="infections-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Κωδικός</th>
                <th>Ασθενής</th>
                <th>Τμήμα</th>
                <th>Τύπος λοίμωξης</th>
                <th>Ημερομηνία</th>
                <th>Κατάσταση</th>
                <th>Μικροοργανισμός</th>
                <th title="Ανθεκτικότητα">ΑΝΘΕΚΤ.</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="core-record-row" role="button" tabIndex={0} onClick={() => openRecord(record)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openRecord(record) } }}>
                  <td>{record.id}</td>
                  <td>
                    <button
                      className="infection-patient-link"
                      type="button"
                      onClick={() => openRecord(record)}
                    >
                      <strong>{record.patientName}</strong>
                      <span>{record.patientCode || 'Χωρίς κωδικό'}</span>
                    </button>
                  </td>
                  <td>{record.department}</td>
                  <td>{record.infectionType}</td>
                  <td>{record.infectionDate}</td>
                  <td>
                    <span
                      className={`infection-status status-${record.status}`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td>{record.microorganism || '—'}</td>
                  <td>
                    {record.resistance ? (
                      <span className="infection-resistance">
                        {record.resistance}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}

              {filteredRecords.length === 0 && (
                <tr>
                  <td className="infections-empty" colSpan={8}>
                    Δεν βρέθηκαν λοιμώξεις.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drawerOpen && (
        <div
          className="infection-drawer-backdrop"
          onMouseDown={closeDrawer}
        >
          <aside
            className="infection-drawer"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="infection-drawer-header">
              <div>
                <span>Καρτέλα λοίμωξης</span>
                <h2>
                  {selectedRecord ? selectedRecord.id : 'Νέα λοίμωξη'}
                </h2>
              </div>

              <button type="button" onClick={closeDrawer}>
                <X size={20} />
              </button>
            </header>

            <form onSubmit={saveRecord}>
              <div className="infection-drawer-body">
                <section className="infection-form-section">
                  <SectionHeading
                    icon={<Stethoscope size={19} />}
                    eyebrow="Ασθενής"
                    title="Στοιχεία ασθενούς"
                  />

                  <div className="infection-form-grid">
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
                      label="Ημερομηνία εισαγωγής"
                      type="date"
                      value={formData.admissionDate}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          admissionDate: value,
                        }))
                      }
                    />
                  </div>
                </section>

                <section className="infection-form-section">
                  <SectionHeading
                    icon={<Biohazard size={19} />}
                    eyebrow="Λοίμωξη"
                    title="Κλινικά στοιχεία"
                  />

                  <div className="infection-form-grid">
                    <Field
                      label="Ημερομηνία λοίμωξης"
                      type="date"
                      value={formData.infectionDate}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          infectionDate: value,
                        }))
                      }
                    />

                    <SelectField
                      label="Τύπος λοίμωξης"
                      value={formData.infectionType}
                      options={infectionTypes}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          infectionType: value,
                        }))
                      }
                    />

                    <SelectField
                      label="Θέση λοίμωξης"
                      value={formData.infectionSite}
                      options={bodySites}
                      allowEmpty
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          infectionSite: value,
                        }))
                      }
                    />

                    <StaticSelectField
                      label="Προέλευση"
                      value={formData.origin}
                      options={[
                        'Νοσοκομειακή',
                        'Κοινότητας',
                        'Σχετιζόμενη με φροντίδα υγείας',
                        'Άγνωστη',
                      ]}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          origin: value,
                        }))
                      }
                    />

                    <StaticSelectField
                      label="Κατάσταση"
                      value={formData.status}
                      options={[
                        'Ενεργή',
                        'Υπό διερεύνηση',
                        'Ολοκληρωμένη',
                      ]}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          status: value,
                        }))
                      }
                    />

                    <Field
                      label="Διάγνωση / Κωδικός"
                      value={formData.diagnosis}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          diagnosis: value,
                        }))
                      }
                    />

                    <label className="infection-full-field">
                      <span>Συμπτώματα / Κλινικά ευρήματα</span>
                      <textarea
                        value={formData.symptoms}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            symptoms: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="infection-form-section">
                  <SectionHeading
                    icon={<ShieldAlert size={19} />}
                    eyebrow="Μικροβιολογικά στοιχεία"
                    title="Μικροοργανισμός και απομόνωση"
                  />

                  <div className="infection-form-grid">
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

                    <Field
                      label="Σχετικό δείγμα"
                      value={formData.relatedSample}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          relatedSample: value,
                        }))
                      }
                    />

                    <SelectField
                      label="Τύπος απομόνωσης"
                      value={formData.isolationType}
                      options={isolationTypes}
                      allowEmpty
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          isolationType: value,
                        }))
                      }
                    />
                  </div>
                </section>

                <section className="infection-form-section">
                  <SectionHeading
                    icon={<CheckCircle2 size={19} />}
                    eyebrow="Παρακολούθηση"
                    title="Αγωγή και έκβαση"
                  />

                  <div className="infection-form-grid">
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

                    <StaticSelectField
                      label="Έκβαση"
                      value={formData.outcome}
                      options={[
                        '',
                        'Σε εξέλιξη',
                        'Ίαση',
                        'Βελτίωση',
                        'Επιπλοκή',
                        'Θάνατος',
                      ]}
                      allowEmpty
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          outcome: value,
                        }))
                      }
                    />

                    <label className="infection-full-field">
                      <span>Θεραπεία / Αντιμικροβιακή αγωγή</span>
                      <textarea
                        value={formData.treatment}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            treatment: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="infection-full-field">
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

                <section className="infection-form-section">
                  <SectionHeading
                    icon={<FileText size={19} />}
                    eyebrow="Συνημμένο"
                    title="Έγγραφο λοίμωξης"
                  />

                  <label className="infection-file-field">
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
                    <div className="infection-existing-file">
                      Υπάρχον αρχείο:{' '}
                      <strong>
                        {selectedRecord.attachmentInfo.name}
                      </strong>
                    </div>
                  )}
                </section>
              </div>

              <footer className="infection-drawer-footer">
                {selectedRecord && (
                  <button
                    className="infection-delete-button"
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
    <div className="infection-section-heading">
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
