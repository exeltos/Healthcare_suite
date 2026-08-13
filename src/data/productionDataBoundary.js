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
}
