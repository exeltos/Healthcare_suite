import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import './MultiSelect.css'
import { useI18n } from '../../../i18n'

function normalizeValues(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value || value === 'Κανένα' || value === 'Χωρίς συμπτώματα' || value === 'Κανένας') return []
  return String(value).split(',').map((item) => item.trim()).filter(Boolean)
}

export default function MultiSelect({
  value, options = [], onChange, placeholder = 'Επιλέξτε ένα ή περισσότερα',
  emptyLabel = 'Καμία επιλογή', allowCustom = false, customLabel = 'Άλλο', onAddCustom, disabled = false,
  getOptionLabel,
}) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const selected = normalizeValues(value)
  const [customOpen, setCustomOpen] = useState(false)
  const [customValue, setCustomValue] = useState('')

  const toggle = (option) => {
    if (disabled) return
    const next = selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]
    onChange(next)
  }

  const addCustom = () => {
    if (disabled) return
    const nextValue = customValue.trim()
    if (!nextValue) return
    if (!selected.includes(nextValue)) onChange([...selected, nextValue])
    onAddCustom?.(nextValue)
    setCustomValue('')
    setCustomOpen(false)
  }

  return <div className={`core-multiselect ${disabled ? 'is-disabled' : ''}`.trim()} aria-disabled={disabled}>
    <div className="core-multiselect-options" role="group" aria-label={placeholder}>
      {options.map((option) => {
        const active = selected.includes(option)
        return <button key={option} type="button" disabled={disabled} className={active ? 'active' : ''} onClick={() => toggle(option)} aria-pressed={active}>
          <span>{active ? <Check size={13} /> : null}</span>{getOptionLabel ? getOptionLabel(option) : option}
        </button>
      })}
      {allowCustom && !disabled && <button type="button" className="core-multiselect-other" onClick={() => setCustomOpen((open) => !open)}><Plus size={13} />{customLabel}</button>}
    </div>
    {customOpen && !disabled && <div className="core-multiselect-custom">
      <input autoFocus value={customValue} onChange={(event) => setCustomValue(event.target.value)} placeholder={L("Γράψτε νέα επιλογή", "Enter new option")} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustom() } }} />
      <button type="button" onClick={addCustom}>{L("Προσθήκη", "Add")}</button>
      <button type="button" className="cancel" onClick={() => { setCustomOpen(false); setCustomValue('') }}>{L("Ακύρωση", "Cancel")}</button>
    </div>}
    <div className="core-multiselect-selected">
      {selected.length === 0 ? <small>{emptyLabel}</small> : selected.map((item) => <span key={item}>{getOptionLabel ? getOptionLabel(item) : item}<button type="button" disabled={disabled} onClick={() => toggle(item)} aria-label={`${L("Αφαίρεση", "Remove")} ${getOptionLabel ? getOptionLabel(item) : item}`}><X size={12} /></button></span>)}
    </div>
  </div>
}

export { normalizeValues }
