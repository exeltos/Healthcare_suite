import './FormGrid.css'

export default function FormGrid({ children, columns = 2, className = '', compact = false }) {
  const safeColumns = Math.min(3, Math.max(1, Number(columns) || 2))
  return (
    <div
      className={`core-form-grid ${compact ? 'core-form-grid--compact' : ''} ${className}`.trim()}
      style={{ '--core-form-columns': safeColumns }}
    >
      {children}
    </div>
  )
}
