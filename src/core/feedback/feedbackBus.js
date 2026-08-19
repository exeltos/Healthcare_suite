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
