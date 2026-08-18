import './Tooltip.css'

export default function Tooltip({ label, position = 'top', children }) {
  if (!label) return children
  return (
    <span className={`core-tooltip core-tooltip--${position}`} data-tooltip={label}>
      {children}
    </span>
  )
}
