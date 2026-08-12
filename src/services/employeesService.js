import { APP_EVENTS, emitAppEvent } from '../core/events'
import { loadMasterData } from './masterDataService'
import { EMPLOYEE_LIBRARY_KEY, employeesRepository } from '../repositories/employeesRepository'

export const EMPLOYEES_EVENT = APP_EVENTS.EMPLOYEES_UPDATED

const DEFAULT_EMPLOYEES = [
  { id: 'EMP-001', employeeCode: 'EMP-001', firstName: 'Μαρία', lastName: 'Παπαδοπούλου', fatherName: 'Ανδρέας', department: 'ΜΕΘ', professionalCategory: 'Νοσηλεύτρια', email: 'm.papadopoulou@hospital.gr', phone: '2410555101', hireDate: '2018-03-12', status: 'Ενεργό', vaccinations: [{ id: 'vac-001', vaccine: 'Γρίπη', date: '2025-10-15', dose: 'Ετήσια' }] },
  { id: 'EMP-002', employeeCode: 'EMP-002', firstName: 'Νικόλαος', lastName: 'Γεωργίου', fatherName: 'Δημήτριος', department: 'Παθολογική', professionalCategory: 'Ιατρός', email: 'n.georgiou@hospital.gr', phone: '2410555102', hireDate: '2016-09-01', status: 'Ενεργό', vaccinations: [] },
  { id: 'EMP-003', employeeCode: 'EMP-003', firstName: 'Ελένη', lastName: 'Κωνσταντίνου', fatherName: 'Γεώργιος', department: 'Χειρουργική Κλινική', professionalCategory: 'Νοσηλεύτρια', email: 'e.konstantinou@hospital.gr', phone: '2410555103', hireDate: '2020-01-20', status: 'Ενεργό', vaccinations: [] },
  { id: 'EMP-004', employeeCode: 'EMP-004', firstName: 'Ανδρέας', lastName: 'Δημητρίου', fatherName: 'Ιωάννης', department: 'Μικροβιολογικό Εργαστήριο', professionalCategory: 'Τεχνολόγος Εργαστηρίου', email: 'a.dimitriou@hospital.gr', phone: '2410555104', hireDate: '2019-06-10', status: 'Ενεργό', vaccinations: [] },
  { id: 'EMP-005', employeeCode: 'EMP-005', firstName: 'Σοφία', lastName: 'Νικολάου', fatherName: 'Παναγιώτης', department: 'ΤΕΠ', professionalCategory: 'Νοσηλεύτρια', email: 's.nikolaou@hospital.gr', phone: '2410555105', hireDate: '2021-11-03', status: 'Ενεργό', vaccinations: [] },
  { id: 'EMP-006', employeeCode: 'EMP-006', firstName: 'Ιωάννης', lastName: 'Αντωνίου', fatherName: 'Νικόλαος', department: 'Αιμοκάθαρση', professionalCategory: 'Ιατρός', email: 'i.antoniou@hospital.gr', phone: '2410555106', hireDate: '2015-04-22', status: 'Ενεργό', vaccinations: [] },
  { id: 'EMP-007', employeeCode: 'EMP-007', firstName: 'Αναστασία', lastName: 'Μακρή', fatherName: 'Χρήστος', department: 'Παιδιατρική', professionalCategory: 'Νοσηλεύτρια', email: 'a.makri@hospital.gr', phone: '2410555107', hireDate: '2022-02-14', status: 'Ενεργό', vaccinations: [] },
  { id: 'EMP-008', employeeCode: 'EMP-008', firstName: 'Κωνσταντίνος', lastName: 'Λάμπρου', fatherName: 'Αθανάσιος', department: 'Αποστείρωση', professionalCategory: 'Βοηθός Νοσηλευτή', email: 'k.lamprou@hospital.gr', phone: '2410555108', hireDate: '2017-08-28', status: 'Ενεργό', vaccinations: [] },
  { id: 'EMP-009', employeeCode: 'EMP-009', firstName: 'Ευαγγελία', lastName: 'Οικονόμου', fatherName: 'Σπυρίδων', department: 'Χειρουργείο', professionalCategory: 'Νοσηλεύτρια Χειρουργείου', email: 'e.oikonomou@hospital.gr', phone: '2410555109', hireDate: '2014-12-01', status: 'Ενεργό', vaccinations: [] },
  { id: 'EMP-010', employeeCode: 'EMP-010', firstName: 'Παναγιώτης', lastName: 'Καραγιάννης', fatherName: 'Αλέξανδρος', department: 'Τεχνική Υπηρεσία', professionalCategory: 'Τεχνικός', email: 'p.karagiannis@hospital.gr', phone: '2410555110', hireDate: '2023-05-08', status: 'Ανενεργό', vaccinations: [] },
]


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
  const { occupationalVisits, ...clean } = record
  const firstName = clean.firstName || legacyName.firstName || ''
  const lastName = clean.lastName || legacyName.lastName || ''
  return {
    status: 'Ενεργό',
    vaccinations: [],
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
    if (needsCleanup) persistEmployees(masterData, normalized)
    return normalized
  }

  const legacyKeys = ['employees', 'staff', 'employeesList', 'employee-library']
  for (const legacyKey of legacyKeys) {
    const legacy = masterData[legacyKey]
    if (Array.isArray(legacy) && legacy.length) {
      const migrated = legacy.map(normalizeEmployee)
      persistEmployees(masterData, migrated)
      return migrated
    }
  }
  return DEFAULT_EMPLOYEES.map(normalizeEmployee)
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
