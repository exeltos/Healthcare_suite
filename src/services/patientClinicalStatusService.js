import { loadPatientSamples } from './patientSamplesService'

function samePatient(sample = {}, patient = {}) {
  if (sample.patientId && patient.id && String(sample.patientId) === String(patient.id)) return true
  if (sample.patientCode && patient.patientCode && String(sample.patientCode) === String(patient.patientCode)) return true
  return Boolean(sample.patientName && patient.fullName && String(sample.patientName).trim().toLocaleLowerCase('el-GR') === String(patient.fullName).trim().toLocaleLowerCase('el-GR'))
}

function dateKey(sample = {}) {
  return `${sample.collectionDate || ''}T${sample.collectionTime || '00:00'}|${sample.updatedAt || ''}|${sample.id || ''}`
}

export function patientLaboratorySnapshot(patient, allSamples = loadPatientSamples()) {
  const samples = allSamples.filter((sample) => samePatient(sample, patient)).sort((a, b) => dateKey(b).localeCompare(dateKey(a)))
  const latest = samples[0] || null
  if (!latest) {
    return { samples, latest: null, status: patient.positiveCulture ? 'Θετικό' : '', positive: Boolean(patient.positiveCulture), pending: false }
  }
  return {
    samples,
    latest,
    status: latest.status || 'Εκκρεμεί',
    positive: samples.some((sample) => sample.status === 'Θετικό'),
    pending: samples.some((sample) => sample.status === 'Εκκρεμεί'),
  }
}
