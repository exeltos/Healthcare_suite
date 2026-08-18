import { APP_EVENTS } from '../core/events'
import { environmentalSamplesRepository, staffSamplesRepository, waterRecordsRepository } from '../repositories/laboratorySourcesRepository'

export const STAFF_SAMPLES_EVENT = APP_EVENTS.STAFF_SAMPLES_UPDATED
export const ENVIRONMENTAL_SAMPLES_EVENT = APP_EVENTS.ENVIRONMENTAL_SAMPLES_UPDATED
export const WATER_RECORDS_EVENT = APP_EVENTS.WATER_RECORDS_UPDATED

export const loadStaffSamples = staffSamplesRepository.findAll
export const saveStaffSamples = staffSamplesRepository.replaceAll
export const upsertStaffSample = staffSamplesRepository.save
export const deleteStaffSample = staffSamplesRepository.remove

export const loadEnvironmentalSamples = environmentalSamplesRepository.findAll
export const saveEnvironmentalSamples = environmentalSamplesRepository.replaceAll
export const upsertEnvironmentalSample = environmentalSamplesRepository.save
export const deleteEnvironmentalSample = environmentalSamplesRepository.remove

export const loadWaterRecords = waterRecordsRepository.findAll
export const saveWaterRecords = waterRecordsRepository.replaceAll
export const upsertWaterRecord = waterRecordsRepository.save
export const deleteWaterRecord = waterRecordsRepository.remove
