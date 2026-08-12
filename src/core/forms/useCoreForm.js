import { useCallback, useMemo, useRef, useState } from 'react'
import { validateValues } from './validation'

function resolveInitial(initialValues) {
  return typeof initialValues === 'function' ? initialValues() : initialValues
}

export default function useCoreForm({ initialValues = {}, validationSchema = {}, transform, onSubmit } = {}) {
  const initialRef = useRef(resolveInitial(initialValues))
  const [values, setValues] = useState(() => ({ ...initialRef.current }))
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const setFieldValue = useCallback((name, value, { touch = false } = {}) => {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => current[name] ? ({ ...current, [name]: '' }) : current)
    if (touch) setTouched((current) => ({ ...current, [name]: true }))
  }, [])

  const setFieldTouched = useCallback((name, value = true) => {
    setTouched((current) => ({ ...current, [name]: value }))
  }, [])

  const reset = useCallback((nextValues) => {
    const resolved = nextValues ? resolveInitial(nextValues) : initialRef.current
    if (nextValues) initialRef.current = { ...resolved }
    setValues({ ...resolved })
    setErrors({})
    setTouched({})
    setSubmitting(false)
  }, [])

  const replaceValues = useCallback((nextValues, { asInitial = false } = {}) => {
    const resolved = resolveInitial(nextValues)
    if (asInitial) initialRef.current = { ...resolved }
    setValues({ ...resolved })
    setErrors({})
    setTouched({})
  }, [])

  const validate = useCallback((candidate = values) => {
    const nextErrors = validateValues(candidate, validationSchema)
    setErrors(nextErrors)
    return nextErrors
  }, [validationSchema, values])

  const handleChange = useCallback((eventOrName, explicitValue) => {
    if (typeof eventOrName === 'string') {
      setFieldValue(eventOrName, explicitValue)
      return
    }
    const target = eventOrName?.target
    if (!target?.name) return
    const value = target.type === 'checkbox' ? target.checked : target.value
    setFieldValue(target.name, value)
  }, [setFieldValue])

  const handleBlur = useCallback((eventOrName) => {
    const name = typeof eventOrName === 'string' ? eventOrName : eventOrName?.target?.name
    if (name) setFieldTouched(name, true)
  }, [setFieldTouched])

  const submit = useCallback(async (event) => {
    event?.preventDefault?.()
    const nextErrors = validateValues(values, validationSchema)
    setErrors(nextErrors)
    setTouched(Object.keys(validationSchema).reduce((acc, key) => ({ ...acc, [key]: true }), {}))
    if (Object.keys(nextErrors).length) return { ok: false, errors: nextErrors }

    const payload = transform ? transform(values) : values
    if (!onSubmit) return { ok: true, values: payload }

    setSubmitting(true)
    try {
      const result = await onSubmit(payload)
      return { ok: true, values: payload, result }
    } finally {
      setSubmitting(false)
    }
  }, [onSubmit, transform, validationSchema, values])

  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialRef.current),
    [values],
  )

  const field = useCallback((name) => ({
    name,
    value: values[name] ?? '',
    onChange: handleChange,
    onBlur: handleBlur,
    error: errors[name] || '',
  }), [errors, handleBlur, handleChange, values])

  return {
    values,
    errors,
    touched,
    isDirty,
    submitting,
    setValues,
    setErrors,
    setFieldValue,
    setFieldTouched,
    replaceValues,
    reset,
    validate,
    handleChange,
    handleBlur,
    submit,
    field,
  }
}
