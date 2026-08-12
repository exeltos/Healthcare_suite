import { Activity } from 'lucide-react'
import './StatCard.css'

export default function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'default',
  compact = false,
  subtitle = '',
  className = '',
  as: Tag = 'article',
  ...props
}) {
  const DisplayIcon = Icon || Activity

  return (
    <Tag className={`common-stat-card tone-${tone} ${compact ? 'is-compact' : ''} ${className}`.trim()} {...props}>
      <div className="common-stat-card-heading">
        <span className="common-stat-card-icon" aria-hidden="true">
          <DisplayIcon size={21} strokeWidth={2} />
        </span>
        <span className="common-stat-card-label">{label}</span>
      </div>
      <strong className="common-stat-card-value">{value}</strong>
      {subtitle ? <span className="common-stat-card-subtitle">{subtitle}</span> : null}
    </Tag>
  )
}
