import { emitAppEvent } from '../core/events'
import { hasStoredValue, readJsonArray, writeJson } from '../core/storage'

/**
 * Canonical repository for persisted entity collections.
 * Services/UI depend on this repository API, never on the storage mechanism.
 */
export function createCollectionRepository({
  storageKey,
  eventName,
  normalize = (record) => record,
  seed = [],
  afterSave,
  afterUpsert,
  afterRemove,
}) {
  function findAll() {
    const source = hasStoredValue(storageKey) ? readJsonArray(storageKey) : seed
    return source.map(normalize)
  }

  function replaceAll(records = [], { emit = true } = {}) {
    const normalized = records.map(normalize)
    writeJson(storageKey, normalized)
    if (emit && eventName) emitAppEvent(eventName, normalized)
    afterSave?.(normalized)
    return normalized
  }

  function save(record) {
    const normalized = normalize(record)
    const records = findAll()
    const exists = records.some((item) => item.id === normalized.id)
    const next = exists
      ? records.map((item) => (item.id === normalized.id ? normalized : item))
      : [normalized, ...records]

    replaceAll(next)
    afterUpsert?.(normalized, next)
    return normalized
  }

  function remove(recordId) {
    const next = findAll().filter((record) => record.id !== recordId)
    replaceAll(next)
    afterRemove?.(recordId, next)
    return next
  }

  return Object.freeze({ findAll, replaceAll, save, remove })
}
