import './Tabs.css'

export default function Tabs({ items = [], value, onChange, ariaLabel = 'Ενότητες', variant = 'line' }) {
  return (
    <div className={`core-tabs core-tabs--${variant}`} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          disabled={item.disabled}
          className={value === item.id ? 'is-active' : ''}
          onClick={() => onChange?.(item.id)}
        >
          {item.icon && <span aria-hidden="true">{item.icon}</span>}
          <span>{item.label}</span>
          {item.count !== undefined && <span className="core-tabs__count">{item.count}</span>}
        </button>
      ))}
    </div>
  )
}
