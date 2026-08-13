import { IS_PRODUCTION } from '../core/runtime'
import { patientCasesMock } from '../data/patientCasesMock'

/**
 * Patient-case source boundary. The launcher must not know whether cases come
 * from demo data, a local repository, HIS/ADT, or a future API.
 */
export function loadPatientCases(patientId) {
  if (IS_PRODUCTION) return []
  if (!patientId) return []
  const rows = patientCasesMock[String(patientId)] || patientCasesMock[patientId]
  return Array.isArray(rows) ? rows : []
}
