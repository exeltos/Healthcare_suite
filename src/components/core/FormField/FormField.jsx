import { cloneElement, isValidElement, useId } from 'react'
import './FormField.css'

export default function FormField({
  id,
  label,
  required = false,
  error,
  helpText,
  children,
  className = '',
  fullWidth = false,
  disabled = false,
}) {
  const generatedId = useId()
  const fieldId = id || `field-${generatedId.replace(/:/g, '')}`
  const helpId = helpText ? `${fieldId}-help` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined

  const isNativeControl = isValidElement(children) && typeof children.type === 'string'
    && ['input', 'select', 'textarea'].includes(children.type)
  const inputType = isNativeControl && children.type === 'input' ? (children.props.type || 'text') : null
  const shouldNormalizeControl = isNativeControl && !['checkbox', 'radio', 'file', 'range', 'color', 'hidden'].includes(inputType)
  const nativeClassName = shouldNormalizeControl
    ? ['core-control', children.props.className].filter(Boolean).join(' ')
    : children?.props?.className

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id || fieldId,
        disabled: children.props.disabled ?? disabled,
        className: nativeClassName,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy,
      })
    : children

  return (
    <div className={`core-field ${error ? 'core-field--error' : ''} ${disabled ? 'core-field--disabled' : ''} ${fullWidth ? 'core-field--full' : ''} ${className}`.trim()}>
      {label && (
        <label className="core-field__label" htmlFor={fieldId}>
          {label}{required && <span className="core-field__required" aria-hidden="true">*</span>}
        </label>
      )}
      {control}
      {helpText && <span id={helpId} className="core-field__help">{helpText}</span>}
      {error && <span id={errorId} className="core-field__error" role="alert">{error}</span>}
    </div>
  )
}
