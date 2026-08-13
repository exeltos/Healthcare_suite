import { notifyAction } from '../core/feedback/index'
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { APP_EVENTS, useAppEvents } from '../../core/events'
import {
  loadPatientRegistry,
  loadPatientSourceConfig,
} from '../../services/patientService'
import { loadPatientCases } from '../../services/patientCasesService'
import {
  EntryFormFooter,
  EntryFormHeader,
  EntryFormStepper,
} from '../forms/EntryFormChrome'

import {
  entryTypes,
  emptyWhoObservation,
  emptyEnvironmentSession,
  emptyEnvironmentSample,
  emptyNewPatient,
  emptyEntry,
} from './NewEntryLauncher.config'
import { HybridInput, SmartSelect } from './NewEntryLauncher.parts'
import { createWhoSession } from './NewEntryLauncher.logic'
import { activeMasterItems, loadMasterData } from '../../services/masterDataService'
import { persistNewEntry } from './NewEntryLauncher.persistence'
import { EnvironmentEntryFlow, WhoEntryFlow } from './NewEntryLauncher.flows'
import { useI18n } from '../../i18n'
import './NewEntryLauncher.css'

export default function NewEntryLauncher({ open, onClose, initialTypeId = '' }) {
  const { language } = useI18n()
  const L = (el,en) => language === 'en' ? en : el
  const [step, setStep] = useState(1)
  const [selectedTypeId, setSelectedTypeId] = useState('')
  const [mode, setMode] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [createNewCase, setCreateNewCase] = useState(false)
  const [newPatient, setNewPatient] = useState(emptyNewPatient)
  const [entry, setEntry] = useState(emptyEntry)
  const [savedMessage, setSavedMessage] = useState('')
  const [masterData, setMasterData] = useState(loadMasterData)
  const [patientRegistry, setPatientRegistry] = useState(
    loadPatientRegistry,
  )
  const [patientSourceConfig, setPatientSourceConfig] = useState(
    loadPatientSourceConfig,
  )

  const [whoSession, setWhoSession] = useState(createWhoSession)
  const [whoObservations, setWhoObservations] = useState([])
  const [whoObservation, setWhoObservation] = useState(emptyWhoObservation)

  const [environmentSession, setEnvironmentSession] =
    useState(emptyEnvironmentSession)
  const [environmentSamples, setEnvironmentSamples] = useState([])
  const [environmentSample, setEnvironmentSample] =
    useState(emptyEnvironmentSample)


  useLayoutEffect(() => {
    if (!open || !initialTypeId) return

    chooseEntryType(initialTypeId)
  }, [open, initialTypeId])

  useAppEvents([
    APP_EVENTS.MASTER_DATA_UPDATED,
    APP_EVENTS.PATIENT_REGISTRY_UPDATED,
    APP_EVENTS.PATIENT_CONFIG_UPDATED,
  ], () => {
    setMasterData(loadMasterData())
    setPatientRegistry(loadPatientRegistry())
    setPatientSourceConfig(loadPatientSourceConfig())
  }, { includeStorage: true })

  const selectedType = useMemo(
    () => entryTypes.find((item) => item.id === selectedTypeId) || null,
    [selectedTypeId],
  )

  const selectedPatient = useMemo(
    () =>
      patientRegistry.find(
        (patient) => String(patient.id) === String(selectedPatientId),
      ) || null,
    [selectedPatientId, patientRegistry],
  )

  const availableCases = useMemo(() => {
    if (!selectedPatient) return []
    return loadPatientCases(selectedPatient.id)
  }, [selectedPatient])


  const departmentOptions = useMemo(
    () => activeMasterItems(masterData, 'departments'),
    [masterData],
  )

  const microorganismOptions = useMemo(
    () => activeMasterItems(masterData, 'microorganisms'),
    [masterData],
  )

  const professionalCategoryOptions = useMemo(
    () => activeMasterItems(masterData, 'professional-categories'),
    [masterData],
  )

  const environmentPointOptions = useMemo(
    () => activeMasterItems(masterData, 'environment-points'),
    [masterData],
  )

  if (!open) return null

  function resetAndClose() {
    setStep(1)
    setSelectedTypeId('')
    setMode('')
    setSelectedPatientId('')
    setSelectedCaseId('')
    setCreateNewCase(false)
    setNewPatient(emptyNewPatient)
    setEntry(emptyEntry)
    setSavedMessage('')
    setWhoSession(createWhoSession())
    setWhoObservations([])
    setWhoObservation(emptyWhoObservation)

    setEnvironmentSession(emptyEnvironmentSession)
    setEnvironmentSamples([])
    setEnvironmentSample(emptyEnvironmentSample)
    onClose()
  }

  function chooseEntryType(typeId) {
    setSelectedTypeId(typeId)
    setMode('')
    setSelectedPatientId('')
    setSelectedCaseId('')
    setCreateNewCase(false)
    setSavedMessage('')

    const directWithoutPatientTypes = [
      'hand-hygiene',
      'environment',
      'water',
      'staff',
    ]

    if (directWithoutPatientTypes.includes(typeId)) {
      const today = new Date().toLocaleDateString(language === 'en' ? 'en-GB' : 'el-GR')

      setMode('without-patient')
      setEntry((current) => ({
        ...current,
        date: today,
      }))

      if (typeId === 'hand-hygiene') {
        setWhoSession((current) => ({
          ...current,
          date: today,
        }))
      }

      if (typeId === 'environment') {
        setEnvironmentSession((current) => ({
          ...current,
          date: today,
        }))
      }

      setStep(4)
      return
    }

    setStep(2)
  }

  function chooseMode(nextMode) {
    if (
      nextMode === 'new-patient' &&
      !patientSourceConfig.allowManualCreation
    ) {
      notifyAction(
        'Η δημιουργία νέου ασθενούς έχει απενεργοποιηθεί από τις Ρυθμίσεις.',
      )
      return
    }

    if (selectedType?.patientRequired && nextMode === 'without-patient') {
      notifyAction('Αυτός ο τύπος καταχώρησης πρέπει να συνδεθεί με ασθενή.')
      return
    }

    setMode(nextMode)
    setSavedMessage('')

    if (nextMode === 'without-patient') {
      setEntry((current) => ({
        ...current,
        date: new Date().toLocaleDateString('el-GR'),
      }))
      setStep(4)
      return
    }

    setStep(3)
  }

  function continueToEntry() {
    if (mode === 'existing-patient' && !selectedPatient) {
      notifyAction('Επιλέξτε ασθενή.')
      return
    }

    if (mode === 'new-patient') {
      if (
        !newPatient.fullName ||
        !newPatient.patientCode ||
        !newPatient.department
      ) {
        notifyAction('Συμπληρώστε ονοματεπώνυμο, κωδικό και τμήμα.')
        return
      }
    }

    const department =
      mode === 'existing-patient'
        ? selectedPatient?.department || ''
        : newPatient.department

    setEntry((current) => ({
      ...current,
      date: current.date || new Date().toLocaleDateString('el-GR'),
      department,
    }))

    setStep(4)
  }


  async function saveEntry(event) {
    event.preventDefault()
    const result = await persistNewEntry({
      selectedType, mode, selectedPatient, availableCases, selectedCaseId, createNewCase,
      newPatient, entry, whoSession, whoObservations, environmentSession, environmentSamples,
    })
    if (!result.ok) {
      if (result.error) notifyAction(result.error)
      return
    }
    if (result.patientRegistryChanged) setPatientRegistry(loadPatientRegistry())
    setSavedMessage('Η καταχώρηση αποθηκεύτηκε επιτυχώς.')
  }

  const modeLabel =
    mode === 'without-patient'
      ? 'Χωρίς ασθενή'
      : mode === 'existing-patient'
        ? 'Υπάρχων ασθενής'
        : 'Νέος ασθενής'

  const progressSteps = initialTypeId
    ? [
        { id: 'details', label: 'Στοιχεία' },
        { id: 'observations', label: 'Παρατηρήσεις' },
        { id: 'completion', label: 'Ολοκλήρωση' },
      ]
    : [
        { id: 'type', label: 'Τύπος' },
        { id: 'connection', label: 'Σύνδεση' },
        ...(mode && mode !== 'without-patient'
          ? [{ id: 'patient', label: 'Ασθενής' }]
          : []),
        { id: 'entry', label: 'Καταχώρηση' },
      ]

  const progressActiveStep = initialTypeId
    ? whoObservations.length > 0
      ? 3
      : 2
    : step === 4 && mode === 'without-patient'
      ? progressSteps.length
      : Math.min(step, progressSteps.length)

  return (
    <div className="hybrid-launcher-backdrop" onMouseDown={resetAndClose}>
      <section
        className="hybrid-launcher"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <EntryFormHeader
          eyebrow={initialTypeId ? L('Πρόληψη λοιμώξεων','Infection Prevention') : 'Healthcare Suite'}
          title={initialTypeId === 'hand-hygiene' ? L('Νέα παρατήρηση Υγιεινής Χεριών','New Hand Hygiene Observation') : L('Νέα καταχώρηση','New Entry')}
          description={
            initialTypeId === 'hand-hygiene'
              ? L('Καταγραφή συνεδρίας και ευκαιριών σύμφωνα με τα 5 Σημεία του Παγκόσμιου Οργανισμού Υγείας.','Record a session and opportunities according to the WHO 5 Moments.')
              : L('Επιλέξτε τον τύπο καταχώρησης και ακολουθήστε τα αντίστοιχα βήματα.','Select the entry type and follow the corresponding steps.')
          }
          onClose={resetAndClose}
        />

        <EntryFormStepper
          steps={progressSteps}
          activeStep={progressActiveStep}
        />

        <div className="hybrid-launcher-body">
          {step === 1 && (
            <div className="hybrid-type-grid">
              {entryTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => chooseEntryType(type.id)}
                >
                  <span className="hybrid-type-icon">{type.icon}</span>
                  <strong>{type.label}</strong>
                  <small>{type.description}</small>
                </button>
              ))}
            </div>
          )}

          {step === 2 && selectedType && (
            <div className="hybrid-section">
              <div className="hybrid-selected-type">
                <span>{selectedType.icon}</span>
                <div>
                  <small>Επιλεγμένη καταχώρηση</small>
                  <strong>{selectedType.label}</strong>
                </div>
              </div>

              <div className="hybrid-section-heading">
                <span>Σύνδεση καταχώρησης</span>
                <h3>Ποιον αφορά;</h3>
              </div>

              <div className="hybrid-mode-grid">
                {!selectedType.patientRequired && (
                  <button
                    type="button"
                    onClick={() => chooseMode('without-patient')}
                  >
                    <span className="hybrid-mode-icon">◎</span>
                    <strong>Χωρίς ασθενή</strong>
                    <small>
                      Αυτόνομη καταχώρηση χωρίς δημιουργία καρτέλας ασθενούς.
                    </small>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => chooseMode('existing-patient')}
                >
                  <span className="hybrid-mode-icon">⌕</span>
                  <strong>Υπάρχων ασθενής</strong>
                  <small>
                    Αναζήτηση ασθενούς και επιλογή υπάρχουσας ή νέας
                    νοσηλείας.
                  </small>
                </button>

                <button
                  type="button"
                  onClick={() => chooseMode('new-patient')}
                >
                  <span className="hybrid-mode-icon">＋</span>
                  <strong>Νέος ασθενής</strong>
                  <small>
                    Γρήγορη δημιουργία ασθενούς και νοσηλείας μέσα από
                    την καταχώρηση.
                  </small>
                </button>
              </div>
            </div>
          )}

          {step === 3 && mode === 'existing-patient' && (
            <div className="hybrid-section">
              <div className="hybrid-section-heading">
                <span>{selectedType?.label}</span>
                <h3>Επιλογή ασθενούς και νοσηλείας</h3>
              </div>

              <label className="hybrid-field full">
                <span>Ασθενής</span>
                <select
                  value={selectedPatientId}
                  onChange={(event) => {
                    setSelectedPatientId(event.target.value)
                    setSelectedCaseId('')
                    setCreateNewCase(false)
                  }}
                >
                  <option value="">Επιλέξτε ασθενή</option>
                  {patientRegistry.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.fullName} · {patient.patientCode} ·{' '}
                      {patient.department}
                    </option>
                  ))}
                </select>
              </label>

              {selectedPatient && (
                <>
                  <div className="hybrid-patient-summary">
                    <div>
                      <span>Ασθενής</span>
                      <strong>{selectedPatient.fullName}</strong>
                    </div>
                    <div>
                      <span>Τμήμα</span>
                      <strong>{selectedPatient.department}</strong>
                    </div>
                    <div>
                      <span>Θάλαμος</span>
                      <strong>{selectedPatient.room || '—'}</strong>
                    </div>
                    <div>
                      <span>Κωδικός</span>
                      <strong>{selectedPatient.patientCode}</strong>
                    </div>
                  </div>

                  <label className="hybrid-check">
                    <input
                      type="checkbox"
                      checked={createNewCase}
                      onChange={(event) => {
                        setCreateNewCase(event.target.checked)
                        setSelectedCaseId('')
                      }}
                    />
                    <span>Δημιουργία νέας νοσηλείας</span>
                  </label>

                  {!createNewCase && (
                    <label className="hybrid-field full">
                      <span>Υπάρχουσα νοσηλεία</span>
                      <select
                        value={selectedCaseId}
                        onChange={(event) =>
                          setSelectedCaseId(event.target.value)
                        }
                      >
                        <option value="">
                          Χωρίς συγκεκριμένη νοσηλεία
                        </option>
                        {availableCases.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.admissionDate} · {item.department} ·{' '}
                            {item.status}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              )}
            </div>
          )}

          {step === 3 && mode === 'new-patient' && (
            <div className="hybrid-section">
              <div className="hybrid-section-heading">
                <span>{selectedType?.label}</span>
                <h3>Γρήγορη δημιουργία ασθενούς</h3>
              </div>

              <div className="hybrid-form-grid">
                <HybridInput
                  label="Ονοματεπώνυμο"
                  value={newPatient.fullName}
                  onChange={(value) =>
                    setNewPatient((current) => ({
                      ...current,
                      fullName: value,
                    }))
                  }
                />

                <HybridInput
                  label="Κωδικός ασθενούς"
                  value={newPatient.patientCode}
                  onChange={(value) =>
                    setNewPatient((current) => ({
                      ...current,
                      patientCode: value,
                    }))
                  }
                />

                <HybridInput
                  label="ΑΜΚΑ"
                  value={newPatient.amka}
                  onChange={(value) =>
                    setNewPatient((current) => ({
                      ...current,
                      amka: value,
                    }))
                  }
                />

                <SmartSelect
                  label="Τμήμα"
                  value={newPatient.department}
                  options={departmentOptions}
                  placeholder="Αναζήτηση τμήματος..."
                  onChange={(value) =>
                    setNewPatient((current) => ({
                      ...current,
                      department: value,
                    }))
                  }
                />

                <HybridInput
                  label="Θάλαμος / Κλίνη"
                  value={newPatient.room}
                  onChange={(value) =>
                    setNewPatient((current) => ({
                      ...current,
                      room: value,
                    }))
                  }
                />

                <HybridInput
                  label="Ημερομηνία εισαγωγής"
                  value={newPatient.admissionDate}
                  onChange={(value) =>
                    setNewPatient((current) => ({
                      ...current,
                      admissionDate: value,
                    }))
                  }
                />

                <div className="full">
                  <HybridInput
                    label="Κύρια διάγνωση"
                    value={newPatient.primaryDiagnosis}
                    onChange={(value) =>
                      setNewPatient((current) => ({
                        ...current,
                        primaryDiagnosis: value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && selectedType?.id === 'hand-hygiene' && (
            <WhoEntryFlow
              whoSession={whoSession}
              setWhoSession={setWhoSession}
              whoObservation={whoObservation}
              setWhoObservation={setWhoObservation}
              whoObservations={whoObservations}
              setWhoObservations={setWhoObservations}
              departmentOptions={departmentOptions}
              professionalCategoryOptions={professionalCategoryOptions}
              savedMessage={savedMessage}
              onSubmit={saveEntry}
            />
          )}

          {step === 4 && selectedType?.id === 'environment' && (
            <EnvironmentEntryFlow
              selectedType={selectedType}
              environmentSession={environmentSession}
              setEnvironmentSession={setEnvironmentSession}
              environmentSample={environmentSample}
              setEnvironmentSample={setEnvironmentSample}
              environmentSamples={environmentSamples}
              setEnvironmentSamples={setEnvironmentSamples}
              departmentOptions={departmentOptions}
              environmentPointOptions={environmentPointOptions}
              microorganismOptions={microorganismOptions}
              savedMessage={savedMessage}
              setSavedMessage={setSavedMessage}
              setStep={setStep}
              onSubmit={saveEntry}
            />
          )}

          {step === 4 && selectedType && selectedType.id !== 'hand-hygiene' &&
            selectedType.id !== 'environment' && (
            <form className="hybrid-section" onSubmit={saveEntry}>
              <div className="hybrid-selected-type">
                <span>{selectedType.icon}</span>
                <div>
                  <small>{modeLabel}</small>
                  <strong>{selectedType.label}</strong>
                </div>
              </div>

              <div className="hybrid-section-heading">
                <span>Στοιχεία καταχώρησης</span>
                <h3>{selectedType.label}</h3>
              </div>

              <div className="hybrid-form-grid">
                <HybridInput
                  label="Ημερομηνία"
                  value={entry.date}
                  onChange={(value) =>
                    setEntry((current) => ({
                      ...current,
                      date: value,
                    }))
                  }
                />

                <SmartSelect
                  label="Τμήμα / Χώρος"
                  value={entry.department}
                  options={departmentOptions}
                  placeholder="Αναζήτηση τμήματος..."
                  allowCustom
                  onChange={(value) =>
                    setEntry((current) => ({
                      ...current,
                      department: value,
                    }))
                  }
                />

                <div className="full">
                  <HybridInput
                    label="Τίτλος / Κατηγορία"
                    value={entry.title}
                    onChange={(value) =>
                      setEntry((current) => ({
                        ...current,
                        title: value,
                      }))
                    }
                  />
                </div>

                <div className="full">
                  <HybridInput
                    label="Αποτέλεσμα"
                    value={entry.result}
                    onChange={(value) =>
                      setEntry((current) => ({
                        ...current,
                        result: value,
                      }))
                    }
                  />
                </div>

                <label className="hybrid-field full">
                  <span>Σημειώσεις</span>
                  <textarea
                    value={entry.notes}
                    onChange={(event) =>
                      setEntry((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              {savedMessage && (
                <div className="hybrid-success">{savedMessage}</div>
              )}

              <div className="hybrid-save-row">
                <button
                  type="button"
                  onClick={() => {
                    setSavedMessage('')
                    setStep(mode === 'without-patient' ? 1 : 3)
                  }}
                >
                  Πίσω
                </button>

                <button className="primary" type="submit">
                  Αποθήκευση καταχώρησης
                </button>
              </div>
            </form>
          )}
        </div>

        {(step === 2 || step === 3) && (
          <EntryFormFooter
            onCancel={resetAndClose}
            showBack
            onBack={() => setStep(step === 2 ? 1 : 2)}
            primaryLabel={step === 3 ? L('Επόμενο','Next') : L('Συνέχεια','Continue')}
            onPrimary={step === 3 ? continueToEntry : undefined}
            primaryDisabled={step === 2}
          />
        )}

        {step === 4 && selectedType?.id === 'hand-hygiene' && (
          <EntryFormFooter
            onCancel={resetAndClose}
            showBack={!initialTypeId}
            onBack={() => {
              setSavedMessage('')
              setStep(1)
            }}
            primaryLabel={L('Αποθήκευση ελέγχου WHO','Save WHO observation')}
            primaryType="submit"
            form="hand-hygiene-entry-form"
            primaryDisabled={whoObservations.length === 0}
          />
        )}


      </section>
    </div>
  )
}
