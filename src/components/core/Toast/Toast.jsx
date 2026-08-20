import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { subscribeFeedback } from '../../../core/feedback'
import './Toast.css'

const ToastContext = createContext(null)
let toastSequence = 0

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const dismiss = useCallback((id) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback((options) => {
    const toast = typeof options === 'string' ? { message: options } : options
    const id = ++toastSequence
    const item = { id, type: 'info', duration: 4000, ...toast }
    setItems((current) => [...current, item])
    if (item.duration > 0) window.setTimeout(() => dismiss(id), item.duration)
    return id
  }, [dismiss])

  useEffect(() => subscribeFeedback((item) => notify(item)), [notify])

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="core-toast-region" aria-live="polite" aria-relevant="additions removals">
        {items.map((item) => (
          <div key={item.id} className={`core-toast core-toast--${item.type}`} role="status">
            <span className="core-toast__mark" aria-hidden="true">
              {['success','saved-demo','saved-production'].includes(item.type) ? '✓' : item.type === 'error' ? '!' : item.type === 'warning' ? '!' : 'i'}
            </span>
            <div className="core-toast__content">
              {item.title && <strong>{item.title}</strong>}
              <span>{item.message}</span>
            </div>
            <button type="button" onClick={() => dismiss(item.id)} aria-label="Κλείσιμο">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('Το useToast πρέπει να χρησιμοποιείται μέσα σε ToastProvider.')
  return context
}
