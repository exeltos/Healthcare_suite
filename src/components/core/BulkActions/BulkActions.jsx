import Button from '../Button/Button'
import './BulkActions.css'

export default function BulkActions({ count = 0, children, onClear, label = 'επιλεγμένα' }) {
  if (!count) return null
  return (
    <div className="core-bulk-actions" role="region" aria-label="Μαζικές ενέργειες">
      <strong>{count} {label}</strong>
      <div className="core-bulk-actions__actions">{children}</div>
      {onClear ? <Button variant="ghost" size="sm" className="core-bulk-actions__clear" onClick={onClear}>Ακύρωση επιλογής</Button> : null}
    </div>
  )
}
