import { readJsonArray, writeJson } from '../core/storage'
const KEYS=Object.freeze({surveillanceCases:'limoxis.surveillanceCases.v1',patientAttachments:'limoxis.patientAttachments.v1',notifiableDiseases:'limoxis.notifiableDiseases.v1'})
export const clinicalSupportRepository=Object.freeze({
  loadSurveillanceCases:()=>readJsonArray(KEYS.surveillanceCases,[]), saveSurveillanceCases:(rows=[])=>writeJson(KEYS.surveillanceCases,Array.isArray(rows)?rows:[]),
  loadPatientAttachments:()=>readJsonArray(KEYS.patientAttachments,[]), savePatientAttachments:(rows=[])=>writeJson(KEYS.patientAttachments,Array.isArray(rows)?rows:[]),
  loadNotifiableDiseases:(fallback=[])=>readJsonArray(KEYS.notifiableDiseases,fallback), saveNotifiableDiseases:(rows=[])=>writeJson(KEYS.notifiableDiseases,Array.isArray(rows)?rows:[]),
})
