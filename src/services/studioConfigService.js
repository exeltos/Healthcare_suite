import { readStudioConfig, removeStudioConfig, writeStudioConfig } from '../repositories/studioConfigRepository'
import { studioModules } from './studioConfig.definitions'

export { studioModules }

function seedRows(moduleKey) {
  const config = studioModules[moduleKey]
  return config ? config.seeds.map((row) => ({ ...row })) : []
}

export function loadStudioRows(moduleKey) {
  if (!studioModules[moduleKey]) return []
  return readStudioConfig(moduleKey, seedRows(moduleKey))
}

export function saveStudioRows(moduleKey, rows) {
  return writeStudioConfig(moduleKey, rows)
}

export function resetStudioRows(moduleKey) {
  removeStudioConfig(moduleKey)
  return seedRows(moduleKey)
}

export async function hydrateStudioRows(){const {hydrateStudioBackend}=await import('./backend/configurationBackendService');return hydrateStudioBackend()}
export async function saveStudioRowsAsync(moduleKey,rows){const {saveStudioRowsBackend}=await import('./backend/configurationBackendService');return saveStudioRowsBackend(moduleKey,rows)}
