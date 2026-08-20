import { useEffect, useMemo, useState } from 'react'
import { whoMoments } from './NewEntryLauncher.config'
import { useI18n } from '../../i18n'
import { calculateWhoCompliance } from '../../core/utils/observationMetrics'
import { SmartDateInput, SmartTimeInput } from '../core/fields/DateTimeControls'

export function EnvironmentSummary({ samples }) {
  const total = samples.length
  const positive = samples.filter(
    (item) => item.resultStatus === 'Θετικό',
  ).length
  const negative = samples.filter(
    (item) => item.resultStatus === 'Αρνητικό',
  ).length
  const pending = samples.filter(
    (item) => item.resultStatus === 'Εκκρεμεί',
  ).length
  const acceptable = samples.filter(
    (item) => item.acceptable === 'Ναι',
  ).length
  const acceptableRate =
    total > 0 ? Math.round((acceptable / total) * 1000) / 10 : 0

  return (
    <div className="environment-summary-grid">
      <div>
        <span>Σύνολο δειγμάτων</span>
        <strong>{total}</strong>
      </div>

      <div>
        <span>Θετικά</span>
        <strong>{positive}</strong>
      </div>

      <div>
        <span>Αρνητικά</span>
        <strong>{negative}</strong>
      </div>

      <div>
        <span>Εκκρεμή</span>
        <strong>{pending}</strong>
      </div>

      <div className="acceptable-rate">
        <span>Αποδεκτά</span>
        <strong>{acceptableRate}%</strong>
      </div>
    </div>
  )
}

export function WhoSummary({ observations, draftObservation, language: languageProp }) {
  const { language: contextLanguage } = useI18n()
  const language = languageProp || contextLanguage
  const L = (el,en) => language === 'en' ? en : el
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
  const draftReady = Boolean(
    String(draftObservation?.professionalCode || '').trim()
    && draftObservation?.moment
    && draftObservation?.action
  )
  const previewObservations = draftReady ? [...observations, draftObservation] : observations
  const { opportunities, professionals, handRub, handWash, missed, compliance } = calculateWhoCompliance(previewObservations)

  return (
    <>
      <div className="who-summary-grid">
        <div>
          <span>{L('Επαγγελματίες','Professionals')}</span>
          <strong>{professionals}</strong>
        </div>

        <div>
          <span>{L('Ευκαιρίες','Opportunities')}</span>
          <strong>{opportunities}</strong>
        </div>

        <div>
          <span>{L('Ευκαιρίες / επαγγελματία','Opportunities / professional')}</span>
          <strong>
            {professionals > 0
              ? Math.round((opportunities / professionals) * 10) / 10
              : 0}
          </strong>
        </div>

        <div>
          <span>HR</span>
          <strong>{handRub}</strong>
        </div>

        <div>
          <span>HW</span>
          <strong>{handWash}</strong>
        </div>

        <div>
          <span>{L('Παραλείψεις','Missed')}</span>
          <strong>{missed}</strong>
        </div>

        <div className="compliance">
          <span>{L('Συμμόρφωση WHO','WHO compliance')}</span>
          <strong>{compliance}%</strong>
        </div>
      </div>

      <div className="who-professional-summary">
        {Array.from(
          new Set(
            previewObservations
              .map((item) => String(item.professionalCode || '').trim())
              .filter(Boolean),
          ),
        ).map((professionalCode) => {
          const items = previewObservations.filter(
            (item) =>
              String(item.professionalCode || '').trim().toLocaleUpperCase('el-GR') ===
              professionalCode.toLocaleUpperCase('el-GR'),
          )
          const compliant = items.filter(
            (item) => item.action === 'HR' || item.action === 'HW',
          ).length
          const percentage =
            items.length > 0
              ? Math.round((compliant / items.length) * 1000) / 10
              : 0
          const category = items[0]?.professionalCategory || '—'

          return (
            <div className="who-professional-row" key={professionalCode}>
              <strong>{professionalCode}</strong>
              <span>{category}</span>
              <small>{items.length} {L('ευκαιρίες','opportunities')}</small>
              <b>{percentage}%</b>
            </div>
          )
        })}

        {professionals === 0 && (
          <div className="who-empty">
            {L('Δεν υπάρχουν ακόμη επαγγελματίες στην παρατήρηση.','No professionals have been added to the observation yet.')}
          </div>
        )}
      </div>

      <div className="who-moment-summary">
        {whoMoments.map((moment) => {
          const items = previewObservations.filter(
            (item) => item.moment === moment.id,
          )
          const compliant = items.filter(
            (item) => item.action === 'HR' || item.action === 'HW',
          ).length
          const percentage =
            items.length > 0
              ? Math.round((compliant / items.length) * 1000) / 10
              : 0

          return (
            <div className="who-moment-row" key={moment.id}>
              <strong>{momentLabel(moment)}</strong>
              <small>{items.length} {L('ευκαιρίες','opportunities')}</small>
              <span>{percentage}%</span>
            </div>
          )
        })}
      </div>
    </>
  )
}

