export const isBlank = (value) => value === null || value === undefined || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && value.length === 0)

export function required(message = 'Υποχρεωτικό πεδίο') {
  return (value) => (isBlank(value) ? message : '')
}

export function minLength(length, message = `Απαιτούνται τουλάχιστον ${length} χαρακτήρες`) {
  return (value) => (!isBlank(value) && String(value).trim().length < length ? message : '')
}

export function maxLength(length, message = `Επιτρέπονται έως ${length} χαρακτήρες`) {
  return (value) => (!isBlank(value) && String(value).trim().length > length ? message : '')
}

export function pattern(regex, message = 'Μη έγκυρη τιμή') {
  return (value) => (!isBlank(value) && !regex.test(String(value)) ? message : '')
}

export function email(message = 'Μη έγκυρη διεύθυνση email') {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return pattern(emailPattern, message)
}

export function numberRange({ min = -Infinity, max = Infinity, message } = {}) {
  return (value) => {
    if (isBlank(value)) return ''
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      return message || `Η τιμή πρέπει να είναι μεταξύ ${min} και ${max}`
    }
    return ''
  }
}

export function compose(...validators) {
  return (value, values) => {
    for (const validator of validators.filter(Boolean)) {
      const result = validator(value, values)
      if (result) return result
    }
    return ''
  }
}

export function validateValues(values, schema = {}) {
  const errors = {}
  Object.entries(schema).forEach(([field, validators]) => {
    const rules = Array.isArray(validators) ? validators : [validators]
    for (const validator of rules.filter(Boolean)) {
      const result = validator(values?.[field], values)
      if (result) {
        errors[field] = result
        break
      }
    }
  })
  return errors
}
