import { APP_EVENTS } from '../core/events'
import { createCollectionRepository } from './createCollectionRepository'

export const ISOLATIONS_EVENT = APP_EVENTS.ISOLATIONS_UPDATED

function normalize(record = {}) {
  const today = new Date().toISOString().slice(0, 10)
  const status = record.status === 'Ακυρωμένη' ? 'Ακυρωμένη' : (record.endDate && record.endDate < today ? 'Ολοκληρωμένη' : 'Ενεργή')
  return {
    ...record,
    status,
    id: record.id || `ISO-${Date.now()}`,
  }
}

export const isolationsRepository = createCollectionRepository({
  storageKey: 'limoxisIsolations',
  eventName: ISOLATIONS_EVENT,
  normalize,
})
