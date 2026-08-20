const listeners = new Set()

export function publishFeedback(payload = {}) {
  const item = typeof payload === 'string' ? { message: payload } : payload
  if (!item?.message) return
  listeners.forEach((listener) => listener(item))
}

export function subscribeFeedback(listener) {
  if (typeof listener !== 'function') return () => {}
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function feedbackSuccess(message = 'Οι αλλαγές αποθηκεύτηκαν.', options = {}) {
  publishFeedback({ type: 'success', title: 'Αποθηκεύτηκε', message, ...options })
}

export function feedbackInfo(message, options = {}) {
  publishFeedback({ type: 'info', message, ...options })
}

export function feedbackWarning(message, options = {}) {
  publishFeedback({ type: 'warning', message, ...options })
}

export function feedbackError(message, options = {}) {
  publishFeedback({ type: 'error', title: 'Προέκυψε πρόβλημα', message, duration: 6000, ...options })
}

export function feedbackSaved(options = {}) {
  const demo = typeof window !== 'undefined' && window.sessionStorage?.getItem('healthcare-suite.runtime-demo') === 'true'
  publishFeedback({ type: demo ? 'saved-demo' : 'saved-production', title: 'Αποθηκεύτηκε', message: 'Αποθήκευση', duration: 2800, ...options })
}
