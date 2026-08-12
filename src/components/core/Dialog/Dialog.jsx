import { useEffect, useId, useRef } from 'react'
import Button from '../Button/Button'
import './Dialog.css'

export default function Dialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  children,
  variant = 'default',
  confirmLabel = 'Επιβεβαίωση',
  cancelLabel = 'Ακύρωση',
  loading = false,
  closeOnBackdrop = true,
}) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    const onKey = (event) => event.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="core-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && closeOnBackdrop) onClose?.()
      }}
    >
      <section
        ref={dialogRef}
        className={`core-dialog core-dialog--${variant}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className="core-dialog__content">
          <div className="core-dialog__icon" aria-hidden="true">
            {variant === 'danger' ? '!' : variant === 'warning' ? '!' : 'i'}
          </div>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
            {children && <div className="core-dialog__body">{children}</div>}
          </div>
        </div>
        <footer className="core-dialog__footer">
          <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={loading}>
            {loading ? 'Παρακαλώ περιμένετε…' : confirmLabel}
          </Button>
        </footer>
      </section>
    </div>
  )
}
