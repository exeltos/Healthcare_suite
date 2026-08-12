import { laboratoryStatus } from '../core/constants/laboratory'
import {
  deletePatientSample,
  loadPatientSamples,
  PATIENT_SAMPLES_EVENT,
} from './patientSamplesService'
import { savePatientSampleWithClinicalWorkflow } from './clinicalWorkflowService'
import {
  deleteStaffSample,
  loadStaffSamples,
  STAFF_SAMPLES_EVENT,
  upsertStaffSample,
} from './laboratorySourcesService'
import {
  deleteEnvironmentalSample,
  ENVIRONMENTAL_SAMPLES_EVENT,
  loadEnvironmentalSamples,
  upsertEnvironmentalSample,
} from './laboratorySourcesService'
import {
  deleteWaterRecord,
  loadWaterRecords,
  upsertWaterRecord,
  WATER_RECORDS_EVENT,
} from './laboratorySourcesService'

export const LABORATORY_SOURCE_EVENTS = [
  PATIENT_SAMPLES_EVENT,
  STAFF_SAMPLES_EVENT,
  ENVIRONMENTAL_SAMPLES_EVENT,
  WATER_RECORDS_EVENT,
]

function normalizePatient(record) {
  return {
    ...record,
    sourceType: 'Ασθενής',
    subjectName: record.patientName || '',
    subjectCode: record.patientCode || '',
    sampleType: record.sampleType || '',
    status: laboratoryStatus(record),
  }
}

function normalizeStaff(record) {
  return {
    ...record,
    sourceType: 'Προσωπικό',
    subjectName:
      record.staffName ||
      record.employeeName ||
      record.subjectName ||
      '',
    subjectCode:
      record.staffCode ||
      record.employeeCode ||
      record.subjectCode ||
      '',
    sampleType: record.sampleType || record.controlType || '',
    status: laboratoryStatus(record),
  }
}

function normalizeEnvironment(record) {
  return {
    ...record,
    sourceType: 'Περιβάλλον',
    subjectName:
      record.samplingPoint ||
      record.area ||
      record.subjectName ||
      '',
    subjectCode: record.sampleCode || record.subjectCode || '',
    sampleType:
      record.sampleType ||
      record.surfaceType ||
      'Περιβαλλοντικό δείγμα',
    status: laboratoryStatus(record),
  }
}

function normalizeWater(record) {
  return {
    ...record,
    sourceType: 'Νερό',
    subjectName:
      record.samplingPoint ||
      record.waterCategory ||
      record.subjectName ||
      '',
    subjectCode: record.sampleCode || record.subjectCode || '',
    sampleType:
      record.sampleType ||
      record.waterCategory ||
      'Δείγμα νερού',
    status: laboratoryStatus(record),
  }
}

export function loadAllLaboratoryRecords() {
  return [
    ...loadPatientSamples().map(normalizePatient),
    ...loadStaffSamples().map(normalizeStaff),
    ...loadEnvironmentalSamples().map(normalizeEnvironment),
    ...loadWaterRecords().map(normalizeWater),
  ]
}

export function upsertLaboratoryRecord(record) {
  if (record.sourceType === 'Προσωπικό') {
    return upsertStaffSample({
      ...record,
      status: laboratoryStatus(record),
      employeeId: record.employeeId || '',
      staffName: record.staffName || record.subjectName,
      staffCode: record.staffCode || record.subjectCode,
    })
  }

  if (record.sourceType === 'Περιβάλλον') {
    return upsertEnvironmentalSample({
      ...record,
      status: laboratoryStatus(record),
      samplingPoint: record.samplingPoint || record.subjectName,
      sampleCode: record.sampleCode || record.subjectCode,
    })
  }

  if (record.sourceType === 'Νερό') {
    return upsertWaterRecord({
      ...record,
      resultStatus: laboratoryStatus(record),
      samplingPoint: record.samplingPoint || record.subjectName,
      sampleCode: record.sampleCode || record.subjectCode,
    })
  }

  return savePatientSampleWithClinicalWorkflow({
    ...record,
    patientId: record.patientId || '',
    patientName: record.patientName || record.subjectName,
    patientCode: record.patientCode || record.subjectCode,
  }).sample
}

export function deleteLaboratoryRecord(record) {
  if (record.sourceType === 'Προσωπικό') {
    return deleteStaffSample(record.id)
  }

  if (record.sourceType === 'Περιβάλλον') {
    return deleteEnvironmentalSample(record.id)
  }

  if (record.sourceType === 'Νερό') {
    return deleteWaterRecord(record.id)
  }

  return deletePatientSample(record.id)
}
