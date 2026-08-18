import { APP_EVENTS } from '../core/events'
import { createCollectionRepository } from './createCollectionRepository'

const simple = (storageKey, eventName, prefix, normalize = (record = {}) => record) => createCollectionRepository({
  storageKey,
  eventName,
  normalize: (record = {}) => ({ ...normalize(record), id: record.id || `${prefix}-${Date.now()}` }),
})

export const antisepticRepository = simple('limoxisAntisepticConsumption', APP_EVENTS.ANTISEPTIC_CONSUMPTION_UPDATED, 'ANT')
export const wasteRepository = simple('limoxisWasteMeasurements', APP_EVENTS.WASTE_MEASUREMENTS_UPDATED, 'WASTE')
export const preventionAuditsRepository = simple('limoxisPreventionAudits', APP_EVENTS.PREVENTION_AUDITS_UPDATED, 'AUD')
export const bundlesRepository = simple('limoxisBundles', APP_EVENTS.BUNDLES_UPDATED, 'BND')
export const promotedAntibioticsRepository = simple('limoxisPromotedAntibiotics', APP_EVENTS.PROMOTED_ANTIBIOTICS_UPDATED, 'ABX')
export const staffVaccinationsRepository = simple('limoxisStaffVaccinations', APP_EVENTS.STAFF_VACCINATIONS_UPDATED, 'VAC')
export const handHygieneRepository = createCollectionRepository({
  storageKey: 'limoxisHandHygieneSessions',
  eventName: APP_EVENTS.HAND_HYGIENE_UPDATED,
  normalize: (record = {}) => ({ status: 'Ολοκληρωμένη', observations: [], ...record, id: record.id || `HH-${Date.now()}`, observations: Array.isArray(record.observations) ? record.observations : [] }),
})
