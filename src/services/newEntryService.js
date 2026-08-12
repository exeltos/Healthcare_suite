import { upsertPatient } from './patientService'
import { upsertPatientSample } from './patientSamplesService'
import { upsertInfection } from './infectionsService'
import { upsertStaffSample } from './laboratorySourcesService'
import { upsertEnvironmentalSample } from './laboratorySourcesService'
import { upsertWaterRecord } from './laboratorySourcesService'
import { upsertHandHygieneSession } from './preventionService'
import { calculateEnvironmentStats, calculateWhoCompliance } from '../core/utils/observationMetrics'
import { hybridEntriesRepository } from '../repositories/hybridEntriesRepository'

export function persistNewEntry({
  selectedType,
  mode,
  selectedPatient,
  availableCases,
  selectedCaseId,
  createNewCase,
  newPatient,
  entry,
  whoSession,
  whoObservations,
  environmentSession,
  environmentSamples,
}) {
  if (!selectedType) {
    return { ok: false, error: 'Δεν έχει επιλεγεί τύπος καταχώρησης.' }
  }

  if (selectedType.id === 'hand-hygiene') {
    if (!whoSession.date || !whoSession.department || !whoSession.observer || whoObservations.length === 0) {
      return { ok: false, error: 'Συμπληρώστε ημερομηνία, τμήμα, παρατηρητή και τουλάχιστον μία παρατήρηση.' }
    }
  } else if (selectedType.id === 'environment') {
    if (!environmentSession.date || !environmentSession.department || !environmentSession.observer || environmentSamples.length === 0) {
      return { ok: false, error: 'Συμπληρώστε ημερομηνία, τμήμα, υπεύθυνο και τουλάχιστον ένα δείγμα.' }
    }
  } else if (!entry.date || !entry.title) {
    return { ok: false, error: 'Συμπληρώστε ημερομηνία και τίτλο.' }
  }

  let patientData = null
  let clinicalCaseData = null
  let patientRegistryChanged = false

  if (mode === 'existing-patient') {
    patientData = selectedPatient
    clinicalCaseData = createNewCase
      ? {
          id: `CASE-${selectedPatient.id}-${Date.now()}`,
          admissionDate: entry.date,
          department: entry.department || selectedPatient.department,
          room: selectedPatient.room || '',
          status: 'Ενεργή νοσηλεία',
        }
      : availableCases.find((item) => item.id === selectedCaseId) || null
  }

  if (mode === 'new-patient') {
    patientData = upsertPatient({
      ...newPatient,
      id: `patient-${Date.now()}`,
      status: 'Νοσηλεύεται',
      positiveCulture: false,
      mdr: false,
      isolation: false,
    })
    patientRegistryChanged = true
    clinicalCaseData = {
      id: `CASE-${Date.now()}`,
      admissionDate: newPatient.admissionDate || entry.date,
      department: newPatient.department,
      room: newPatient.room,
      status: 'Ενεργή νοσηλεία',
      diagnosis: newPatient.primaryDiagnosis,
    }
  }

  const whoStats = calculateWhoCompliance(whoObservations)
  const environmentStats = calculateEnvironmentStats(environmentSamples)
  const payload = {
    id: `ENTRY-${Date.now()}`,
    entryType: selectedType,
    mode,
    patient: patientData,
    clinicalCase: clinicalCaseData,
    entry: selectedType.id === 'hand-hygiene'
      ? { type: 'WHO Hand Hygiene Observation', session: whoSession, observations: whoObservations, calculations: whoStats }
      : selectedType.id === 'environment'
        ? { type: 'Environmental Control', session: environmentSession, samples: environmentSamples, calculations: environmentStats }
        : entry,
    createdAt: new Date().toISOString(),
  }

  const patientName = patientData?.fullName || entry.title || ''
  const patientCode = patientData?.patientCode || ''
  const department = entry.department || patientData?.department || clinicalCaseData?.department || ''

  if (selectedType.id === 'hand-hygiene') {
    upsertHandHygieneSession({
      id: `WHO-${Date.now()}`,
      facility: whoSession.facility,
      ward: whoSession.ward,
      department: whoSession.department,
      date: whoSession.date,
      observer: whoSession.observer,
      startTime: whoSession.startTime,
      endTime: whoSession.endTime,
      observations: whoObservations,
      calculations: whoStats,
      createdAt: new Date().toISOString(),
    })
  }

  if (selectedType.id === 'infection') {
    upsertInfection({
      patientName, patientCode, department,
      admissionDate: clinicalCaseData?.admissionDate || patientData?.admissionDate || '',
      infectionDate: entry.date,
      onsetDate: entry.date,
      infectionType: entry.title,
      status: 'Υπό διερεύνηση',
      origin: 'Υπό διερεύνηση',
      notes: entry.notes,
    })
  }

  if (selectedType.id === 'culture' || selectedType.id === 'screening') {
    upsertPatientSample({
      patientName, patientCode, department,
      admissionDate: clinicalCaseData?.admissionDate || patientData?.admissionDate || '',
      sampleType: entry.title,
      sampleReason: selectedType.id === 'screening' ? 'Screening' : 'Καλλιέργεια',
      collectionDate: entry.date,
      status: entry.result || 'Εκκρεμεί',
      notes: entry.notes,
    })
  }

  if (selectedType.id === 'staff') {
    upsertStaffSample({
      sourceType: 'Προσωπικό',
      staffName: entry.title,
      subjectName: entry.title,
      department,
      sampleType: entry.result || 'Screening προσωπικού',
      collectionDate: entry.date,
      status: 'Εκκρεμεί',
      notes: entry.notes,
    })
  }

  if (selectedType.id === 'environment') {
    environmentSamples.forEach((sample) => {
      upsertEnvironmentalSample({
        sourceType: 'Περιβάλλον',
        subjectName: sample.samplingPoint,
        samplingPoint: sample.samplingPoint,
        department: environmentSession.department,
        area: environmentSession.area,
        sampleType: sample.surfaceType,
        method: sample.method,
        collectionDate: environmentSession.date,
        status: sample.resultStatus,
        microorganism: sample.microorganism,
        colonyCount: sample.cfu,
        acceptable: sample.acceptable,
        collector: environmentSession.observer,
        notes: sample.notes,
      })
    })
  }

  if (selectedType.id === 'water') {
    upsertWaterRecord({
      sourceType: 'Νερό',
      samplingPoint: entry.title,
      subjectName: entry.title,
      department,
      waterCategory: entry.result || 'Δείγμα νερού',
      sampleType: entry.result || 'Δείγμα νερού',
      collectionDate: entry.date,
      resultStatus: 'Εκκρεμεί',
      status: 'Εκκρεμεί',
      notes: entry.notes,
    })
  }

  hybridEntriesRepository.save(payload)

  return { ok: true, payload, patientRegistryChanged }
}
