/**
 * Stable integration contract for hospital/central-system adapters.
 *
 * A future adapter may speak REST, HL7/FHIR, a hospital vendor API, a message
 * bus, or a government gateway. The React application must not depend on that
 * vendor-specific implementation.
 */

export const INTEGRATION_CAPABILITIES = Object.freeze({
  PATIENTS: 'patients',
  ENCOUNTERS: 'encounters',
  LAB_RESULTS: 'lab-results',
  DEPARTMENTS: 'departments',
  CENTRAL_REPORTING: 'central-reporting',
})

export function createHospitalIntegrationAdapter(overrides = {}) {
  const notConfigured = async () => {
    throw new Error('Hospital integration adapter is not configured.')
  }

  return Object.freeze({
    name: overrides.name || 'unconfigured',
    capabilities: new Set(overrides.capabilities || []),
    pullPatients: overrides.pullPatients || notConfigured,
    pullEncounters: overrides.pullEncounters || notConfigured,
    pullLabResults: overrides.pullLabResults || notConfigured,
    pullDepartments: overrides.pullDepartments || notConfigured,
    pushCentralReport: overrides.pushCentralReport || notConfigured,
    healthCheck: overrides.healthCheck || (async () => ({ ok: false, adapter: overrides.name || 'unconfigured' })),
  })
}

export const unconfiguredHospitalIntegration = createHospitalIntegrationAdapter()
