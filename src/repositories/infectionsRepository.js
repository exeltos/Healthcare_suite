import { APP_EVENTS } from '../core/events'
import { createCollectionRepository } from './createCollectionRepository'

export const INFECTIONS_EVENT = APP_EVENTS.INFECTIONS_UPDATED

function normalize(record = {}) {
  return {
    status: 'Ενεργή',
    origin: 'Νοσοκομειακή',
    ...record,
    id: record.id || `INF-${Date.now()}`,
  }
}

export const infectionsRepository = createCollectionRepository({
  storageKey: 'limoxisInfections',
  eventName: INFECTIONS_EVENT,
  normalize,
})
