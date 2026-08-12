import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../../core/events'
import { BookOpen, PencilLine } from 'lucide-react'
import { activeMasterItems, MASTER_DATA_EVENT, upsertMasterItem } from '../../../services/masterDataService'
import './LibraryField.css'
import { useI18n } from '../../../i18n'

export default function LibraryField({
  label,
  libraryKey,
  category = '',
  value,
  onChange,
  allowEmpty = true,
  allowManual = false,
  placeholder = '—',
  hideLabel = false,
  disabled = false,
  saveManualToLibrary = true,
  getOptionLabel,
}) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const [version, setVersion] = useState(0)
  const [manual, setManual] = useState(false)

  useAppEvents(MASTER_DATA_EVENT, () => setVersion((item) => item + 1), { includeStorage: true })

  const items = useMemo(
    () => activeMasterItems(libraryKey, category),
    [libraryKey, category, version],
  )

  const hasHeader = (!hideLabel && label) || (allowManual && !disabled && !hideLabel)

  const saveManual = () => {
    if (!saveManualToLibrary || disabled) return
    const name = String(value || '').trim()
    if (!name) return
    const exists = items.some((item) => String(item.name || '').trim().toLocaleLowerCase('el-GR') === name.toLocaleLowerCase('el-GR'))
    if (!exists) upsertMasterItem(libraryKey, { name, category: category || undefined })
  }

  return (
    <label className={`core-library-field${hideLabel ? ' core-library-field--hide-label' : ''}`}>
      {hasHeader && (
        <span className="core-library-field__header">
          {!hideLabel && label ? <span className="core-library-field__label">{label}</span> : <span />}
          {allowManual && !disabled && (
            <button
              type="button"
              className="core-library-field__mode"
              onClick={(event) => {
                event.preventDefault()
                if (manual) saveManual()
                setManual((item) => !item)
              }}
              title={manual ? L('Επιλογή από βιβλιοθήκη', 'Select from library') : L('Χειροκίνητη καταχώρηση', 'Manual entry')}
            >
              {manual ? <BookOpen size={13} /> : <PencilLine size={13} />}
              {manual ? L('Από βιβλιοθήκη', 'From library') : L('Χειροκίνητα', 'Manual')}
            </button>
          )}
        </span>
      )}

      {manual ? (
        <input
          disabled={disabled}
          value={value || ''}
          placeholder={placeholder}
          onChange={(event) => onChange?.(event.target.value)}
          onBlur={saveManual}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
        />
      ) : (
        <select disabled={disabled} value={value || ''} onChange={(event) => onChange?.(event.target.value)}>
          {(allowEmpty || !value) && <option value="">{placeholder}</option>}
          {items.map((item) => (
            <option key={item.id} value={item.name}>{getOptionLabel ? getOptionLabel(item) : item.name}</option>
          ))}
        </select>
      )}

      {allowManual && !disabled && hideLabel && (
        <button
          type="button"
          className="core-library-field__mode core-library-field__mode--below"
          onClick={(event) => {
            event.preventDefault()
            if (manual) saveManual()
            setManual((item) => !item)
          }}
        >
          {manual ? <BookOpen size={13} /> : <PencilLine size={13} />}
          {manual ? L('Από βιβλιοθήκη', 'From library') : L('Χειροκίνητα', 'Manual')}
        </button>
      )}
    </label>
  )
}
