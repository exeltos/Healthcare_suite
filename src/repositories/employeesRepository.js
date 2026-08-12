import { readJsonObject, writeJson } from '../core/storage'

export const EMPLOYEE_LIBRARY_KEY = 'employees-library'
const MASTER_STORAGE_KEY = 'limoxisMasterData'

export const employeesRepository = Object.freeze({
  loadMasterSnapshot() {
    return readJsonObject(MASTER_STORAGE_KEY, {})
  },
  replaceMasterSnapshot(masterData = {}) {
    return writeJson(MASTER_STORAGE_KEY, masterData && typeof masterData === 'object' ? masterData : {})
  },
  findStoredEmployees() {
    const masterData = this.loadMasterSnapshot()
    return Array.isArray(masterData[EMPLOYEE_LIBRARY_KEY]) ? masterData[EMPLOYEE_LIBRARY_KEY] : []
  },
  replaceStoredEmployees(records = [], masterData = null) {
    const source = masterData && typeof masterData === 'object' ? masterData : this.loadMasterSnapshot()
    const normalizedRecords = Array.isArray(records) ? records : []
    this.replaceMasterSnapshot({ ...source, [EMPLOYEE_LIBRARY_KEY]: normalizedRecords })
    return normalizedRecords
  },
})
