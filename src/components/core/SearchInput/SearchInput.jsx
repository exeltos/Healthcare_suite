import './SearchInput.css'

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
        <button
          type="button"
          className="core-search-input__clear"
          onClick={() => onChange?.('')}
          aria-label="Καθαρισμός αναζήτησης"
        >
          ×
        </button>
      ) : null}
    </label>
  )
}
