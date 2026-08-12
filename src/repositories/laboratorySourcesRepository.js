import { APP_EVENTS } from '../core/events'
import { createCollectionRepository } from './createCollectionRepository'

function normalizeSample(sourceType, prefix, statusField = 'status') {
  return (record = {}) => ({
    status: 'Εκκρεμεί', microorganism: '', resistance: '', resultDate: '', resultNotes: '', antibiogram: [], ...record,
    id: record.id || `${prefix}-${Date.now()}`, sourceType,
    [statusField]: record[statusField] || record.status || 'Εκκρεμεί',
    antibiogram: Array.isArray(record.antibiogram) ? record.antibiogram : [],
  })
}

export const staffSamplesRepository = createCollectionRepository({ storageKey: 'limoxisStaffSamples', eventName: APP_EVENTS.STAFF_SAMPLES_UPDATED, normalize: normalizeSample('Προσωπικό', 'STAFF') })
export const environmentalSamplesRepository = createCollectionRepository({ storageKey: 'limoxisEnvironmentalSamples', eventName: APP_EVENTS.ENVIRONMENTAL_SAMPLES_UPDATED, normalize: normalizeSample('Περιβάλλον', 'ENV') })
export const waterRecordsRepository = createCollectionRepository({ storageKey: 'limoxisWaterRecords', eventName: APP_EVENTS.WATER_RECORDS_UPDATED, normalize: normalizeSample('Νερό', 'WATER', 'resultStatus') })
