import { APP_EVENTS } from '../core/events'
import { IS_PRODUCTION } from '../core/runtime'
import {
  antisepticRepository,
  bundlesRepository,
  handHygieneRepository,
  preventionAuditsRepository,
  promotedAntibioticsRepository,
  staffVaccinationsRepository,
  wasteRepository,
} from '../repositories/preventionRepository'
import { loadAllEmployees, saveEmployees } from './employeesService'

export const ANTISEPTIC_CONSUMPTION_EVENT = APP_EVENTS.ANTISEPTIC_CONSUMPTION_UPDATED
export const WASTE_MEASUREMENTS_EVENT = APP_EVENTS.WASTE_MEASUREMENTS_UPDATED
export const PREVENTION_AUDITS_EVENT = APP_EVENTS.PREVENTION_AUDITS_UPDATED
export const BUNDLES_EVENT = APP_EVENTS.BUNDLES_UPDATED
export const PROMOTED_ANTIBIOTICS_EVENT = APP_EVENTS.PROMOTED_ANTIBIOTICS_UPDATED
export const STAFF_VACCINATIONS_EVENT = APP_EVENTS.STAFF_VACCINATIONS_UPDATED
export const HAND_HYGIENE_EVENT = APP_EVENTS.HAND_HYGIENE_UPDATED

export const loadAntisepticConsumption = antisepticRepository.findAll
export const saveAntisepticConsumption = antisepticRepository.replaceAll
export const upsertAntisepticConsumption = antisepticRepository.save
export const deleteAntisepticConsumption = antisepticRepository.remove

export const loadWasteMeasurements = wasteRepository.findAll
export const saveWasteMeasurements = wasteRepository.replaceAll
export const upsertWasteMeasurement = wasteRepository.save
export const deleteWasteMeasurement = wasteRepository.remove

export const loadPreventionAudits = preventionAuditsRepository.findAll
export const savePreventionAudits = preventionAuditsRepository.replaceAll
export const upsertPreventionAudit = preventionAuditsRepository.save
export const deletePreventionAudit = preventionAuditsRepository.remove

export const loadBundles = bundlesRepository.findAll
export const saveBundles = bundlesRepository.replaceAll
export const upsertBundle = bundlesRepository.save
export const deleteBundle = bundlesRepository.remove

export const loadHandHygieneSessions = handHygieneRepository.findAll
export const saveHandHygieneSessions = handHygieneRepository.replaceAll
export const upsertHandHygieneSession = handHygieneRepository.save
export const deleteHandHygieneSession = handHygieneRepository.remove

export const loadPromotedAntibiotics = promotedAntibioticsRepository.findAll
export const savePromotedAntibiotics = promotedAntibioticsRepository.replaceAll
export const upsertPromotedAntibiotic = promotedAntibioticsRepository.save
export const deletePromotedAntibiotic = promotedAntibioticsRepository.remove
export const promotedRecordIdForTherapy = (therapyId) => `PTX-${therapyId}`
export function syncPromotedTherapy({ therapy, patient, surveillanceCase }) {
  if (!therapy?.id) return null
  const id = promotedRecordIdForTherapy(therapy.id)
  if (!therapy.isPromoted) { deletePromotedAntibiotic(id); return null }
  return upsertPromotedAntibiotic({
    id, sourceType: 'patient-therapy', sourceId: therapy.id, caseId: surveillanceCase?.id || '', patientId: patient?.id || '',
    patientName: patient?.fullName || patient?.patientName || '', patientCode: patient?.patientCode || '',
    department: surveillanceCase?.department || patient?.department || '', date: therapy.startDate || '', antibiotic: therapy.antibiotic || '',
    dosage: therapy.dosage || '', frequency: therapy.frequency || '', route: therapy.route || '', indication: therapy.indication || '',
    approval: therapy.approval || 'Εκκρεμεί', doctor: therapy.approvalDoctor || '', approvalDate: therapy.approvalDate || '',
    notes: therapy.approvalNotes || therapy.antibiogramNotes || '',
  })
}

export async function syncPromotedTherapyAsync(args={}){
  const local=syncPromotedTherapy(args)
  const therapy=args?.therapy
  if(!therapy?.id)return local
  if(!IS_PRODUCTION)return local
  const {savePreventionRecord,deletePreventionRecord}=await import('./backend/preventionBackendService')
  const id=promotedRecordIdForTherapy(therapy.id)
  if(!therapy.isPromoted){await deletePreventionRecord('promoted_antibiotic',id);return null}
  return savePreventionRecord('promoted_antibiotic',local)
}
export async function deletePromotedAntibioticAsync(id){
  deletePromotedAntibiotic(id)
  if(!IS_PRODUCTION)return true
  const {deletePreventionRecord}=await import('./backend/preventionBackendService')
  return deletePreventionRecord('promoted_antibiotic',id)
}

export const loadStaffVaccinations = staffVaccinationsRepository.findAll
export const saveStaffVaccinations = staffVaccinationsRepository.replaceAll
export function upsertStaffVaccination(record = {}) {
  const vaccination = staffVaccinationsRepository.save(record)
  if (vaccination.employeeId) {
    saveEmployees(loadAllEmployees().map((employee) => employee.id === vaccination.employeeId ? {
      ...employee,
      vaccinations: [...(employee.vaccinations || []).filter((item) => item.sourceId !== vaccination.id), {
        id: `vac-${vaccination.id}`, sourceId: vaccination.id, vaccine: vaccination.vaccine, date: vaccination.date,
        dose: vaccination.dose, validUntil: vaccination.validUntil, notes: vaccination.notes || '',
      }],
    } : employee))
  }
  return vaccination
}
export function deleteStaffVaccination(id) {
  const next = staffVaccinationsRepository.remove(id)
  saveEmployees(loadAllEmployees().map((employee) => ({
    ...employee,
    vaccinations: (employee.vaccinations || []).filter((item) => item.sourceId !== id),
  })))
  return next
}
