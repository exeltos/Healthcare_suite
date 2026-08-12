import './Button.css'

export default function Button({ variant = 'primary', size = 'md', icon, children, className = '', type = 'button', loading = false, loadingLabel, disabled, ...props }) {
  const resolvedLoadingLabel = loadingLabel ?? (typeof children === 'string' && children.trim() ? `${children}…` : 'Επεξεργασία…')
  return (
    <button
      type={type}
      className={`lds-button lds-button--${variant} lds-button--${size} ${loading ? 'is-loading' : ''} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="lds-button__spinner" aria-hidden="true" /> : icon}
      {children && <span>{loading ? resolvedLoadingLabel : children}</span>}
    </button>
  )
}
