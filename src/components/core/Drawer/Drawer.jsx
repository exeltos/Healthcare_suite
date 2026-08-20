import { useEffect, useId, useMemo, useRef } from 'react'
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
  presentation = 'auto',
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

  const normalizedWidth = typeof width === 'number' ? `${width}px` : width
  const resolvedPresentation = useMemo(() => {
    if (presentation === 'modal' || presentation === 'workspace') return presentation
    const numericWidth = typeof width === 'number' ? width : Number.parseFloat(String(width))
    return Number.isFinite(numericWidth) && numericWidth <= 620 ? 'modal' : 'workspace'
  }, [presentation, width])
  const isModal = resolvedPresentation === 'modal'

  onCloseRef.current = onClose
  closeOnEscapeRef.current = closeOnEscape

  useEffect(() => {
    if (!open) return undefined

    const previousActive = document.activeElement
    const previousOverflow = document.body.style.overflow
    if (isModal) document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const firstFocusable = panel?.querySelector(focusableSelector)
    ;(firstFocusable || panel)?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape' && closeOnEscapeRef.current) {
        event.preventDefault()
        onCloseRef.current?.()
        return
      }

      if (!isModal || event.key !== 'Tab' || !panel) return
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
      if (isModal) document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      previousActive?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className={`core-drawer-backdrop core-drawer-backdrop--${resolvedPresentation}`}
      onMouseDown={(event) => {
        if (isModal && event.target === event.currentTarget && closeOnBackdrop) onClose?.()
      }}
    >
      <aside
        ref={panelRef}
        className={`core-drawer core-drawer--${position} core-drawer--${resolvedPresentation}`}
        style={{ '--core-drawer-width': normalizedWidth }}
        role={isModal ? 'dialog' : 'region'}
        aria-modal={isModal ? 'true' : undefined}
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
