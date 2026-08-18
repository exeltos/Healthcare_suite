import './EntityList.css'

export function EntitySummary({ children, columns = 4, ariaLabel }) {
  return (
    <section
      className="core-entity-summary"
      style={{ '--core-entity-summary-columns': columns }}
      aria-label={ariaLabel}
    >
      {children}
    </section>
  )
}

export function EntityCell({ primary, secondary, className = '' }) {
  return (
    <div className={`core-entity-cell ${className}`.trim()}>
      <strong>{primary || '—'}</strong>
      {secondary !== undefined && secondary !== null && secondary !== '' ? <span>{secondary}</span> : null}
    </div>
  )
}

export function EntityBadges({ children, empty = 'Καμία ένδειξη' }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : (children ? [children] : [])
  return items.length
    ? <div className="core-entity-badges">{items}</div>
    : <span className="core-entity-muted">{empty}</span>
}
