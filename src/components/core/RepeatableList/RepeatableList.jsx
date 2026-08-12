import { Plus } from 'lucide-react'
import Button from '../Button/Button'
import './RepeatableList.css'

export default function RepeatableList({
  eyebrow,
  title,
  description,
  items = [],
  onAdd,
  addLabel = 'Προσθήκη',
  emptyText = 'Δεν υπάρχουν εγγραφές.',
  className = '',
  listClassName = '',
  rowClassName = '',
  renderRow,
}) {
  return (
    <section className={`core-repeatable ${className}`.trim()}>
      {(eyebrow || title || description || onAdd) && (
        <header className="core-repeatable__header">
          <div>
            {eyebrow ? <small>{eyebrow}</small> : null}
            {title ? <strong>{title}</strong> : null}
            {description ? <span>{description}</span> : null}
          </div>
          {onAdd ? <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={onAdd}>{addLabel}</Button> : null}
        </header>
      )}
      {items.length ? (
        <div className={`core-repeatable__list ${listClassName}`.trim()}>
          {items.map((item, index) => (
            <div className={`core-repeatable__row ${rowClassName}`.trim()} key={item?.id || index}>
              {renderRow?.(item, index)}
            </div>
          ))}
        </div>
      ) : <div className="core-repeatable__empty">{emptyText}</div>}
    </section>
  )
}
