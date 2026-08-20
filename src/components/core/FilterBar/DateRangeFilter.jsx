import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, X } from 'lucide-react'

function formatDate(value) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

export default function DateRangeFilter({
  from = '',
  to = '',
  onFromChange,
  onToChange,
  label = 'Περίοδος',
  helperText = 'Επιλέξτε συγκεκριμένο χρονικό διάστημα.',
  fromLabel = 'Από',
  toLabel = 'Έως',
  clearLabel = 'Καθαρισμός',
  applyLabel = 'Εφαρμογή',
  closeLabel = 'Κλείσιμο',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  const summary = useMemo(() => {
    if (from && to) return `${formatDate(from)} – ${formatDate(to)}`
    if (from) return `Από ${formatDate(from)}`
    if (to) return `Έως ${formatDate(to)}`
    return label
  }, [from, to, label])

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const hasValue = Boolean(from || to)

  return (
    <div ref={rootRef} className={`core-date-range-filter ${hasValue ? 'is-active' : ''} ${className}`.trim()}>
      <button
        type="button"
        className="core-date-range-filter__trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <CalendarDays size={17} aria-hidden="true" />
        <span className="core-date-range-filter__trigger-text">{summary}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {open ? (
        <div className="core-date-range-filter__popover" role="dialog" aria-label={`Φίλτρο ${label}`}>
          <div className="core-date-range-filter__popover-header">
            <div>
              <strong>{label}</strong>
              <span>{helperText}</span>
            </div>
            <button type="button" className="core-date-range-filter__close" onClick={() => setOpen(false)} aria-label={closeLabel}>
              <X size={16} />
            </button>
          </div>

          <div className="core-date-range-filter__fields">
            <label>
              <span>{fromLabel}</span>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => onFromChange?.(event.target.value)}
              />
            </label>
            <label>
              <span>{toLabel}</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => onToChange?.(event.target.value)}
              />
            </label>
          </div>

          <div className="core-date-range-filter__footer">
            <button
              type="button"
              className="core-date-range-filter__clear"
              disabled={!hasValue}
              onClick={() => {
                onFromChange?.('')
                onToChange?.('')
              }}
            >
              {clearLabel}
            </button>
            <button type="button" className="core-date-range-filter__apply" onClick={() => setOpen(false)}>
              {applyLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
