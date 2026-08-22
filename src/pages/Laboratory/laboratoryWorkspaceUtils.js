import { activeMasterItems } from '../../services/masterDataService'

export function preserveLaboratoryOwnedFields(payload = {}, original = null) {
  const baseline = original || {}
  return {
    ...payload,
    receivedDate: baseline.receivedDate || '',
    sampleAcceptance: baseline.sampleAcceptance || 'Εκκρεμεί',
    rejectionReason: baseline.rejectionReason || '',
    status: baseline.status || baseline.resultStatus || 'Εκκρεμεί',
    resultDate: baseline.resultDate || '',
    resultNotes: baseline.resultNotes || '',
    microorganism: baseline.microorganism || '',
    resistance: baseline.resistance || '',
    microorganismResults: normalizeMicroorganismRows(baseline),
    antibiogram: Array.isArray(baseline.antibiogram) ? baseline.antibiogram : [],
    validatedAt: baseline.validatedAt || '',
    validatedBy: baseline.validatedBy || '',
    criticalResult: Boolean(baseline.criticalResult),
    criticalCommunicatedTo: baseline.criticalCommunicatedTo || '',
    criticalCommunicatedAt: baseline.criticalCommunicatedAt || '',
    criticalCommunicatedBy: baseline.criticalCommunicatedBy || '',
  }
}

export function resolveLibraryName(libraryKey, value = '') {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const items = activeMasterItems(libraryKey)
  const exactName = items.find((item) => String(item?.name || '').trim() === raw)
  if (exactName) return exactName.name
  const byId = items.find((item) => String(item?.id || '').trim() === raw)
  if (byId) return byId.name
  const folded = raw.toLocaleLowerCase('el-GR')
  const insensitive = items.find((item) => String(item?.name || '').trim().toLocaleLowerCase('el-GR') === folded)
  return insensitive?.name || raw
}

export function normalizeAntibiogramRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((item, index) => {
    if (typeof item === 'string') {
      return { id: `legacy-abg-${index}`, antibiotic: resolveLibraryName('antibiotics', item), sensitivity: '', mic: '' }
    }
    const rawAntibiotic = item?.antibiotic || item?.antimicrobial || item?.name || item?.antibioticId || ''
    return { ...item, antibiotic: resolveLibraryName('antibiotics', rawAntibiotic) }
  })
}

export function normalizeForForm(record = {}) {
  return {
    ...emptyRecord,
    ...record,
    patientId: record.patientId || '',
    employeeId: record.employeeId || '',
    staffName: record.staffName || (record.sourceType === 'Προσωπικό' ? record.subjectName : '') || '',
    staffCode: record.staffCode || (record.sourceType === 'Προσωπικό' ? record.subjectCode : '') || '',
    subjectName: record.subjectName || record.patientName || record.staffName || record.samplingPoint || '',
    microorganismResults: normalizeMicroorganismRows(record),
    subjectCode: record.subjectCode || record.patientCode || record.staffCode || record.sampleCode || '',
    patientName: record.patientName || record.subjectName || '',
    patientCode: record.patientCode || record.subjectCode || '',
    status: withCanonicalLaboratoryStatus(record).status,
    collectionDate: toIso(record.collectionDate),
    receivedDate: toIso(record.receivedDate),
    resultDate: toIso(record.resultDate),
    admissionDate: toIso(record.admissionDate),
    antibiogram: normalizeAntibiogramRows(record.antibiogram),
  }
}

export function toIso(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const [day, month, year] = String(value).split('/')
  if (!year) return value
  return `${year}-${month}-${day}`
}

export function normalizeMicroorganismRows(record = {}) {
  const normalizeRow = (item, index) => {
    if (typeof item === 'string') return { id: `legacy-${index}`, name: resolveLibraryName('microorganisms', item), resistance: '' }
    const rawName = item?.name || item?.microorganism || item?.microorganismName || item?.microorganismId || ''
    const resolvedName = resolveLibraryName('microorganisms', rawName)
    return { ...item, name: resolvedName || String(rawName || '').trim() }
  }
  if (Array.isArray(record.microorganismResults) && record.microorganismResults.length) return record.microorganismResults.map(normalizeRow)
  if (Array.isArray(record.microorganisms) && record.microorganisms.length) return record.microorganisms.map(normalizeRow)
  if (record.microorganism) return [{ id: 'legacy-0', name: resolveLibraryName('microorganisms', record.microorganism), resistance: record.resistance || '' }]
  return []
}

export function todayIso() { return new Date().toISOString().slice(0, 10) }

export function sourcePrefix(sourceType) {
  if (sourceType === 'Προσωπικό') return 'STAFF'
  if (sourceType === 'Περιβάλλον') return 'ENV'
  if (sourceType === 'Νερό') return 'WATER'
  return 'PS'
}

export function createPatientCode(patients) {
  const used = new Set(patients.map((item) => item.patientCode).filter(Boolean))
  let number = Math.max(1, patients.length + 1)
  let code = `PAT-${String(number).padStart(6, '0')}`
  while (used.has(code)) {
    number += 1
    code = `PAT-${String(number).padStart(6, '0')}`
  }
  return code
}

export function normalizeName(value = '') { return String(value).trim().toLocaleLowerCase('el-GR') }

export function matchPatient(record, patients) {
  return patients.find((patient) =>
    (record.patientId && String(patient.id) === String(record.patientId)) ||
    (record.patientCode && patient.patientCode && String(patient.patientCode) === String(record.patientCode)) ||
    ((record.patientName || record.subjectName) && normalizeName(patient.fullName) === normalizeName(record.patientName || record.subjectName))
  ) || null
}

export function matchEmployee(record, employees) {
  return employees.find((employee) =>
    (record.employeeId && String(employee.id) === String(record.employeeId)) ||
    ((record.staffCode || record.subjectCode) && employee.employeeCode && String(employee.employeeCode) === String(record.staffCode || record.subjectCode)) ||
    ((record.staffName || record.subjectName) && normalizeName(employeeFullName(employee)) === normalizeName(record.staffName || record.subjectName))
  ) || null
}

export function createEmployeeCode(employees) {
  const used = new Set(employees.map((item) => item.employeeCode).filter(Boolean))
  let number = Math.max(1, employees.length + 1)
  let code = `EMP-${String(number).padStart(3, '0')}`
  while (used.has(code)) {
    number += 1
    code = `EMP-${String(number).padStart(3, '0')}`
  }
  return code
}
