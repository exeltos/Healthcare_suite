import { unconfiguredHospitalIntegration } from './contracts/hospitalIntegration'
import { assertNoDirectIdentifiers, createCentralReportingEnvelope } from './reporting/centralReporting'

let activeHospitalAdapter = unconfiguredHospitalIntegration

export function configureHospitalIntegration(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError('A valid hospital integration adapter is required.')
  }
  activeHospitalAdapter = adapter
  return activeHospitalAdapter
}

export function resetHospitalIntegration() {
  activeHospitalAdapter = unconfiguredHospitalIntegration
}

export const hospitalIntegrationGateway = Object.freeze({
  get name() { return activeHospitalAdapter.name },
  supports(capability) { return activeHospitalAdapter.capabilities?.has(capability) === true },
  healthCheck: (...args) => activeHospitalAdapter.healthCheck(...args),
  pullPatients: (...args) => activeHospitalAdapter.pullPatients(...args),
  pullEncounters: (...args) => activeHospitalAdapter.pullEncounters(...args),
  pullLabResults: (...args) => activeHospitalAdapter.pullLabResults(...args),
  pullDepartments: (...args) => activeHospitalAdapter.pullDepartments(...args),
  pushCentralReport: (...args) => activeHospitalAdapter.pushCentralReport(...args),
  createCentralReport(input) {
    return assertNoDirectIdentifiers(createCentralReportingEnvelope(input))
  },
})
