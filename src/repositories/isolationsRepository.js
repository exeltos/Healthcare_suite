import { APP_EVENTS } from '../core/events'
import { createCollectionRepository } from './createCollectionRepository'

export const ISOLATIONS_EVENT = APP_EVENTS.ISOLATIONS_UPDATED

function normalize(record = {}) {
  return {
    status: 'Ενεργή',
    ...record,
    id: record.id || `ISO-${Date.now()}`,
  }
}

export const isolationsRepository = createCollectionRepository({
  storageKey: 'limoxisIsolations',
  eventName: ISOLATIONS_EVENT,
  normalize,
})
