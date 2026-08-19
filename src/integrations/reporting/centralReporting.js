import { DATA_SCOPES } from '../../domain/canonical/clinicalModel'

/**
 * Boundary for data leaving the hospital node.
 *
 * This module deliberately does NOT pseudonymize personal identifiers itself.
 * A production deployment must inject an approved pseudonymization process.
 * The helper only builds a reporting envelope after the caller has supplied a
 * pseudonymous subject identifier and aggregate/reportable payload.
 */
export function createCentralReportingEnvelope({
  reportType,
  hospitalId,
  reportingPeriod,
  pseudonymousSubjectId = '',
  payload = {},
  generatedAt = new Date().toISOString(),
} = {}) {
  return {
    schemaVersion: '1.0',
    dataScope: DATA_SCOPES.CENTRAL_REPORTING,
    reportType: reportType || '',
    hospitalId: hospitalId || '',
    reportingPeriod: reportingPeriod || null,
    pseudonymousSubjectId: pseudonymousSubjectId || null,
    generatedAt,
    payload,
  }
}

export function assertNoDirectIdentifiers(envelope = {}) {
  const serialized = JSON.stringify(envelope).toLocaleLowerCase('en-US')
  const forbiddenKeys = ['fullname', 'firstname', 'lastname', 'fathername', 'amka', 'email', 'phone']
  const detected = forbiddenKeys.filter((key) => serialized.includes(`\"${key}\"`))
  if (detected.length) {
    throw new Error(`Central reporting payload contains direct identifiers: ${detected.join(', ')}`)
  }
  return envelope
}
