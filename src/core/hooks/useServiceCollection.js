import { useCallback, useState } from 'react'
import { useAppEvents } from '../events'

/**
 * Shared read/subscription hook for synchronous domain services.
 * Keeps pages free from repeated useState(loader) + event refresh boilerplate.
 */
export function useServiceCollection(loader, eventNames, { includeStorage = true } = {}) {
  const load = useCallback(() => loader?.() || [], [loader])
  const [records, setRecords] = useState(load)
  const refresh = useCallback(() => setRecords(load()), [load])
  useAppEvents(eventNames, refresh, { includeStorage })
  return [records, refresh, setRecords]
}

export default useServiceCollection
