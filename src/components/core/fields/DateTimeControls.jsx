import { useEffect, useId, useRef, useState } from 'react'
import { CalendarDays, Clock3 } from 'lucide-react'
import Button from '../Button/Button'
import './Fields.css'

export function isoToDisplayDate(value = '') {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || '')
}

export function displayToIsoDate(value = '') {
  const clean = String(value || '').trim()
  if (!clean) return ''
  const match = clean.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/)
  if (!match) return null
  const day = match[1].padStart(2, '0')
  const month = match[2].padStart(2, '0')
  const year = match[3]
  const iso = `${year}-${month}-${day}`
  const probe = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(probe.getTime()) || probe.getFullYear() !== Number(year) || probe.getMonth() + 1 !== Number(month) || probe.getDate() !== Number(day)) return null
  return iso
}

function maskDateInput(raw = '') {
  const digits = String(raw).replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function openNativePicker(input) {
  if (!input) return
  try {
    if (typeof input.showPicker === 'function') input.showPicker()
    else input.click()
  } catch {
    input.click()
  }
}

export function SmartDateInput({ value = '', onValueChange, onChange, onBlur, className = '', disabled = false, readOnly = false, placeholder = 'ηη/μμ/εεεε', ...props }) {
  const [text, setText] = useState(() => isoToDisplayDate(value))
  const nativeRef = useRef(null)
  const inputId = useId()

  useEffect(() => setText(isoToDisplayDate(value)), [value])

  const emit = (iso) => {
    onValueChange?.(iso)
    onChange?.({ target: { value: iso, name: props.name }, currentTarget: { value: iso, name: props.name } })
  }

  const commitText = (nextText) => {
    const iso = displayToIsoDate(nextText)
    if (iso !== null) emit(iso)
    return iso
  }

  return <div className={`core-date-time-control ${disabled ? 'is-disabled' : ''} ${readOnly ? 'is-readonly' : ''} ${className}`.trim()}>
    <input
      {...props}
      id={props.id || inputId}
      className="core-control core-date-time-control__text"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      readOnly={readOnly}
      placeholder={placeholder}
      value={text}
      onChange={(event) => {
        const next = maskDateInput(event.target.value)
        setText(next)
        commitText(next)
      }}
      onBlur={(event) => {
        const iso = displayToIsoDate(text)
        if (iso === null) setText(isoToDisplayDate(value))
        else setText(isoToDisplayDate(iso))
        onBlur?.(event)
      }}
    />
    <input
      ref={nativeRef}
      className="core-date-time-control__native"
      type="date"
      tabIndex={-1}
      aria-hidden="true"
      value={value || ''}
      disabled={disabled || readOnly}
      onChange={(event) => {
        const iso = event.target.value
        setText(isoToDisplayDate(iso))
        emit(iso)
      }}
    />
    <Button className="core-date-time-control__picker" variant="secondary" size="sm" type="button" tabIndex={disabled || readOnly ? -1 : 0} disabled={disabled || readOnly} aria-label="Άνοιγμα ημερολογίου" title="Ημερολόγιο" icon={<CalendarDays size={18} aria-hidden="true" />} onClick={() => openNativePicker(nativeRef.current)} />
  </div>
}

function normalizeTime(value = '') {
  const clean = String(value || '').trim()
  if (!clean) return ''
  const match = clean.match(/^(\d{1,2}):(\d{1,2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function maskTimeInput(raw = '') {
  const digits = String(raw).replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

export function SmartTimeInput({ value = '', onValueChange, onChange, onBlur, className = '', disabled = false, readOnly = false, placeholder = 'ωω:λλ', ...props }) {
  const [text, setText] = useState(value || '')
  const nativeRef = useRef(null)
  const inputId = useId()

  useEffect(() => setText(value || ''), [value])

  const emit = (next) => {
    onValueChange?.(next)
    onChange?.({ target: { value: next, name: props.name }, currentTarget: { value: next, name: props.name } })
  }

  return <div className={`core-date-time-control ${disabled ? 'is-disabled' : ''} ${readOnly ? 'is-readonly' : ''} ${className}`.trim()}>
    <input
      {...props}
      id={props.id || inputId}
      className="core-control core-date-time-control__text"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      readOnly={readOnly}
      placeholder={placeholder}
      value={text}
      onChange={(event) => {
        const next = maskTimeInput(event.target.value)
        setText(next)
        const normalized = normalizeTime(next)
        if (normalized !== null) emit(normalized)
      }}
      onBlur={(event) => {
        const normalized = normalizeTime(text)
        if (normalized === null) setText(value || '')
        else setText(normalized)
        onBlur?.(event)
      }}
    />
    <input
      ref={nativeRef}
      className="core-date-time-control__native"
      type="time"
      tabIndex={-1}
      aria-hidden="true"
      value={value || ''}
      disabled={disabled || readOnly}
      onChange={(event) => {
        const next = event.target.value
        setText(next)
        emit(next)
      }}
    />
    <Button className="core-date-time-control__picker" variant="secondary" size="sm" type="button" tabIndex={disabled || readOnly ? -1 : 0} disabled={disabled || readOnly} aria-label="Άνοιγμα επιλογής ώρας" title="Ώρα" icon={<Clock3 size={18} aria-hidden="true" />} onClick={() => openNativePicker(nativeRef.current)} />
  </div>
}
