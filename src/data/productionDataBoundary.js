import { removeStoredValue, withProductionCacheWrite } from '../core/storage'
import { readMasterData, writeMasterData } from '../repositories/masterDataRepository'
import { savePatientRegistry } from '../services/patientService'
import { saveEmployees } from '../services/employeesService'
import { savePatientSamples } from '../services/patientSamplesService'
import { replaceSurveillanceCases } from '../services/surveillanceCasesService'
import { replaceIsolations } from '../services/isolationsService'
import { replaceInfections } from '../services/infectionsService'
import { saveHandHygieneSessions, saveStaffVaccinations, saveAntisepticConsumption, saveWasteMeasurements, savePromotedAntibiotics } from '../services/preventionService'
import { saveNotifiableDiseases } from '../services/notifiableDiseasesService'
import { saveControlPrograms, saveControlExecutions } from '../services/surveillanceControlsService'
import { saveDailyCensus, saveAntibioticDDD, saveStructuralSnapshots, savePrevalenceSnapshots } from '../services/indicatorSourceDataService'
import { saveIncidents, saveCapa, saveAuditExecutions } from '../services/qualityService'
import { replaceTrainingCollection, replaceCommitteesCollection, replaceDocumentsCollection } from '../services/organizationService'

export function clearProductionLocalOperationalCache(){
  return withProductionCacheWrite(()=>{
  // Keep reference/master libraries, but never retain operational patients in
  // the historical patients-library compatibility bucket.
  const masterData = readMasterData()
  if (Array.isArray(masterData['patients-library']) && masterData['patients-library'].length) {
    const { ['patients-library']: _operationalPatients, ...referenceLibraries } = masterData
    writeMasterData(referenceLibraries)
  }
  // Purge legacy/demo compatibility keys before Production hydration.
  removeStoredValue('limoxisDemoDatasetSummary')
  removeStoredValue('employees')
  removeStoredValue('staff')
  removeStoredValue('employeesList')
  removeStoredValue('employee-library')
  removeStoredValue('limoxisStaffSamples')
  removeStoredValue('limoxisEnvironmentalSamples')
  removeStoredValue('limoxisWaterRecords')
  removeStoredValue('limoxisTraining')
  removeStoredValue('limoxisCommittees')
  removeStoredValue('limoxisDocuments')
  savePatientRegistry([])
  saveEmployees([])
  savePatientSamples([])
  replaceSurveillanceCases([])
  replaceIsolations([])
  replaceInfections([])
  saveHandHygieneSessions([])
  saveStaffVaccinations([])
  saveAntisepticConsumption([])
  saveWasteMeasurements([])
  savePromotedAntibiotics([])
  saveNotifiableDiseases([])
  saveControlPrograms([])
  saveControlExecutions([])
  saveDailyCensus([])
  saveAntibioticDDD([])
  saveStructuralSnapshots([])
  savePrevalenceSnapshots([])
  saveIncidents([])
  saveCapa([])
  saveAuditExecutions([])
  replaceTrainingCollection([])
  replaceCommitteesCollection([])
  replaceDocumentsCollection([])
  })
}
