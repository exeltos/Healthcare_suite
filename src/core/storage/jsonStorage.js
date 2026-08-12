function getStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function readRaw(storageKey) {
  try {
    return getStorage()?.getItem(storageKey) ?? null
  } catch {
    return null
  }
}

export function hasStoredValue(storageKey) {
  return readRaw(storageKey) !== null
}

export function readJson(storageKey, fallback = null) {
  try {
    const raw = readRaw(storageKey)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function readJsonArray(storageKey, fallback = []) {
  const parsed = readJson(storageKey, fallback)
  return Array.isArray(parsed) ? parsed : fallback
}

export function readJsonObject(storageKey, fallback = {}) {
  const parsed = readJson(storageKey, fallback)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback
}

export function writeJson(storageKey, value) {
  try {
    getStorage()?.setItem(storageKey, JSON.stringify(value))
  } catch {
    // Storage can be unavailable or full; persistence failure must not crash the UI.
  }
  return value
}

export function removeStoredValue(storageKey) {
  try {
    getStorage()?.removeItem(storageKey)
  } catch {
    // Keep callers safe when browser storage is unavailable.
  }
}
