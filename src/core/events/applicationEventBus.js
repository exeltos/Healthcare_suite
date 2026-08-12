export const APP_EVENTS = Object.freeze({
  MASTER_DATA_UPDATED: 'limoxis:master-data-updated',
  PATIENT_REGISTRY_UPDATED: 'limoxis:patient-registry-updated',
  PATIENT_CONFIG_UPDATED: 'limoxis:patient-config-updated',
  PATIENT_SAMPLES_UPDATED: 'limoxis:patient-samples-updated',
  PATIENT_ATTACHMENTS_UPDATED: 'limoxis:patient-attachments-updated',
  INFECTIONS_UPDATED: 'limoxis:infections-updated',
  INFECTION_SAVED: 'limoxis:infection-saved',
  ISOLATIONS_UPDATED: 'limoxis:isolations-updated',
  ISOLATION_SAVED: 'limoxis:isolation-saved',
  EMPLOYEES_UPDATED: 'limoxis:employees-updated',
  STAFF_SAMPLES_UPDATED: 'limoxis:staff-samples-updated',
  HAND_HYGIENE_UPDATED: 'limoxis:hand-hygiene-updated',
  STAFF_VACCINATIONS_UPDATED: 'limoxis:staff-vaccinations-updated',
  ENVIRONMENTAL_SAMPLES_UPDATED: 'limoxis:environmental-samples-updated',
  WATER_RECORDS_UPDATED: 'limoxis:water-records-updated',
  ANTISEPTIC_CONSUMPTION_UPDATED: 'limoxis:antiseptic-consumption-updated',
  WASTE_MEASUREMENTS_UPDATED: 'limoxis:waste-measurements-updated',
  PREVENTION_AUDITS_UPDATED: 'limoxis:prevention-audits-updated',
  BUNDLES_UPDATED: 'limoxis:bundles-updated',
  PROMOTED_ANTIBIOTICS_UPDATED: 'limoxis:promoted-antibiotics-updated',
  NOTIFIABLE_DISEASES_UPDATED: 'limoxis:notifiable-diseases-updated',
  SURVEILLANCE_CASES_UPDATED: 'limoxis:surveillance-cases-updated',
  SURVEILLANCE_PROGRAMS_UPDATED: 'limoxis:surveillance-control-programs-updated',
  SURVEILLANCE_EXECUTIONS_UPDATED: 'limoxis:surveillance-control-executions-updated',
  FORM_TEMPLATES_UPDATED: 'limoxis:form-templates-updated',
  FORM_RESPONSES_UPDATED: 'limoxis:form-responses-updated',
  QUALITY_UPDATED: 'limoxis:quality-updated',
  QUALITY_AUDITS_UPDATED: 'limoxis:quality-audits-updated',
  INDICATORS_UPDATED: 'limoxis:indicators-updated',
  INDICATOR_SOURCE_UPDATED: 'limoxis:indicator-source-data-updated',
  ORGANIZATION_UPDATED: 'limoxis:organization-updated',
  NOTIFICATION_READ_CHANGED: 'limoxis:notifications:read-changed',
  DEMO_DATA_UPDATED: 'limoxis:demo-data-updated',
  NEW_ENTRY_CREATED: 'limoxis:new-entry',
  MASTER_STORAGE: 'storage',
})

const listeners = new Map()

function normalizeEvents(eventNames) {
  const values = Array.isArray(eventNames) ? eventNames : [eventNames]
  return [...new Set(values.filter(Boolean))]
}

function notifyLocal(eventName, detail) {
  const event = { type: eventName, detail }
  listeners.get(eventName)?.forEach((listener) => listener(event))
}

/** Publish a domain/application event through the canonical in-memory bus. */
export function emitAppEvent(eventName, detail) {
  if (!eventName) return
  notifyLocal(eventName, detail)
}

export function listenAppEvent(eventName, listener) {
  if (!eventName || typeof listener !== 'function') return () => {}
  const bucket = listeners.get(eventName) || new Set()
  bucket.add(listener)
  listeners.set(eventName, bucket)
  return () => {
    bucket.delete(listener)
    if (bucket.size === 0) listeners.delete(eventName)
  }
}

export function listenStorageEvent(listener) {
  if (typeof window === 'undefined' || typeof listener !== 'function') return () => {}
  window.addEventListener('storage', listener)
  return () => window.removeEventListener('storage', listener)
}

export function subscribeAppEvents(eventNames, listener, { includeStorage = false } = {}) {
  const cleanups = normalizeEvents(eventNames).map((eventName) => listenAppEvent(eventName, listener))
  if (includeStorage) cleanups.push(listenStorageEvent(listener))
  return () => cleanups.forEach((cleanup) => cleanup())
}

export function createAppEventScope() {
  const cleanups = new Set()
  return {
    subscribe(eventNames, listener, options) {
      const cleanup = subscribeAppEvents(eventNames, listener, options)
      cleanups.add(cleanup)
      return () => {
        cleanup()
        cleanups.delete(cleanup)
      }
    },
    dispose() {
      cleanups.forEach((cleanup) => cleanup())
      cleanups.clear()
    },
  }
}
