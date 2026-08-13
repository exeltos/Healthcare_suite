import { useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { required, validateValues } from '../../../core/forms'
import { useI18n } from '../../../i18n'
import './HybridMultiSelector.css'

export default function HybridMultiSelector({
  items = [],
  selected = [],
  onChange,
  label = 'Επιλογή',
  getId = (item) => item.id,
  getName = (item) => item.fullName || item.name || '',
  getMeta = (item) => item.department || '',
  manualFields = [
    { key: 'name', label: 'Ονοματεπώνυμο', required: true },
    { key: 'department', label: 'Τμήμα' },
    { key: 'role', label: 'Ιδιότητα' },
  ],
}) {
  const { language } = useI18n()
  const L = (el,en) => language === 'en' ? en : el
  const [mode, setMode] = useState('list')
  const [query, setQuery] = useState('')
  const [manual, setManual] = useState(() => Object.fromEntries(manualFields.map((field) => [field.key, ''])))
  const [manualErrors, setManualErrors] = useState({})

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('el-GR')
    if (!q) return items
    return items.filter((item) => `${getName(item)} ${getMeta(item)}`.toLocaleLowerCase('el-GR').includes(q))
  }, [items, query, getName, getMeta])

  const selectedIds = new Set(selected.filter((item) => !item.manual).map((item) => String(item.id)))

  function toggle(item) {
    const id = String(getId(item))
    const exists = selectedIds.has(id)
    onChange(exists
      ? selected.filter((entry) => String(entry.id) !== id)
      : [...selected, { id: getId(item), name: getName(item), meta: getMeta(item), source: item }])
  }

  function updateManual(field, value) {
    setManual((current) => ({ ...current, [field]: value }))
    setManualErrors((current) => current[field] ? ({ ...current, [field]: '' }) : current)
  }

  function addManual() {
    const schema = Object.fromEntries(
      manualFields.filter((field) => field.required).map((field) => [field.key, required(L('Υποχρεωτικό πεδίο','Required field'))]),
    )
    const nextErrors = validateValues(manual, schema)
    setManualErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const nameField = manualFields.find((field) => field.key === 'name') || manualFields[0]
    onChange([...selected, {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: manual[nameField.key],
      meta: manual.department || manual.role || '',
      manual: true,
      values: { ...manual },
    }])
    setManual(Object.fromEntries(manualFields.map((field) => [field.key, ''])))
    setManualErrors({})
  }

  return <div className="hybrid-multi-selector">
    <div className="hybrid-multi-head">
      <strong>{label}</strong>
      <div className="hybrid-multi-modes">
        <button type="button" className={mode === 'list' ? 'active' : ''} onClick={() => setMode('list')}>{L('Από λίστα','From list')}</button>
        <button type="button" className={mode === 'manual' ? 'active' : ''} onClick={() => setMode('manual')}>{L('Χειροκίνητα','Manual')}</button>
      </div>
    </div>

    {mode === 'list' ? <>
      <label className="hybrid-multi-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={L('Αναζήτηση...','Search...')} /></label>
      <div className="hybrid-multi-list">
        {filtered.map((item) => {
          const id = String(getId(item))
          return <label key={id} className={selectedIds.has(id) ? 'selected' : ''}>
            <input type="checkbox" checked={selectedIds.has(id)} onChange={() => toggle(item)} />
            <span><strong>{getName(item)}</strong><small>{getMeta(item) || '—'}</small></span>
          </label>
        })}
      </div>
    </> : <div className="hybrid-multi-manual">
      {manualFields.map((field) => <label key={field.key}><span>{field.label}{field.required ? ' *' : ''}</span><input aria-invalid={Boolean(manualErrors[field.key])} value={manual[field.key] || ''} onChange={(event) => updateManual(field.key, event.target.value)} />{manualErrors[field.key] && <small className="core-field__error">{manualErrors[field.key]}</small>}</label>)}
      <button type="button" className="hybrid-multi-add" onClick={addManual}><Plus size={15}/> {L('Προσθήκη','Add')}</button>
    </div>}

    {selected.length > 0 && <div className="hybrid-multi-selected">
      {selected.map((item) => <span key={item.id}>{item.name}<button type="button" aria-label={L('Αφαίρεση','Remove')} onClick={() => onChange(selected.filter((entry) => entry.id !== item.id))}><X size={13}/></button></span>)}
    </div>}
  </div>
}
