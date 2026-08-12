import './EmptyState.css'

export default function EmptyState({ icon, title, description, text, action, compact = false, className = '' }) {
  const resolvedDescription = description ?? text
  return (
    <div className={`lds-empty-state ${compact ? 'lds-empty-state--compact' : ''} ${className}`.trim()} role="status">
      {icon && <div className="lds-empty-state__icon">{icon}</div>}
      {title && <h3>{title}</h3>}
      {resolvedDescription && <p>{resolvedDescription}</p>}
      {action && <div className="lds-empty-state__action">{action}</div>}
    </div>
  )
}
