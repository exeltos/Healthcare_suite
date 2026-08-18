import { useEffect, useRef } from 'react'
import { subscribeAppEvents } from './applicationEventBus'

/**
 * React subscription to one or more application events.
 * Keeps the latest callback without forcing event subscriptions to churn.
 */
export function useAppEvents(eventNames, listener, { includeStorage = false } = {}) {
  const listenerRef = useRef(listener)
  listenerRef.current = listener
  const eventKey = (Array.isArray(eventNames) ? eventNames : [eventNames]).filter(Boolean).join('|')

  useEffect(() => subscribeAppEvents(
    eventKey ? eventKey.split('|') : [],
    (event) => listenerRef.current?.(event),
    { includeStorage },
  ), [eventKey, includeStorage])
}

export default useAppEvents
