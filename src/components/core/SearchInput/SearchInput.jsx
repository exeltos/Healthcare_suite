import './SearchInput.css'
import IconButton from '../IconButton/IconButton'

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Αναζήτηση…',
  ariaLabel = 'Αναζήτηση',
  className = '',
  disabled = false,
}) {
  return (
    <label className={`core-search-input ${className}`.trim()}>
      <span className="core-search-input__icon" aria-hidden="true">⌕</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
      />
      {value && !disabled ? (
        <IconButton
          className="core-search-input__clear"
          onClick={() => onChange?.('')}
          label="Καθαρισμός αναζήτησης"
        >
          ×
        </IconButton>
      ) : null}
    </label>
  )
}
