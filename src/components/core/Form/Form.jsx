import { useEffect, useId, useRef } from 'react'
import './Form.css'

export default function Form({
  id,
  children,
  className = '',
  onSubmit,
  onCancel,
  isDirty = false,
  warnOnUnsavedChanges = true,
  shortcutSave = true,
  noValidate = true,
  ...props
}) {
  const generatedId = useId()
  const formId = id || `limoxis-form-${generatedId.replace(/:/g, '')}`
  const formRef = useRef(null)

  useEffect(() => {
    if (!warnOnUnsavedChanges || !isDirty) return undefined
    const beforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [isDirty, warnOnUnsavedChanges])

  useEffect(() => {
    const onKeyDown = (event) => {
      const savePressed = shortcutSave && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's'
      if (savePressed) {
        event.preventDefault()
        formRef.current?.requestSubmit()
      }
      if (event.key === 'Escape' && onCancel) onCancel(event)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel, shortcutSave])

  return (
    <form
      ref={formRef}
      id={formId}
      className={`core-form ${className}`.trim()}
      onSubmit={onSubmit}
      noValidate={noValidate}
      {...props}
    >
      {children}
    </form>
  )
}
