import { readJsonArray, removeStoredValue, writeJson } from '../core/storage'

const PREFIX = 'limoxis.studio.config.'
const storageKey = (moduleKey) => `${PREFIX}${moduleKey}`

export function readStudioConfig(moduleKey, fallback = []) {
  return readJsonArray(storageKey(moduleKey), fallback)
}

export function writeStudioConfig(moduleKey, rows) {
  return writeJson(storageKey(moduleKey), Array.isArray(rows) ? rows : [])
}

export function removeStudioConfig(moduleKey) {
  removeStoredValue(storageKey(moduleKey))
}
