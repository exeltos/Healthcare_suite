import Badge from '../Badge/Badge'
import './Timeline.css'

export default function Timeline({ items = [], empty = null, formatDateTime = (date, time) => [date, time].filter(Boolean).join(' · '), onItemClick }) {
  if (!items.length) return empty
  return <div className="core-timeline">{items.map((item, index) => {
    const clickable = Boolean(onItemClick && item.clickable !== false)
    return <div
      key={`${item.type || 'event'}-${item.id || index}-${item.date || ''}-${item.time || ''}`}
      className={`core-timeline__item core-timeline__item--${item.tone || 'default'} ${clickable ? 'core-timeline__item--clickable' : ''}`}
      onClick={clickable ? () => onItemClick(item) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (event) => { if (event.key === 'Enter' || event.key === ' ') onItemClick(item) } : undefined}
    >
      <div className="core-timeline__marker">{item.icon}</div>
      <div className="core-timeline__content">
        <div className="core-timeline__top"><b>{item.title}</b><time>{formatDateTime(item.date, item.time)}</time></div>
        {item.description && <p>{item.description}</p>}
        {item.badge && <Badge tone={item.badgeTone || 'neutral'}>{item.badge}</Badge>}
      </div>
    </div>
  })}</div>
}
