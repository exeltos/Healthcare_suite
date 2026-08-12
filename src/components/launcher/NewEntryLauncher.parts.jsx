import { useEffect, useMemo, useState } from 'react'
import { whoMoments } from './NewEntryLauncher.config'

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

export function WhoSummary({ observations }) {
  const opportunities = observations.length
  const professionals = new Set(
    observations
      .map((item) => item.professionalCode.trim().toLocaleUpperCase('el-GR'))
      .filter(Boolean),
  ).size
  const handRub = observations.filter((item) => item.action === 'HR').length
  const handWash = observations.filter((item) => item.action === 'HW').length
  const missed = observations.filter((item) => item.action === 'MISSED').length
  const correctActions = handRub + handWash
  const compliance =
    opportunities > 0
      ? Math.round((correctActions / opportunities) * 1000) / 10
      : 0

  return (
    <>
      <div className="who-summary-grid">
        <div>
          <span>Επαγγελματίες</span>
          <strong>{professionals}</strong>
        </div>

        <div>
          <span>Ευκαιρίες</span>
          <strong>{opportunities}</strong>
        </div>

        <div>
          <span>Ευκαιρίες / επαγγελματία</span>
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
          <span>Παραλείψεις</span>
          <strong>{missed}</strong>
        </div>

        <div className="compliance">
          <span>Συμμόρφωση WHO</span>
          <strong>{compliance}%</strong>
        </div>
      </div>

      <div className="who-professional-summary">
        {Array.from(
          new Set(
            observations
              .map((item) => item.professionalCode.trim())
              .filter(Boolean),
          ),
        ).map((professionalCode) => {
          const items = observations.filter(
            (item) =>
              item.professionalCode.trim().toLocaleUpperCase('el-GR') ===
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
              <small>{items.length} ευκαιρίες</small>
              <b>{percentage}%</b>
            </div>
          )
        })}

        {professionals === 0 && (
          <div className="who-empty">
            Δεν υπάρχουν ακόμη επαγγελματίες στην παρατήρηση.
          </div>
        )}
      </div>

      <div className="who-moment-summary">
        {whoMoments.map((moment) => {
          const items = observations.filter(
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
              <strong>{moment.label}</strong>
              <small>{items.length} ευκαιρίες</small>
              <span>{percentage}%</span>
            </div>
          )
        })}
      </div>
    </>
  )
}

export function actionLabel(action) {
  if (action === 'HR') return 'HR · Αλκοολούχο αντισηπτικό'
  if (action === 'HW') return 'HW · Σαπούνι και νερό'
  return 'Καμία ενέργεια'
}


export function SmartSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Αναζήτηση...',
  allowCustom = false,
}) {
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
            aria-label="Καθαρισμός"
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
                ? 'Δεν βρέθηκε εγγραφή. Θα αποθηκευτεί η τιμή που γράψατε.'
                : 'Δεν βρέθηκε διαθέσιμη επιλογή.'}
            </div>
          )}
        </div>
      )}
    </label>
  )
}

export function HybridInput({ label, value, onChange }) {
  return (
    <label className="hybrid-field">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}