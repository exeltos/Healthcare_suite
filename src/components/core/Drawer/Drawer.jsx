import { useEffect, useId, useRef } from 'react'
import IconButton from '../IconButton/IconButton'
import './Drawer.css'

const focusableSelector = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function Drawer({
  open,
  onClose,
  title,
  description,
  width = '960px',
  position = 'right',
  header,
  actions,
  footer,
  tabs,
  activeTab,
  onTabChange,
  closeOnBackdrop = true,
  closeOnEscape = true,
  children,
}) {
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const closeOnEscapeRef = useRef(closeOnEscape)
  const titleId = useId()
  const descriptionId = useId()

  // Keep mutable drawer actions current without restarting the focus-trap effect.
  // Parent pages commonly pass inline callbacks; depending on those callbacks here
  // would tear down/recreate the effect on every keystroke and steal input focus.
  onCloseRef.current = onClose
  closeOnEscapeRef.current = closeOnEscape

  useEffect(() => {
    if (!open) return undefined

    const previousActive = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const firstFocusable = panel?.querySelector(focusableSelector)
    ;(firstFocusable || panel)?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape' && closeOnEscapeRef.current) {
        event.preventDefault()
        onCloseRef.current?.()
        return
      }

      if (event.key !== 'Tab' || !panel) return
      const focusable = [...panel.querySelectorAll(focusableSelector)]
      if (!focusable.length) {
        event.preventDefault()
        panel.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      previousActive?.focus?.()
    }
  }, [open])

  if (!open) return null

  const normalizedWidth = typeof width === 'number' ? `${width}px` : width

  return (
    <div
      className="core-drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && closeOnBackdrop) onClose?.()
      }}
    >
      <aside
        ref={panelRef}
        className={`core-drawer core-drawer--${position}`}
        style={{ '--core-drawer-width': normalizedWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <header className="core-drawer__header">
          <div className="core-drawer__heading">
            {header || (
              <>
                {title && <h2 id={titleId}>{title}</h2>}
                {description && <p id={descriptionId}>{description}</p>}
              </>
            )}
          </div>
          <IconButton label="Κλείσιμο" onClick={onClose}>×</IconButton>
        </header>

        {actions && <div className="core-drawer__actions">{actions}</div>}

        {tabs?.length > 0 && (
          <nav className="core-drawer__tabs" aria-label="Ενότητες">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'is-active' : ''}
                onClick={() => onTabChange?.(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}

        <div className="core-drawer__body">{children}</div>
        {footer && <footer className="core-drawer__footer">{footer}</footer>}
      </aside>
    </div>
  )
}
