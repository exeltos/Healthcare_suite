import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { APP_EVENTS } from '../../core/events'
import { loadMasterDataWithFallback } from '../../services/masterDataService'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import {
  Activity,
  Clock3,
  FileText,
  FlaskConical,
  Plus,
  Search,
  ShieldAlert,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react'

import './PatientSamplesPage.css'
import DynamicFormRenderer from '../../components/forms/DynamicFormRenderer'
import { getTemplatesForContext } from '../../services/formTemplatesService'
import HybridPatientSelector from '../../components/core/HybridPatientSelector/HybridPatientSelector'
import {
  loadPatientSamples,
} from '../../services/patientSamplesService'
import { deleteClinicalPatientSample, loadClinicalPatientSamples, saveClinicalPatientSample } from '../../services/backend/clinicalDirectoryService'

import { Button, FormActions, PageHeader, StatCard } from '../../components/core'

const emptySample = {
  patientName: '',
  patientCode: '',
  department: '',
  admissionDate: '',
  sampleType: '',
  sampleReason: 'Screening',
  collectionDate: '',
  collectionTime: '',
  collector: '',
  status: 'Εκκρεμεί',
  microorganism: '',
  resistance: '',
  resultDate: '',
  resultNotes: '',
  relatedInfection: '',
  relatedIsolation: '',
  requiresIsolation: false,
  requiresInfectionReview: false,
  notes: '',
  attachment: null,
  questionnaire: null,
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
  'sample-types': [
    { id: 'sam-1', name: 'Αίμα', status: 'Ενεργό' },
    { id: 'sam-2', name: 'Ούρα', status: 'Ενεργό' },
    { id: 'sam-3', name: 'Πτύελα', status: 'Ενεργό' },
    { id: 'sam-4', name: 'BAL', status: 'Ενεργό' },
    { id: 'sam-5', name: 'Ρινικό επίχρισμα', status: 'Ενεργό' },
    { id: 'sam-6', name: 'Ορθικό επίχρισμα', status: 'Ενεργό' },
  ],
}

function loadMasterData() {
  return loadMasterDataWithFallback(fallbackMasterData)
}

function loadSamples() {
  return loadPatientSamples()
}

function activeItems(masterData, key) {
  return (masterData[key] || []).filter(
    (item) => item.status !== 'Ανενεργό',
  )
}

export default function PatientSamplesPage() {
  const [masterData, setMasterData] = useState(loadMasterData)
  const [records, setRecords] = useState(loadSamples)
  useEffect(()=>{loadClinicalPatientSamples().then(setRecords).catch(()=>{})},[])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Όλα')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [formData, setFormData] = useState(emptySample)
  const [questionnaireErrors, setQuestionnaireErrors] = useState({})

  useAppEvents(APP_EVENTS.MASTER_DATA_UPDATED, () => {
    setMasterData(loadMasterData())
  }, { includeStorage: true })

  const departments = useMemo(
    () => activeItems(masterData, 'departments'),
    [masterData],
  )

  const microorganisms = useMemo(
    () => activeItems(masterData, 'microorganisms'),
    [masterData],
  )

  const sampleTypes = useMemo(
    () => activeItems(masterData, 'sample-types'),
    [masterData],
  )

  const questionnaireContext = useMemo(() => {
    if (!['Καλλιέργεια', 'Διερεύνηση λοίμωξης'].includes(formData.sampleReason)) return ''
    const type = String(formData.sampleType || '').toLocaleLowerCase('el-GR')
    if (type.includes('ούρ') || type.includes('ουρ')) return 'Ουροκαλλιέργεια'
    if (type.includes('αίμα') || type.includes('αιμα')) return 'Αιμοκαλλιέργεια'
    return formData.sampleType || ''
  }, [formData.sampleReason, formData.sampleType])

  const activeQuestionnaire = useMemo(() => {
    if (!questionnaireContext) return null
    return getTemplatesForContext('patient-cultures', questionnaireContext)[0] || null
  }, [questionnaireContext])

  const questionnaireAnswers = formData.questionnaire?.answers || {}

  function questionVisible(question, answers) {
    if (!question.condition) return true
    const current = answers?.[question.condition.questionId]
    if (question.condition.operator === 'equals') return current === question.condition.value
    if (question.condition.operator === 'not-equals') return current !== question.condition.value
    return true
  }

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
          record.sampleType,
          record.sampleReason,
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

  const stats = useMemo(() => {
    const total = records.length
    const pending = records.filter(
      (record) => record.status === 'Εκκρεμεί',
    ).length
    const positive = records.filter(
      (record) => record.status === 'Θετικό',
    ).length
    const screening = records.filter(
      (record) => record.sampleReason === 'Screening',
    ).length

    return { total, pending, positive, screening }
  }, [records])

  function openNewRecord() {
    setSelectedRecord(null)
    setFormData({
      ...emptySample,
      collectionDate: new Date().toLocaleDateString('el-GR'),
    })
    setQuestionnaireErrors({})
    setDrawerOpen(true)
  }

  function openRecord(record) {
    setSelectedRecord(record)
    setFormData({
      ...record,
      attachment: null,
      questionnaire: record.questionnaire || null,
    })
    setQuestionnaireErrors({})
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setSelectedRecord(null)
    setFormData(emptySample)
    setQuestionnaireErrors({})
  }

  async function saveRecord(event) {
    event.preventDefault()

    if (
      !formData.patientName ||
      !formData.department ||
      !formData.sampleType ||
      !formData.collectionDate
    ) {
      notifyAction(
        'Συμπληρώστε ασθενή, τμήμα, είδος δείγματος και ημερομηνία λήψης.',
      )
      return
    }

    if (activeQuestionnaire) {
      const answers = questionnaireAnswers
      const errors = {}
      activeQuestionnaire.questions.forEach((question) => {
        if (!question.required || !questionVisible(question, answers)) return
        const value = answers[question.id]
        if (value === '' || value == null || (Array.isArray(value) && value.length === 0)) errors[question.id] = 'Το πεδίο είναι υποχρεωτικό.'
      })
      if (Object.keys(errors).length) {
        setQuestionnaireErrors(errors)
        notifyAction('Συμπληρώστε τις υποχρεωτικές ερωτήσεις του ερωτηματολογίου.')
        return
      }
    }

    const attachmentInfo = formData.attachment
      ? {
          name: formData.attachment.name,
          size: formData.attachment.size,
          type: formData.attachment.type,
        }
      : selectedRecord?.attachmentInfo || null

    const nextRecord = {
      ...formData,
      id: selectedRecord?.id || `PS-${Date.now()}`,
      attachment: undefined,
      attachmentInfo,
      questionnaire: activeQuestionnaire ? {
        templateId: activeQuestionnaire.id,
        templateName: activeQuestionnaire.name,
        context: questionnaireContext,
        answers: questionnaireAnswers,
      } : null,
      updatedAt: new Date().toISOString(),
    }

    await saveClinicalPatientSample(nextRecord)
    setRecords(await loadClinicalPatientSamples())
    closeDrawer()
  }

  async function deleteRecord(recordId) {
    if (!confirmAction('Να διαγραφεί το δείγμα ασθενούς;')) {
      return
    }

    await deleteClinicalPatientSample(recordId)
    setRecords(await loadClinicalPatientSamples())
    closeDrawer()
  }

  return (
    <section className="patient-samples-page">
      <PageHeader
        eyebrow="Healthcare Suite"
        title="Δείγματα Ασθενών"
        description="Screening, καλλιέργειες, αποτελέσματα και σύνδεση με λοιμώξεις ή απομονώσεις."
        actions={
          <Button icon={<Plus size={18} />} onClick={openNewRecord}>
            Νέο δείγμα
          </Button>
        }
      />

      <div className="patient-samples-kpi-grid">
        <StatCard
          icon={FlaskConical}
          label="Σύνολο δειγμάτων"
          value={stats.total}
        />
        <StatCard
          icon={Clock3}
          label="Εκκρεμή"
          value={stats.pending}
          tone="warning"
        />
        <StatCard
          icon={ShieldAlert}
          label="Θετικά"
          value={stats.positive}
          tone="danger"
        />
        <StatCard
          icon={Activity}
          label="Screening"
          value={stats.screening}
          tone="primary"
        />
      </div>

      <div className="patient-samples-toolbar">
        <label className="patient-samples-search">
          <Search size={18} />
          <input
            value={search}
            placeholder="Αναζήτηση ασθενούς, δείγματος ή μικροοργανισμού..."
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option>Όλα</option>
          <option>Εκκρεμεί</option>
          <option>Αρνητικό</option>
          <option>Θετικό</option>
        </select>
      </div>

      <div className="patient-samples-table-card">
        <div className="patient-samples-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Κωδικός</th>
                <th>Ασθενής</th>
                <th>Τμήμα</th>
                <th>Δείγμα</th>
                <th>Λόγος</th>
                <th>Ημερομηνία</th>
                <th>Κατάσταση</th>
                <th>Μικροοργανισμός</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id} className="core-record-row" role="button" tabIndex={0} onClick={() => openRecord(record)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openRecord(record) } }}>
                  <td>{record.id}</td>
                  <td>
                    <button
                      className="patient-sample-patient-link"
                      type="button"
                      onClick={() => openRecord(record)}
                    >
                      <strong>{record.patientName}</strong>
                      <span>{record.patientCode || 'Χωρίς κωδικό'}</span>
                    </button>
                  </td>
                  <td>{record.department}</td>
                  <td>{record.sampleType}</td>
                  <td>{record.sampleReason}</td>
                  <td>{record.collectionDate}</td>
                  <td>
                    <span
                      className={`patient-sample-status status-${record.status}`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td>{record.microorganism || '—'}</td>
                </tr>
              ))}

              {filteredRecords.length === 0 && (
                <tr>
                  <td className="patient-samples-empty" colSpan={8}>
                    Δεν βρέθηκαν δείγματα ασθενών.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drawerOpen && (
        <div
          className="patient-sample-drawer-backdrop"
          onMouseDown={closeDrawer}
        >
          <aside
            className="patient-sample-drawer"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="patient-sample-drawer-header">
              <div>
                <span>Καρτέλα δείγματος</span>
                <h2>
                  {selectedRecord ? selectedRecord.id : 'Νέο δείγμα'}
                </h2>
              </div>

              <button type="button" onClick={closeDrawer}>
                <X size={20} />
              </button>
            </header>

            <form onSubmit={saveRecord}>
              <div className="patient-sample-drawer-body">
                <section className="patient-sample-form-section">
                  <SectionHeading
                    icon={<Stethoscope size={19} />}
                    eyebrow="Ασθενής"
                    title="Στοιχεία ασθενούς"
                  />

                  <div className="patient-sample-form-grid">
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

                <section className="patient-sample-form-section">
                  <SectionHeading
                    icon={<FlaskConical size={19} />}
                    eyebrow="Δειγματοληψία"
                    title="Στοιχεία δείγματος"
                  />

                  <div className="patient-sample-form-grid">
                    <SelectField
                      label="Είδος δείγματος"
                      value={formData.sampleType}
                      options={sampleTypes}
                      onChange={(value) => {
                        setFormData((current) => ({
                          ...current,
                          sampleType: value,
                          questionnaire: null,
                        }))
                        setQuestionnaireErrors({})
                      }}
                    />

                    <StaticSelectField
                      label="Λόγος λήψης"
                      value={formData.sampleReason}
                      options={[
                        'Screening',
                        'Καλλιέργεια',
                        'Επανέλεγχος',
                        'Διερεύνηση λοίμωξης',
                        'Άλλο',
                      ]}
                      onChange={(value) => {
                        setFormData((current) => ({
                          ...current,
                          sampleReason: value,
                          questionnaire: null,
                        }))
                        setQuestionnaireErrors({})
                      }}
                    />

                    <Field
                      label="Ημερομηνία λήψης"
                      type="date"
                      value={formData.collectionDate}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          collectionDate: value,
                        }))
                      }
                    />

                    <Field
                      label="Ώρα λήψης"
                      type="time"
                      value={formData.collectionTime}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          collectionTime: value,
                        }))
                      }
                    />

                    <Field
                      label="Δειγματολήπτης"
                      value={formData.collector}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          collector: value,
                        }))
                      }
                    />
                  </div>
                </section>

                {activeQuestionnaire && (
                  <section className="patient-sample-form-section patient-sample-questionnaire-section">
                    <SectionHeading
                      icon={<FileText size={19} />}
                      eyebrow="Έτοιμο ερωτηματολόγιο"
                      title={activeQuestionnaire.name}
                    />
                    <p className="patient-sample-questionnaire-description">{activeQuestionnaire.description}</p>
                    <DynamicFormRenderer
                      template={activeQuestionnaire}
                      answers={questionnaireAnswers}
                      errors={questionnaireErrors}
                      onChange={(answers) => {
                        setQuestionnaireErrors({})
                        setFormData((current) => ({
                          ...current,
                          questionnaire: {
                            templateId: activeQuestionnaire.id,
                            templateName: activeQuestionnaire.name,
                            context: questionnaireContext,
                            answers,
                          },
                        }))
                      }}
                    />
                  </section>
                )}

                <section className="patient-sample-form-section">
                  <SectionHeading
                    icon={<Activity size={19} />}
                    eyebrow="Αποτέλεσμα"
                    title="Μικροβιολογικό αποτέλεσμα"
                  />

                  <div className="patient-sample-form-grid">
                    <StaticSelectField
                      label="Κατάσταση"
                      value={formData.status}
                      options={[
                        'Εκκρεμεί',
                        'Αρνητικό',
                        'Θετικό',
                      ]}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          status: value,
                        }))
                      }
                    />

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
                      label="Ημερομηνία αποτελέσματος"
                      type="date"
                      value={formData.resultDate}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          resultDate: value,
                        }))
                      }
                    />

                    <label className="patient-sample-full-field">
                      <span>Παρατηρήσεις αποτελέσματος</span>
                      <textarea
                        value={formData.resultNotes}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            resultNotes: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="patient-sample-form-section">
                  <SectionHeading
                    icon={<ShieldAlert size={19} />}
                    eyebrow="Σύνδεση"
                    title="Λοίμωξη και απομόνωση"
                  />

                  <div className="patient-sample-form-grid">
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
                      label="Σχετική απομόνωση"
                      value={formData.relatedIsolation}
                      onChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          relatedIsolation: value,
                        }))
                      }
                    />
                  </div>

                  <div className="patient-sample-actions-grid">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.requiresIsolation}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            requiresIsolation: event.target.checked,
                          }))
                        }
                      />
                      Απαιτείται αξιολόγηση για απομόνωση
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={formData.requiresInfectionReview}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            requiresInfectionReview:
                              event.target.checked,
                          }))
                        }
                      />
                      Απαιτείται αξιολόγηση για λοίμωξη
                    </label>
                  </div>
                </section>

                <section className="patient-sample-form-section">
                  <SectionHeading
                    icon={<FileText size={19} />}
                    eyebrow="Συνημμένο"
                    title="Έγγραφο αποτελέσματος"
                  />

                  <label className="patient-sample-file-field">
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
                    <div className="patient-sample-existing-file">
                      Υπάρχον αρχείο:{' '}
                      <strong>
                        {selectedRecord.attachmentInfo.name}
                      </strong>
                    </div>
                  )}

                  <label className="patient-sample-full-field">
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
                </section>
              </div>

              <footer className="patient-sample-drawer-footer">
                <FormActions
                  onCancel={closeDrawer}
                  destructive={selectedRecord ? (
                    <Button variant="danger" type="button" icon={<Trash2 size={16} />} onClick={() => deleteRecord(selectedRecord.id)}>Διαγραφή</Button>
                  ) : null}
                />
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
    <div className="patient-sample-section-heading">
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
      <div className="patient-sample-smart-field">
        <input
          type={type}
          value={
            type === 'date'
              ? greekToIso(value)
              : value || ''
          }
          onChange={(event) =>
            onChange(
              type === 'date'
                ? isoToGreek(event.target.value)
                : event.target.value,
            )
          }
        />
        {(type === 'date' || type === 'time') && (
          <button
            type="button"
            onClick={() =>
              onChange(
                type === 'date'
                  ? todayGreek()
                  : currentTime(),
              )
            }
          >
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
  if (!year) return ''
  return `${year}-${month}-${day}`
}

function isoToGreek(value) {
  if (!value) return ''
  const [year, month, day] = String(value).split('-')
  return `${day}/${month}/${year}`
}

function todayGreek() {
  return isoToGreek(new Date().toISOString().slice(0, 10))
}

function currentTime() {
  return new Date().toTimeString().slice(0, 5)
}
