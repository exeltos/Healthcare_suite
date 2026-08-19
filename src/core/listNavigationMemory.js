const PREFIX = 'healthcare-suite:list-opened-row:'

function storageKey(scope) {
  return `${PREFIX}${String(scope || 'default')}`
}

/**
 * Stores only the record that was just opened. The list itself decides whether
 * the value is eligible for display; normal section navigation never restores it.
 */
export function rememberLastOpenedRow(scope, rowKey) {
  if (rowKey === undefined || rowKey === null || rowKey === '') return
  try {
    sessionStorage.setItem(storageKey(scope), String(rowKey))
  } catch {
    // Navigation context is progressive enhancement only.
  }
}
