import { loadPatientRegistry } from '../../services/patientService'
import { loadPatientSamples } from '../../services/patientSamplesService'
import { loadAllLaboratoryRecords } from '../../services/laboratoryService'
import { loadInfections } from '../../services/infectionsService'
import { loadIsolations } from '../../services/isolationsService'
import { loadIndicatorsSnapshot } from '../../services/indicatorsService'
import {
  toCanonicalInfection,
  toCanonicalIsolation,
  toCanonicalPatient,
  toCanonicalSample,
} from '../../domain/canonical/clinicalModel'

/**
 * Compatibility adapter for the current local/demo persistence.
 * Replacing this adapter with an HTTP adapter later keeps UI consumers stable.
 */
export const localApiAdapter = Object.freeze({
  patients: Object.freeze({
    list: () => loadPatientRegistry(),
    listCanonical: () => loadPatientRegistry().map(toCanonicalPatient),
  }),
  samples: Object.freeze({
    list: () => loadPatientSamples(),
    listCanonical: () => loadPatientSamples().map(toCanonicalSample),
  }),
  laboratory: Object.freeze({
    list: () => loadAllLaboratoryRecords(),
  }),
  infections: Object.freeze({
    list: () => loadInfections(),
    listCanonical: () => loadInfections().map(toCanonicalInfection),
  }),
  isolations: Object.freeze({
    list: () => loadIsolations(),
    listCanonical: () => loadIsolations().map(toCanonicalIsolation),
  }),
  indicators: Object.freeze({
    snapshot: () => loadIndicatorsSnapshot(),
  }),
})
