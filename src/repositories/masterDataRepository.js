import { readJsonObject, writeJson } from '../core/storage'

export const MASTER_DATA_STORAGE_KEY = 'limoxisMasterData'

export function readMasterData() {
  return readJsonObject(MASTER_DATA_STORAGE_KEY, {})
}

export function writeMasterData(data) {
  return writeJson(MASTER_DATA_STORAGE_KEY, data && typeof data === 'object' ? data : {})
}
