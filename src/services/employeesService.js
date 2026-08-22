import { APP_EVENTS, emitAppEvent } from '../core/events'
import { IS_PRODUCTION } from '../core/runtime'
import { loadMasterData } from './masterDataService'
import { EMPLOYEE_LIBRARY_KEY, employeesRepository } from '../repositories/employeesRepository'

export const EMPLOYEES_EVENT = APP_EVENTS.EMPLOYEES_UPDATED

function normalizeDepartmentText(value=''){
  return String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el-GR')
}
function canonicalDepartmentName(value=''){
  const name=String(value||'').trim()
  if(!name)return''
  const departments=(loadMasterData().departments||[]).filter(item=>item.status!=='Ανενεργό')
  const exact=departments.find(item=>normalizeDepartmentText(item.name)===normalizeDepartmentText(name))
  if(exact)return exact.name
  const aliases={
    'μοναδα εντατικης θεραπειας':'ICU',
    'μεθ':'ICU',
    'icu':'ICU',
    'τμημα επειγοντων περιστατικων':'ED',
    'τεπ':'ED',
    'ed':'ED',
    'παθολογικη κλινικη':'PATH',
    'παθολογικη':'PATH',
    'παιδιατρικη κλινικη':'PED',
    'παιδιατρικη':'PED',
    'μοναδα τεχνητου νεφρου':'HD',
    'αιμοκαθαρση':'HD',
  }
  const code=aliases[normalizeDepartmentText(name)]
  const byCode=code?departments.find(item=>String(item.code||'').toUpperCase()===code):null
  return byCode?.name||name
}


function normalizeProfessionalText(value=''){
  return String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el-GR')
}
function canonicalProfessionalCategory(value=''){
  const name=String(value||'').trim()
  if(!name)return''
  const categories=(loadMasterData()['professional-categories']||[]).filter(item=>item.status!=='Ανενεργό')
  const exact=categories.find(item=>normalizeProfessionalText(item.name)===normalizeProfessionalText(name))
  if(exact)return exact.name
  const key=normalizeProfessionalText(name)
  const aliases={
    'νοσηλευτρια':'Νοσηλευτής / Νοσηλεύτρια',
    'νοσηλευτης':'Νοσηλευτής / Νοσηλεύτρια',
    'νοσηλευτης/τρια':'Νοσηλευτής / Νοσηλεύτρια',
    'νοσηλευτρια χειρουργειου':'Νοσηλευτής / Νοσηλεύτρια',
    'βοηθος νοσηλευτη':'Βοηθός Νοσηλευτή',
    'τεχνολογος εργαστηριου':'Τεχνολόγος Εργαστηρίου',
    'ιατρος':'Ιατρός',
  }
  const target=aliases[key]
  const byAlias=target?categories.find(item=>item.name===target):null
  return byAlias?.name||name
}

function splitLegacyName(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' }
  return { firstName: parts.slice(1).join(' '), lastName: parts[0] }
}

export function employeeFullName(record = {}) {
  return [record.lastName, record.firstName].filter(Boolean).join(' ').trim() || record.fullName || ''
}

export function normalizeEmployee(record = {}, index = 0) {
  const legacyName = splitLegacyName(record.fullName || record.name || record.employeeName || '')
  const { occupationalVisits: rawOccupationalVisits, ...clean } = record
  const firstName = clean.firstName || legacyName.firstName || ''
  const lastName = clean.lastName || legacyName.lastName || ''
  return {
    status: 'Ενεργό',
    vaccinations: [],
    occupationalVisits: [],
    fatherName: '',
    firstName,
    lastName,
    ...clean,
    id: clean.id || clean.employeeId || `EMP-MIG-${index + 1}`,
    firstName,
    lastName,
    fullName: [lastName, firstName].filter(Boolean).join(' ').trim(),
    employeeCode: clean.employeeCode || clean.code || '',
    professionalCategory: canonicalProfessionalCategory(clean.professionalCategory || clean.role || clean.position || ''),
    department: canonicalDepartmentName(clean.department || ''),
    vaccinations: Array.isArray(clean.vaccinations) ? clean.vaccinations : [],
    occupationalVisits: Array.isArray(rawOccupationalVisits) ? rawOccupationalVisits : [],
  }
}

function persistEmployees(masterData, records) {
  employeesRepository.replaceStoredEmployees(records, masterData)
}

export function loadAllEmployees() {
  const masterData = loadMasterData()
  const current = masterData[EMPLOYEE_LIBRARY_KEY]
  if (Array.isArray(current) && current.length) {
    const normalized = current.map(normalizeEmployee)
    const needsCleanup = current.some((item, index) => JSON.stringify(item) !== JSON.stringify(normalized[index]))
    // Production hydration/cache reads must stay side-effect free. Supabase is authoritative.
    // Legacy/demo cleanup is persisted only outside Production.
    if (needsCleanup && !IS_PRODUCTION) persistEmployees(masterData, normalized)
    return normalized
  }

  const legacyKeys = ['employees', 'staff', 'employeesList', 'employee-library']
  for (const legacyKey of legacyKeys) {
    const legacy = masterData[legacyKey]
    if (Array.isArray(legacy) && legacy.length) {
      const migrated = legacy.map(normalizeEmployee)
      // Never migrate legacy browser records during a Production read/render.
      if (!IS_PRODUCTION) persistEmployees(masterData, migrated)
      return migrated
    }
  }
  return []
}

export function loadEmployees() {
  return loadAllEmployees().filter((item) => item.status !== 'Ανενεργό')
}

export function saveEmployees(records = []) {
  const masterData = loadMasterData()
  const normalized = (Array.isArray(records) ? records : []).map(normalizeEmployee)
  persistEmployees(masterData, normalized)
  emitAppEvent(APP_EVENTS.MASTER_DATA_UPDATED, { ...masterData, [EMPLOYEE_LIBRARY_KEY]: normalized })
  emitAppEvent(EMPLOYEES_EVENT, normalized)
  return normalized
}

export function upsertEmployee(record = {}) {
  const all = loadAllEmployees()
  const normalized = normalizeEmployee({ ...record, id: record.id || `EMP-${Date.now()}` })
  const exists = all.some((item) => item.id === normalized.id)
  const next = exists ? all.map((item) => item.id === normalized.id ? normalized : item) : [normalized, ...all]
  saveEmployees(next)
  return normalized
}

export function deleteEmployee(recordId) {
  const next = loadAllEmployees().filter((item) => item.id !== recordId)
  saveEmployees(next)
  return next
}