export function actionLabel(action, language='el') {
  if (action === 'HR') return language === 'en' ? 'HR · Alcohol-based handrub' : 'HR · Αλκοολούχο αντισηπτικό'
  if (action === 'HW') return language === 'en' ? 'HW · Soap and water' : 'HW · Σαπούνι και νερό'
  return language === 'en' ? 'No action' : 'Καμία ενέργεια'
}


export function SmartSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Αναζήτηση...',
  allowCustom = false,
}) {
  const { language } = useI18n()
  const L = (el,en) => language === 'en' ? en : el
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value || '')

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('el-GR')

    if (!normalizedQuery) return options.slice(0, 50)

    return options
      .filter((item) =>
        String(item.name || '')
          .toLocaleLowerCase('el-GR')
          .includes(normalizedQuery),
      )
      .slice(0, 50)
  }, [options, query])

  function selectOption(item) {
    setQuery(item.name)
    onChange(item.name)
    setOpen(false)
  }

  function handleBlur() {
    window.setTimeout(() => {
      setOpen(false)

      if (allowCustom) {
        onChange(query.trim())
      } else if (
        query &&
        !options.some(
          (item) =>
            item.name.toLocaleLowerCase('el-GR') ===
            query.toLocaleLowerCase('el-GR'),
        )
      ) {
        setQuery(value || '')
      }
    }, 140)
  }

  return (
    <label className="smart-select">
      <span>{label}</span>

      <div className="smart-select-control">
        <input
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)

            if (allowCustom) {
              onChange(event.target.value)
            }
          }}
        />

        {query && (
          <button
            className="smart-select-clear"
            type="button"
            aria-label={L('Καθαρισμός','Clear')}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery('')
              onChange('')
              setOpen(true)
            }}
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div className="smart-select-menu">
          {filteredOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.name === value ? 'selected' : ''}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(item)}
            >
              <strong>{item.name}</strong>
              {item.code && <small>{item.code}</small>}
            </button>
          ))}

          {filteredOptions.length === 0 && (
            <div className="smart-select-empty">
              {allowCustom
                ? L('Δεν βρέθηκε εγγραφή. Θα αποθηκευτεί η τιμή που γράψατε.','No matching record found. The entered value will be saved.')
                : L('Δεν βρέθηκε διαθέσιμη επιλογή.','No available option found.')}
            </div>
          )}
        </div>
      )}
    </label>
  )
}

export function HybridInput({ label, value, onChange, type = 'text', readOnly = false }) {
  return (
    <label className="hybrid-field">
      <span>{label}</span>
      {type === 'date' ? (
        <SmartDateInput value={value || ''} disabled={readOnly} onValueChange={onChange} />
      ) : type === 'time' ? (
        <SmartTimeInput value={value || ''} disabled={readOnly} onValueChange={onChange} />
      ) : (
        <input
          type={type}
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  )
}