import { confirmAction, notifyAction } from '../core/feedback/index'
import { EntryFormSection } from '../forms/EntryFormChrome'
import { required, validateValues } from '../../core/forms'
import { useI18n } from '../../i18n'
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
  employeeOptions,
  savedMessage,
  onSubmit,
}) {
  const { language } = useI18n()
  const L = (el,en) => language === 'en' ? en : el
  const whoObservationValidationSchema = {
    professionalCode: required(L('Συμπληρώστε κωδικό επαγγελματία.', 'Enter professional identifier.')),
    moment: required(L('Επιλέξτε ένδειξη WHO.', 'Select a WHO Moment.')),
    action: required(L('Επιλέξτε ενέργεια.', 'Select an action.')),
  }
  const momentLabel = (moment) => {
    const en = {
      moment1: '1. Before touching a patient',
      moment2: '2. Before clean / aseptic procedure',
      moment3: '3. After body fluid exposure risk',
      moment4: '4. After touching a patient',
      moment5: '5. After touching patient surroundings',
    }
    return language === 'en' ? (en[moment.id] || moment.label) : moment.label
  }

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
    setWhoObservation({
      ...emptyWhoObservation,
      professionalCode: whoObservation.professionalCode,
      professionalCategory: whoObservation.professionalCategory,
    })
  }

  function deleteObservation(observationId) {
    if (!confirmAction(L('Να διαγραφεί η παρατήρηση;','Delete this observation?'))) return
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
        eyebrow={L('Στοιχεία συνεδρίας','Session details')}
        title={L('Άμεση παρατήρηση WHO','Direct WHO observation')}
        description={L('Συμπληρώστε τα βασικά στοιχεία της συνεδρίας πριν προσθέσετε τις επιμέρους ευκαιρίες.','Complete the session details before adding individual opportunities.')}
      >
        <div className="hybrid-form-grid">
          <HybridInput
            label={L('Μονάδα υγείας','Healthcare facility')}
            value={whoSession.facility}
            onChange={(value) =>
              setWhoSession((current) => ({ ...current, facility: value }))
            }
          />

          <SmartSelect
            label={L('Τμήμα','Department')}
            value={whoSession.department}
            options={departmentOptions}
            placeholder={L('Αναζήτηση τμήματος...','Search department...')}
            onChange={(value) =>
              setWhoSession((current) => ({ ...current, department: value }))
            }
          />

          <HybridInput
            label={L('Θάλαμος / Περιοχή','Ward / Area')}
            value={whoSession.ward}
            onChange={(value) =>
              setWhoSession((current) => ({ ...current, ward: value }))
            }
          />

          <HybridInput
            label={L('Ημερομηνία','Date')}
            type="date"
            value={whoSession.date}
            onChange={(value) =>
              setWhoSession((current) => ({ ...current, date: value }))
            }
          />

          <SmartSelect
            label={L('Παρατηρητής','Observer')}
            value={whoSession.observer}
            options={employeeOptions || []}
            placeholder={L('Επιλέξτε από το προσωπικό…','Select from staff…')}
            onChange={(value) =>
              setWhoSession((current) => ({ ...current, observer: value }))
            }
          />

          <HybridInput
            label={L('Ώρα έναρξης','Start time')}
            type="time"
            value={whoSession.startTime}
            onChange={(value) =>
              setWhoSession((current) => ({ ...current, startTime: value }))
            }
          />

          <HybridInput
            label={L('Ώρα λήξης','End time')}
            type="time"
            value={whoSession.endTime}
            onChange={(value) =>
              setWhoSession((current) => ({ ...current, endTime: value }))
            }
          />
        </div>
      </EntryFormSection>

      <EntryFormSection
        className="who-observation-card"
        eyebrow={L('Νέα ευκαιρία','New opportunity')}
        title={L('Καταγραφή παρατήρησης','Observation entry')}
        description={L('Επιλέξτε WHO Moment και καταγράψτε την ενέργεια του επαγγελματία υγείας.','Select the WHO Moment and record the healthcare professional action.')}
      >
        <div className="who-observation-grid">
          <label className="hybrid-field">
            <span>{L('Αριθμός επαγγελματιών','Professional number')}</span>
            <input
              value={whoObservation.professionalCode}
              placeholder={L('π.χ. 1, 2','e.g. 1, 2')}
              onChange={(event) =>
                setWhoObservation((current) => ({
                  ...current,
                  professionalCode: event.target.value,
                }))
              }
            />
          </label>

          <SmartSelect
            label={L('Επαγγελματική κατηγορία','Professional category')}
            value={whoObservation.professionalCategory}
            options={professionalCategoryOptions}
            placeholder={L('Αναζήτηση κατηγορίας...','Search category...')}
            onChange={(value) =>
              setWhoObservation((current) => ({
                ...current,
                professionalCategory: value,
              }))
            }
          />

          <label className="hybrid-field">
            <span>{L('Ένδειξη – WHO 5 Moments','WHO 5 Moments')}</span>
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
                  {momentLabel(moment)}
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
            <span>{L('Αλκοολούχο αντισηπτικό','Alcohol-based handrub')}</span>
          </button>

          <button
            type="button"
            className={whoObservation.action === 'HW' ? 'active' : ''}
            onClick={() =>
              setWhoObservation((current) => ({ ...current, action: 'HW' }))
            }
          >
            <strong>HW</strong>
            <span>{L('Πλύσιμο με σαπούνι και νερό','Handwashing with soap and water')}</span>
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
            <span>{L('Καμία ενέργεια','No action')}</span>
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
          <span>{L('Χρήση γαντιών κατά την ευκαιρία','Gloves used during opportunity')}</span>
        </label>

        <label className="hybrid-field">
          <span>{L('Παρατήρηση','Notes')}</span>
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
          {L('＋ Προσθήκη ευκαιρίας','＋ Add opportunity')}
        </button>
      </EntryFormSection>

      <WhoSummary observations={whoObservations} draftObservation={whoObservation} language={language} />

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
                  {actionLabel(observation.action, language)}
                  {observation.gloves ? ` · ${L('Γάντια','Gloves')}` : ''}
                </small>
              </div>
              <button
                type="button"
                onClick={() => deleteObservation(observation.id)}
              >
                {L('Διαγραφή','Delete')}
              </button>
            </article>
          )
        })}

        {whoObservations.length === 0 && (
          <div className="who-empty">{L("Δεν έχουν προστεθεί ακόμη παρατηρήσεις.","No observations have been added yet.")}</div>
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
  const { language } = useI18n()
  const L = (el,en) => language === 'en' ? en : el
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
        resultStatus:'Εκκρεμεί',
        microorganism:'',
        cfu:'',
        acceptable:'',
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
            label={L('Μονάδα υγείας','Healthcare facility')}
            value={environmentSession.facility}
            onChange={(value) =>
              setEnvironmentSession((current) => ({ ...current, facility: value }))
            }
          />
          <HybridInput
            label={L('Ημερομηνία','Date')}
            type="date"
            value={environmentSession.date}
            onChange={(value) =>
              setEnvironmentSession((current) => ({ ...current, date: value }))
            }
          />
          <SmartSelect
            label={L('Τμήμα','Department')}
            value={environmentSession.department}
            options={departmentOptions}
            placeholder={L('Αναζήτηση τμήματος...','Search department...')}
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
          <div className="hybrid-lab-pending full">
            <strong>{L('Εργαστηριακό αποτέλεσμα: Εκκρεμεί','Laboratory result: Pending')}</strong>
            <span>{L('Αποτέλεσμα, μικροοργανισμός, CFU/ATP και αποδοχή συμπληρώνονται αποκλειστικά από το Εργαστήριο.','Result, microorganism, CFU/ATP and acceptance are completed only in Laboratory.')}</span>
          </div>
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
              <small>{L('Εκκρεμεί εργαστηριακό αποτέλεσμα','Laboratory result pending')}</small>
            </div>
            <span className="environment-result result-Εκκρεμεί">{L('Εκκρεμεί','Pending')}</span>
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
