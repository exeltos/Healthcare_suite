import { IS_PRODUCTION } from '../runtime'

const PRODUCTION_PREFERENCE_KEYS = new Set([
  'limoxis.language',
  'healthcare-suite.accessibility',
  'limoxis:notifications:read:v1',
])

// Production operational data must never be persisted in browser storage.
// Supabase remains the source of truth. This in-memory map exists only for
// synchronous UI repositories during the lifetime of the current page.
const productionMemory = new Map()

function isProductionPreference(storageKey){
  return PRODUCTION_PREFERENCE_KEYS.has(String(storageKey))
}

function getStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function readRaw(storageKey) {
  try {
    if(IS_PRODUCTION && !isProductionPreference(storageKey)){
      return productionMemory.has(String(storageKey))
        ? productionMemory.get(String(storageKey))
        : null
    }
    return getStorage()?.getItem(storageKey) ?? null
  } catch {
    return null
  }
}

function persist(storageKey, value) {
  if(IS_PRODUCTION && !isProductionPreference(storageKey)){
    productionMemory.set(String(storageKey),JSON.stringify(value))
    return value
  }
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
 * Standard repository write.
 * In Production, operational data are written only to ephemeral memory.
 * Supabase backend services are responsible for durable persistence.
 */
export function writeJson(storageKey, value) {
  try {
    return persist(storageKey,value)
  } catch {
    return value
  }
}

/**
 * Explicit read-through mirror for data loaded from / committed to Supabase.
 * In Production this is also memory-only and disappears on page reload.
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
    productionMemory.delete(String(storageKey))
    if(!IS_PRODUCTION || isProductionPreference(storageKey)){
      getStorage()?.removeItem(storageKey)
    }else{
      // Also remove any stale operational value left by an older release.
      getStorage()?.removeItem(storageKey)
    }
  } catch {
    // Keep callers safe when browser storage is unavailable.
  }
}
