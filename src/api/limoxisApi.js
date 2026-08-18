import { localApiAdapter } from './adapters/localApiAdapter'
import { hospitalIntegrationGateway } from '../integrations'

let activeAdapter = localApiAdapter

/**
 * Frontend API boundary.
 *
 * Today it delegates to the local compatibility adapter. A future deployment
 * can register an HTTP/central-government adapter without pages importing
 * storage repositories or demo datasets directly.
 */
export function configureLimoxisApiAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError('A valid Limoxis API adapter is required.')
  }
  activeAdapter = adapter
}

export function resetLimoxisApiAdapter() {
  activeAdapter = localApiAdapter
}

export const limoxisApi = Object.freeze({
  patients: Object.freeze({
    list: () => activeAdapter.patients.list(),
    listCanonical: () => activeAdapter.patients.listCanonical?.() ?? [],
  }),
  samples: Object.freeze({
    list: () => activeAdapter.samples.list(),
    listCanonical: () => activeAdapter.samples.listCanonical?.() ?? [],
  }),
  laboratory: Object.freeze({
    list: () => activeAdapter.laboratory?.list?.() ?? activeAdapter.samples.list(),
  }),
  infections: Object.freeze({
    list: () => activeAdapter.infections.list(),
    listCanonical: () => activeAdapter.infections.listCanonical?.() ?? [],
  }),
  isolations: Object.freeze({
    list: () => activeAdapter.isolations.list(),
    listCanonical: () => activeAdapter.isolations.listCanonical?.() ?? [],
  }),
  indicators: Object.freeze({
    snapshot: () => activeAdapter.indicators.snapshot(),
  }),
  integration: hospitalIntegrationGateway,
  dashboard: Object.freeze({
    snapshot: () => ({
      patients: activeAdapter.patients.list(),
      samples: activeAdapter.laboratory?.list?.() ?? activeAdapter.samples.list(),
      infections: activeAdapter.infections.list(),
      isolations: activeAdapter.isolations.list(),
      indicators: activeAdapter.indicators.snapshot(),
    }),
  }),
})
