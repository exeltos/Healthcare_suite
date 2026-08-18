import { saveClinicalPatient, saveClinicalPatientSample, saveClinicalInfection, saveClinicalSurveillanceCase } from './backend/clinicalDirectoryService'
import { saveClinicalSourceSample } from './backend/clinicalSupportBackendService'
import { savePreventionRecord } from './backend/preventionBackendService'
import { calculateEnvironmentStats, calculateWhoCompliance } from '../core/utils/observationMetrics'
import { hybridEntriesRepository } from '../repositories/hybridEntriesRepository'
import { IS_PRODUCTION } from '../core/runtime'

export async function persistNewEntry({
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
      return { ok: false, error: 'Συμπληρώστε ημερομηνία, τμήμα, παρατηρητή και τουλάχιστον μία ευκαιρία.' }
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
    patientData = await saveClinicalPatient({
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

  if (clinicalCaseData && (createNewCase || mode === 'new-patient') && patientData?.id) {
    clinicalCaseData = await saveClinicalSurveillanceCase({
      ...clinicalCaseData,
      patientId: patientData.id,
      patientKey: patientData.id,
      patientCode: patientData.patientCode || '',
      reason: entry.title || clinicalCaseData.reason || '',
      startDate: clinicalCaseData.admissionDate || entry.date,
    })
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
    await savePreventionRecord('hand_hygiene',{
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
    await saveClinicalInfection({
      patientId: patientData?.id || '', patientName, patientCode, department,
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
    await saveClinicalPatientSample({
      patientId: patientData?.id || '', patientName, patientCode, department,
      admissionDate: clinicalCaseData?.admissionDate || patientData?.admissionDate || '',
      sampleType: entry.title,
      sampleReason: selectedType.id === 'screening' ? 'Screening' : 'Καλλιέργεια',
      collectionDate: entry.date,
      status: entry.result || 'Εκκρεμεί',
      notes: entry.notes,
    })
  }

  if (selectedType.id === 'staff') {
    await saveClinicalSourceSample({
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
    for (const sample of environmentSamples) {
      await saveClinicalSourceSample({
        sourceType: 'Περιβάλλον',
        subjectName: sample.samplingPoint,
        samplingPoint: sample.samplingPoint,
        department: environmentSession.department,
        area: environmentSession.area,
        sampleType: sample.surfaceType,
        method: sample.method,
        collectionDate: environmentSession.date,
        status: 'Εκκρεμεί',
        microorganism: '',
        colonyCount: '',
        acceptable: '',
        collector: environmentSession.observer,
        notes: sample.notes,
      })
    }
  }

  if (selectedType.id === 'water') {
    await saveClinicalSourceSample({
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

  if (!IS_PRODUCTION) hybridEntriesRepository.save(payload)

  return { ok: true, payload, patientRegistryChanged }
}
