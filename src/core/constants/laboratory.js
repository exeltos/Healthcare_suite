export const LABORATORY_RESULT_STATUSES = ['Εκκρεμεί', 'Αρνητικό', 'Θετικό']
export const LABORATORY_RESISTANCE_OPTIONS = ['Χωρίς χαρακτηρισμό', 'MDR', 'XDR', 'PDR', 'CRE', 'MRSA', 'VRE', 'ESBL']
export const LABORATORY_RESISTANT_MARKERS = new Set(['MDR', 'XDR', 'PDR', 'CRE', 'MRSA', 'VRE', 'ESBL'])

export function laboratoryStatus(record = {}) {
  return record.status || record.resultStatus || 'Εκκρεμεί'
}

export function withCanonicalLaboratoryStatus(record = {}) {
  const status = laboratoryStatus(record)
  const { resultStatus: _legacyResultStatus, ...rest } = record
  return { ...rest, status }
}
