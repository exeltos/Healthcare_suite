import { confirmAction, notifyAction } from '../core/feedback/index'
import { EntryFormSection } from '../forms/EntryFormChrome'
import { required, validateValues } from '../../core/forms'
import {
  emptyEnvironmentSample,
  emptyWhoObservation,
  environmentMethods,
  environmentSurfaceTypes,
  whoMoments,
} from './NewEntryLauncher.config'
import {
  EnvironmentSummary,
  HybridInput,
  SmartSelect,
  WhoSummary,
  actionLabel,
} from './NewEntryLauncher.parts'


const whoObservationValidationSchema = {
  professionalCode: required('Συμπληρώστε κωδικό επαγγελματία.'),
  moment: required('Επιλέξτε ένδειξη WHO.'),
  action: required('Επιλέξτε ενέργεια.'),
}

const environmentSampleValidationSchema = {
  samplingPoint: required('Συμπληρώστε σημείο δειγματοληψίας.'),
}

export function WhoEntryFlow({
  whoSession,
  setWhoSession,
  whoObservation,
  setWhoObservation,
  whoObservations,
  setWhoObservations,
  departmentOptions,
  professionalCategoryOptions,
  savedMessage,
  onSubmit,
}) {
  function addObservation() {
    const errors = validateValues(whoObservation, whoObservationValidationSchema)
    if (Object.keys(errors).length) {
      notifyAction(Object.values(errors)[0])
      return
    }

    setWhoObservations((items) => [
      ...items,
      { ...whoObservation, id: `WHO-OBS-${Date.now()}` },
    ])
    setWhoObservation(emptyWhoObservation)
  }

  function deleteObservation(observationId) {
    if (!confirmAction('Να διαγραφεί η παρατήρηση;')) return
    setWhoObservations((items) =>
      items.filter((item) => item.id !== observationId),
    )
  }

  return (
    <form
      id="hand-hygiene-entry-form"
      className="hybrid-section entry-form-content"
      onSubmit={onSubmit}
    >
      <EntryFormSection
        className="who-session-card"
        eyebrow="Στοιχεία συνεδρίας"
        title="Άμεση παρατήρηση WHO"
        description="Συμπληρώστε τα βασικά στοιχεία της συνεδρίας πριν προσθέσετε τις επιμέρους ευκαιρίες."
      >
        <div className="hybrid-form-grid">
          <HybridInput
            label="Μονάδα υγείας"
            value={whoSession.facility}
            onChange={(value) =>
              setWhoSession((current) => ({ ...current, facility: value }))
            }
          />

          <SmartSelect
            label="Τμήμα"
            value={whoSession.department}
            options={departmentOptions}
            placeholder="Αναζήτηση τμήματος..."
            onChange={(value) =>
              setWhoSession((current) => ({ ...current, department: value }))
            }
          />

          <HybridInput
            label="Θάλαμος / Περιοχή"
            value={whoSession.ward}
            onChange={(value) =>
              setWhoSession((current) => ({ ...current, ward: value }))
            }
          />

          <HybridInput
            label="Ημερομηνία"
            value={whoSession.date}
            onChange={(value) =>
              setWhoSession((current) => ({ ...current, date: value }))
            }
          />

          <HybridInput
            label="Παρατηρητής"
            value={whoSession.observer}
            onChange={(value) =>
              setWhoSession((current) => ({ ...current, observer: value }))
            }
          />

          <HybridInput
            label="Ώρα έναρξης"
            value={whoSession.startTime}
            onChange={(value) =>
              setWhoSession((current) => ({ ...current, startTime: value }))
            }
          />

          <HybridInput
            label="Ώρα λήξης"
            value={whoSession.endTime}
            onChange={(value) =>
              setWhoSession((current) => ({ ...current, endTime: value }))
            }
          />
        </div>
      </EntryFormSection>

      <EntryFormSection
        className="who-observation-card"
        eyebrow="Νέα ευκαιρία"
        title="Καταγραφή παρατήρησης"
        description="Επιλέξτε WHO Moment και καταγράψτε την ενέργεια του επαγγελματία υγείας."
      >
        <div className="who-observation-grid">
          <label className="hybrid-field">
            <span>Αριθμός επαγγελματιών</span>
            <input
              value={whoObservation.professionalCode}
              placeholder="π.χ. 1, 2, "
              onChange={(event) =>
                setWhoObservation((current) => ({
                  ...current,
                  professionalCode: event.target.value,
                }))
              }
            />
          </label>

          <SmartSelect
            label="Επαγγελματική κατηγορία"
            value={whoObservation.professionalCategory}
            options={professionalCategoryOptions}
            placeholder="Αναζήτηση κατηγορίας..."
            onChange={(value) =>
              setWhoObservation((current) => ({
                ...current,
                professionalCategory: value,
              }))
            }
          />

          <label className="hybrid-field">
            <span>Ένδειξη – WHO 5 Moments</span>
            <select
              value={whoObservation.moment}
              onChange={(event) =>
                setWhoObservation((current) => ({
                  ...current,
                  moment: event.target.value,
                }))
              }
            >
              {whoMoments.map((moment) => (
                <option key={moment.id} value={moment.id}>
                  {moment.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="who-actions">
          <button
            type="button"
            className={whoObservation.action === 'HR' ? 'active' : ''}
            onClick={() =>
              setWhoObservation((current) => ({ ...current, action: 'HR' }))
            }
          >
            <strong>HR</strong>
            <span>Αλκοολούχο αντισηπτικό</span>
          </button>

          <button
            type="button"
            className={whoObservation.action === 'HW' ? 'active' : ''}
            onClick={() =>
              setWhoObservation((current) => ({ ...current, action: 'HW' }))
            }
          >
            <strong>HW</strong>
            <span>Πλύσιμο με σαπούνι και νερό</span>
          </button>

          <button
            type="button"
            className={
              whoObservation.action === 'MISSED' ? 'active missed' : ''
            }
            onClick={() =>
              setWhoObservation((current) => ({
                ...current,
                action: 'MISSED',
              }))
            }
          >
            <strong>Χ</strong>
            <span>Καμία ενέργεια</span>
          </button>
        </div>

        <label className="hybrid-check">
          <input
            type="checkbox"
            checked={whoObservation.gloves}
            onChange={(event) =>
              setWhoObservation((current) => ({
                ...current,
                gloves: event.target.checked,
              }))
            }
          />
          <span>Χρήση γαντιών κατά την ευκαιρία</span>
        </label>

        <label className="hybrid-field">
          <span>Παρατήρηση</span>
          <input
            value={whoObservation.notes}
            onChange={(event) =>
              setWhoObservation((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }
          />
        </label>

        <button className="who-add-button" type="button" onClick={addObservation}>
          ＋ Προσθήκη παρατήρησης
        </button>
      </EntryFormSection>

      <WhoSummary observations={whoObservations} />

      <div className="who-observation-list">
        {whoObservations.map((observation, index) => {
          const moment = whoMoments.find((item) => item.id === observation.moment)

          return (
            <article key={observation.id}>
              <div className="who-observation-number">{index + 1}</div>
              <div>
                <strong>{moment?.label}</strong>
                <span>
                  {observation.professionalCode} · {observation.professionalCategory}
                </span>
                <small>
                  {actionLabel(observation.action)}
                  {observation.gloves ? ' · Γάντια' : ''}
                </small>
              </div>
              <button
                type="button"
                onClick={() => deleteObservation(observation.id)}
              >
                Διαγραφή
              </button>
            </article>
          )
        })}

        {whoObservations.length === 0 && (
          <div className="who-empty">Δεν έχουν προστεθεί ακόμη παρατηρήσεις.</div>
        )}
      </div>

      {savedMessage && <div className="hybrid-success">{savedMessage}</div>}
    </form>
  )
}

export function EnvironmentEntryFlow({
  selectedType,
  environmentSession,
  setEnvironmentSession,
  environmentSample,
  setEnvironmentSample,
  environmentSamples,
  setEnvironmentSamples,
  departmentOptions,
  environmentPointOptions,
  microorganismOptions,
  savedMessage,
  setSavedMessage,
  setStep,
  onSubmit,
}) {
  function addSample() {
    const errors = validateValues(environmentSample, environmentSampleValidationSchema)
    if (Object.keys(errors).length) {
      notifyAction(Object.values(errors)[0])
      return
    }

    setEnvironmentSamples((items) => [
      ...items,
      {
        ...environmentSample,
        id: `ENV-SAMPLE-${Date.now()}`,
        acceptable:
          environmentSample.resultStatus === 'Αρνητικό'
            ? 'Ναι'
            : environmentSample.resultStatus === 'Θετικό'
              ? 'Όχι'
              : '',
      },
    ])
    setEnvironmentSample(emptyEnvironmentSample)
  }

  function deleteSample(sampleId) {
    if (!confirmAction('Να διαγραφεί το δείγμα από την τρέχουσα καταχώρηση;')) return
    setEnvironmentSamples((items) => items.filter((item) => item.id !== sampleId))
  }

  return (
    <form className="hybrid-section" onSubmit={onSubmit}>
      <div className="hybrid-selected-type">
        <span>{selectedType.icon}</span>
        <div>
          <small>Περιβαλλοντικός Έλεγχος</small>
          <strong>Δειγματοληψία χώρου και επιφανειών</strong>
        </div>
      </div>

      <div className="environment-session-card">
        <div className="hybrid-section-heading">
          <span>Στοιχεία ελέγχου</span>
          <h3>Περιβαλλοντική δειγματοληψία</h3>
        </div>

        <div className="hybrid-form-grid">
          <HybridInput
            label="Μονάδα υγείας"
            value={environmentSession.facility}
            onChange={(value) =>
              setEnvironmentSession((current) => ({ ...current, facility: value }))
            }
          />
          <HybridInput
            label="Ημερομηνία"
            value={environmentSession.date}
            onChange={(value) =>
              setEnvironmentSession((current) => ({ ...current, date: value }))
            }
          />
          <SmartSelect
            label="Τμήμα"
            value={environmentSession.department}
            options={departmentOptions}
            placeholder="Αναζήτηση τμήματος..."
            onChange={(value) =>
              setEnvironmentSession((current) => ({ ...current, department: value }))
            }
          />
          <HybridInput
            label="Χώρος / Υποπεριοχή"
            value={environmentSession.area}
            onChange={(value) =>
              setEnvironmentSession((current) => ({ ...current, area: value }))
            }
          />
          <HybridInput
            label="Υπεύθυνος / Παρατηρητής"
            value={environmentSession.observer}
            onChange={(value) =>
              setEnvironmentSession((current) => ({ ...current, observer: value }))
            }
          />
          <label className="hybrid-field">
            <span>Αιτία ελέγχου</span>
            <select
              value={environmentSession.reason}
              onChange={(event) =>
                setEnvironmentSession((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
            >
              <option>Προγραμματισμένος έλεγχος</option>
              <option>Έλεγχος μετά από συμβάν</option>
              <option>Επανέλεγχος</option>
              <option>Έλεγχος μετά από καθαρισμό</option>
              <option>Διερεύνηση συρροής</option>
              <option>Άλλο</option>
            </select>
          </label>
        </div>
      </div>

      <div className="environment-sample-card">
        <div className="hybrid-section-heading">
          <span>Νέο δείγμα</span>
          <h3>Σημείο δειγματοληψίας</h3>
        </div>

        <div className="hybrid-form-grid">
          <SmartSelect
            label="Σημείο δειγματοληψίας"
            value={environmentSample.samplingPoint}
            options={environmentPointOptions}
            placeholder="Αναζήτηση σημείου..."
            allowCustom
            onChange={(value) =>
              setEnvironmentSample((current) => ({
                ...current,
                samplingPoint: value,
              }))
            }
          />
          <label className="hybrid-field">
            <span>Τύπος επιφάνειας</span>
            <select
              value={environmentSample.surfaceType}
              onChange={(event) =>
                setEnvironmentSample((current) => ({
                  ...current,
                  surfaceType: event.target.value,
                }))
              }
            >
              {environmentSurfaceTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="hybrid-field">
            <span>Μέθοδος</span>
            <select
              value={environmentSample.method}
              onChange={(event) =>
                setEnvironmentSample((current) => ({
                  ...current,
                  method: event.target.value,
                }))
              }
            >
              {environmentMethods.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="hybrid-field">
            <span>Κατάσταση αποτελέσματος</span>
            <select
              value={environmentSample.resultStatus}
              onChange={(event) =>
                setEnvironmentSample((current) => ({
                  ...current,
                  resultStatus: event.target.value,
                }))
              }
            >
              <option>Εκκρεμεί</option>
              <option>Αρνητικό</option>
              <option>Θετικό</option>
            </select>
          </label>
          <SmartSelect
            label="Μικροοργανισμός"
            value={environmentSample.microorganism}
            options={microorganismOptions}
            placeholder="Αναζήτηση μικροοργανισμού..."
            allowCustom
            onChange={(value) =>
              setEnvironmentSample((current) => ({
                ...current,
                microorganism: value,
              }))
            }
          />
          <HybridInput
            label="CFU / Τιμή ATP"
            value={environmentSample.cfu}
            onChange={(value) =>
              setEnvironmentSample((current) => ({ ...current, cfu: value }))
            }
          />
          <div className="full">
            <HybridInput
              label="Παρατηρήσεις"
              value={environmentSample.notes}
              onChange={(value) =>
                setEnvironmentSample((current) => ({ ...current, notes: value }))
              }
            />
          </div>
        </div>

        <button className="environment-add-button" type="button" onClick={addSample}>
          ＋ Προσθήκη δείγματος
        </button>
      </div>

      <EnvironmentSummary samples={environmentSamples} />

      <div className="environment-sample-list">
        {environmentSamples.map((sample, index) => (
          <article key={sample.id}>
            <div className="environment-sample-number">{index + 1}</div>
            <div>
              <strong>{sample.samplingPoint}</strong>
              <span>{sample.surfaceType} · {sample.method}</span>
              <small>
                {sample.resultStatus}
                {sample.microorganism ? ` · ${sample.microorganism}` : ''}
                {sample.cfu ? ` · ${sample.cfu}` : ''}
              </small>
            </div>
            <span className={`environment-result result-${sample.resultStatus}`}>
              {sample.acceptable === 'Ναι'
                ? 'Αποδεκτό'
                : sample.acceptable === 'Όχι'
                  ? 'Μη αποδεκτό'
                  : 'Εκκρεμεί'}
            </span>
            <button type="button" onClick={() => deleteSample(sample.id)}>
              Διαγραφή
            </button>
          </article>
        ))}

        {environmentSamples.length === 0 && (
          <div className="environment-empty">Δεν έχουν προστεθεί ακόμη δείγματα.</div>
        )}
      </div>

      {savedMessage && <div className="hybrid-success">{savedMessage}</div>}

      <div className="hybrid-save-row">
        <button
          type="button"
          onClick={() => {
            setSavedMessage('')
            setStep(1)
          }}
        >
          Πίσω
        </button>
        <button className="primary" type="submit">
          Αποθήκευση περιβαλλοντικού ελέγχου
        </button>
      </div>
    </form>
  )
}
