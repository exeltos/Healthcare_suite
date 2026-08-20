import { Save, Trash2, X } from 'lucide-react'
import './Button.css'

export default function Button({ variant = 'primary', size = 'md', icon, children, className = '', type = 'button', loading = false, loadingLabel, disabled, ...props }) {
  const label = typeof children === 'string' ? children.trim() : ''
  const normalizedLabel = label.toLocaleLowerCase('el-GR')
  const isSaveAction = normalizedLabel.startsWith('αποθήκευση') || normalizedLabel.startsWith('save')
  const isCancelAction = normalizedLabel === 'ακύρωση' || normalizedLabel === 'cancel'
  const isDeleteAction = normalizedLabel.startsWith('διαγραφή') || normalizedLabel.startsWith('delete')
  const canonicalVariant = isDeleteAction ? 'danger' : isCancelAction ? 'secondary' : isSaveAction ? 'primary' : variant
  const canonicalIcon = isDeleteAction ? <Trash2 size={16} /> : isCancelAction ? <X size={16} /> : isSaveAction ? <Save size={16} /> : icon
  const resolvedLoadingLabel = loadingLabel ?? (label ? `${label}…` : 'Επεξεργασία…')
  return (
    <button
      type={type}
      className={`lds-button lds-button--${canonicalVariant} lds-button--${size} ${loading ? 'is-loading' : ''} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="lds-button__spinner" aria-hidden="true" /> : canonicalIcon}
      {children && <span>{loading ? resolvedLoadingLabel : children}</span>}
    </button>
  )
}
