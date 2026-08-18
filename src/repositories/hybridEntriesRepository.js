import { createCollectionRepository } from './createCollectionRepository'
import { APP_EVENTS } from '../core/events'

const repository = createCollectionRepository({
  storageKey: 'limoxisHybridEntries',
  eventName: APP_EVENTS.NEW_ENTRY_CREATED,
})

export const hybridEntriesRepository = repository
