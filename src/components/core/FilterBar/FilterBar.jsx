import SearchInput from '../SearchInput/SearchInput'
import Button from '../Button/Button'
import './FilterBar.css'

export function FilterGroup({ label, children, className = '' }) {
  return (
    <div className={`core-filter-group ${className}`.trim()}>
      {label ? <span className="core-filter-group__label">{label}</span> : null}
      {children}
    </div>
  )
}

export default function FilterBar({
  children,
  start,
  end,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Αναζήτηση…',
  activeCount = 0,
  onClear,
  onMoreFilters,
  moreFiltersLabel = 'Περισσότερα φίλτρα',
  compact = false,
  equalControls = false,
  sticky = false,
  className = '',
  ariaLabel = 'Φίλτρα λίστας',
}) {
  const hasSearch = typeof onSearchChange === 'function' || searchValue !== undefined

  return (
    <section
      className={`core-filter-bar ${compact ? 'core-filter-bar--compact' : ''} ${equalControls ? 'core-filter-bar--equal-controls' : ''} ${sticky ? 'core-filter-bar--sticky' : ''} ${className}`.trim()}
      aria-label={ariaLabel}
    >
      <div className="core-filter-bar__main">
        {hasSearch ? (
          <SearchInput
            value={searchValue || ''}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            className="core-filter-bar__search"
          />
        ) : null}
        {start}
        {children}
      </div>
      <div className="core-filter-bar__actions">
        {activeCount > 0 ? <span className="core-filter-bar__count">{activeCount} ενεργά</span> : null}
        {onMoreFilters ? (
          <Button variant="secondary" size={compact ? 'sm' : 'md'} onClick={onMoreFilters}>
            {moreFiltersLabel}
          </Button>
        ) : null}
        {activeCount > 0 && onClear ? (
          <Button variant="ghost" size={compact ? 'sm' : 'md'} onClick={onClear}>Καθαρισμός</Button>
        ) : null}
        {end}
      </div>
    </section>
  )
}
