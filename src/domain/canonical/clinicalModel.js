/**
 * Canonical clinical model used at integration/API boundaries.
 *
 * The UI may keep richer view-specific fields, but external adapters should
 * translate to/from these stable concepts instead of depending on page models.
 */

export const CANONICAL_ENTITY_TYPES = Object.freeze({
  PATIENT: 'patient',
  ENCOUNTER: 'encounter',
  SAMPLE: 'sample',
  LAB_RESULT: 'lab-result',
  INFECTION: 'infection',
  ISOLATION: 'isolation',
  DEPARTMENT: 'department',
})

export const DATA_SCOPES = Object.freeze({
  LOCAL_CLINICAL: 'local-clinical',
  CENTRAL_REPORTING: 'central-reporting',
})

function text(value) {
  return value == null ? '' : String(value).trim()
}

function valueOrNull(value) {
  return value === '' || value == null ? null : value
}

export function toCanonicalPatient(record = {}) {
  return {
    entityType: CANONICAL_ENTITY_TYPES.PATIENT,
    id: text(record.id),
    patientCode: text(record.patientCode),
    firstName: text(record.firstName),
    lastName: text(record.lastName),
    fullName: text(record.fullName),
    fatherName: text(record.fatherName),
    gender: text(record.gender),
    birthDate: valueOrNull(record.birthDate),
    age: valueOrNull(record.age),
    amka: text(record.amka),
    department: text(record.department),
    room: text(record.room),
    admissionDate: valueOrNull(record.admissionDate),
    admissionTime: valueOrNull(record.admissionTime),
    dischargeDate: valueOrNull(record.dischargeDate || record.exitDate),
    dischargeTime: valueOrNull(record.dischargeTime),
    status: text(record.status),
  }
}

export function toCanonicalEncounter(record = {}) {
  return {
    entityType: CANONICAL_ENTITY_TYPES.ENCOUNTER,
    id: text(record.encounterId || record.caseId || record.id),
    patientId: text(record.patientId),
    patientCode: text(record.patientCode),
    department: text(record.department),
    room: text(record.room),
    admissionDate: valueOrNull(record.admissionDate),
    dischargeDate: valueOrNull(record.dischargeDate || record.exitDate),
    status: text(record.status),
  }
}

export function toCanonicalSample(record = {}) {
  return {
    entityType: CANONICAL_ENTITY_TYPES.SAMPLE,
    id: text(record.id),
    patientId: text(record.patientId),
    patientCode: text(record.patientCode),
    sourceType: text(record.sourceType || 'Ασθενής'),
    sampleType: text(record.sampleType),
    collectionDate: valueOrNull(record.collectionDate),
    collectionTime: valueOrNull(record.collectionTime),
    receivedDate: valueOrNull(record.receivedDate),
    status: text(record.status || record.resultStatus),
    microorganism: text(record.microorganism),
    resistance: text(record.resistance),
    resultDate: valueOrNull(record.resultDate),
    department: text(record.department),
  }
}

export function toCanonicalInfection(record = {}) {
  return {
    entityType: CANONICAL_ENTITY_TYPES.INFECTION,
    id: text(record.id),
    patientId: text(record.patientId),
    patientCode: text(record.patientCode),
    infectionType: text(record.infectionType || record.type),
    onsetDate: valueOrNull(record.onsetDate || record.infectionDate),
    microorganism: text(record.microorganism),
    resistance: text(record.resistance),
    department: text(record.department),
    status: text(record.status),
  }
}

export function toCanonicalIsolation(record = {}) {
  return {
    entityType: CANONICAL_ENTITY_TYPES.ISOLATION,
    id: text(record.id),
    patientId: text(record.patientId),
    patientCode: text(record.patientCode),
    isolationType: text(record.isolationType),
    reason: text(record.reason || record.indication),
    department: text(record.department),
    startDate: valueOrNull(record.startDate),
    endDate: valueOrNull(record.endDate),
    status: text(record.status),
  }
}

export function canonicalizeEntity(entityType, record = {}) {
  switch (entityType) {
    case CANONICAL_ENTITY_TYPES.PATIENT: return toCanonicalPatient(record)
    case CANONICAL_ENTITY_TYPES.ENCOUNTER: return toCanonicalEncounter(record)
    case CANONICAL_ENTITY_TYPES.SAMPLE: return toCanonicalSample(record)
    case CANONICAL_ENTITY_TYPES.INFECTION: return toCanonicalInfection(record)
    case CANONICAL_ENTITY_TYPES.ISOLATION: return toCanonicalIsolation(record)
    default: return { entityType, ...record }
  }
}
