import { IS_PRODUCTION } from '../runtime'

const PRODUCTION_PREFERENCE_KEYS = new Set([
  'limoxis.language',
  'healthcare-suite.accessibility',
  'limoxis:notifications:read:v1',
])

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

function persist(storageKey, value) {
  const storage=getStorage()
  if(!storage) return value
  storage.setItem(storageKey, JSON.stringify(value))
  return value
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

/**
 * Standard browser persistence.
 * In Production this is intentionally limited to non-operational UI preferences.
 * Clinical/quality/configuration repositories must use their Supabase backend boundary.
 */
export function writeJson(storageKey, value) {
  if (IS_PRODUCTION && !PRODUCTION_PREFERENCE_KEYS.has(String(storageKey))) {
    throw new Error(`Production browser-only persistence is blocked for "${storageKey}".`)
  }
  try {
    return persist(storageKey,value)
  } catch {
    return value
  }
}

/**
 * Explicit read-through cache for data already loaded from / committed to
 * the Production backend. Never use this as a fallback mutation path.
 */
export function writeJsonCache(storageKey, value) {
  try {
    return persist(storageKey,value)
  } catch {
    return value
  }
}

export function removeStoredValue(storageKey) {
  try {
    getStorage()?.removeItem(storageKey)
  } catch {
    // Keep callers safe when browser storage is unavailable.
  }
}
