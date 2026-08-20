import { APP_EVENTS, emitAppEvent } from '../core/events'
import { IS_PRODUCTION } from '../core/runtime'
import { readMasterData, writeMasterData } from '../repositories/masterDataRepository'
import { DEFAULT_MASTER_DATA } from './masterData.defaults'

export { DEFAULT_MASTER_DATA }
export const MASTER_DATA_EVENT = APP_EVENTS.MASTER_DATA_UPDATED


const DEPARTMENT_ALIASES = Object.freeze({
  'μοναδα εντατικης θεραπειας':'ΜΕΘ',
  'μεθ':'ΜΕΘ',
  'icu':'ΜΕΘ',
  'τμημα επειγοντων περιστατικων':'ΤΕΠ',
  'τεπ':'ΤΕΠ',
  'παθολογικη κλινικη':'Παθολογική',
  'παθολογικη':'Παθολογική',
  'παιδιατρικη κλινικη':'Παιδιατρική',
  'παιδιατρικη':'Παιδιατρική',
  'μοναδα τεχνητου νεφρου':'Αιμοκάθαρση',
  'μτν':'Αιμοκάθαρση',
  'αιμοκαθαρση':'Αιμοκάθαρση',
})
const PROFESSIONAL_ALIASES = Object.freeze({
  'νοσηλευτρια':'Νοσηλευτής / Νοσηλεύτρια',
  'νοσηλευτης':'Νοσηλευτής / Νοσηλεύτρια',
  'νοσηλευτης/τρια':'Νοσηλευτής / Νοσηλεύτρια',
  'νοσηλευτρια χειρουργειου':'Νοσηλευτής / Νοσηλεύτρια',
  'βοηθος νοσηλευτη':'Βοηθός Νοσηλευτή',
  'ιατρος':'Ιατρός',
  'τεχνολογος εργαστηριου':'Τεχνολόγος Εργαστηρίου',
})
function accentless(value=''){
  return String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('el-GR')
}
function normalizeCanonicalLibrary(rows=[], aliases={}){
  const seen=new Set()
  const next=[]
  for(const row of rows){
    const raw=typeof row==='string'?{name:row,status:'Ενεργό'}:{...row}
    const target=aliases[accentless(raw.name)]||raw.name
    const key=accentless(target)
    if(!key||seen.has(key))continue
    seen.add(key)
    next.push({...raw,name:target})
  }
  return next
}

function normalizedName(value) {
  return String(value || '').trim().toLocaleLowerCase('el-GR')
}

function mergeLibrary(defaultRows = [], savedRows) {
  if (!Array.isArray(savedRows)) return defaultRows.map((row) => ({ ...row }))
  const seen = new Set(savedRows.map((item) => normalizedName(item?.name)).filter(Boolean))
  return [
    ...savedRows,
    ...defaultRows.filter((item) => !seen.has(normalizedName(item.name))),
  ]
}

export function loadMasterData() {
  const saved = readMasterData()
  const merged = { ...DEFAULT_MASTER_DATA, ...saved }
  for (const [key, defaults] of Object.entries(DEFAULT_MASTER_DATA)) {
    // Departments are organization master data in Production and must never
    // be silently repopulated from demo/default values.
    if (key === 'departments' && IS_PRODUCTION) {
      merged[key] = Array.isArray(saved[key]) ? saved[key].map((row) => ({ ...row })) : []
      continue
    }
    merged[key] = mergeLibrary(defaults, saved[key])
  }
  merged.departments = normalizeCanonicalLibrary(merged.departments || [], DEPARTMENT_ALIASES)
  merged['professional-categories'] = normalizeCanonicalLibrary(merged['professional-categories'] || [], PROFESSIONAL_ALIASES)
  return merged
}

export function loadMasterDataWithFallback(fallback = {}) {
  return { ...fallback, ...readMasterData() }
}

export function saveMasterData(nextData) {
  const saved = writeMasterData(nextData)
  emitAppEvent(MASTER_DATA_EVENT, saved)
  return saved
}

export function upsertMasterItem(key, record = {}) {
  const data = loadMasterData()
  const items = Array.isArray(data[key]) ? data[key] : []
  const name = String(record.name || '').trim()
  if (!name) return null

  const matchIndex = items.findIndex((item) => normalizedName(item.name) === normalizedName(name))
  const nextItem = {
    status: 'Ενεργό',
    ...record,
    name,
    id: record.id || (matchIndex >= 0 ? items[matchIndex].id : `${key}-${Date.now()}`),
  }
  const nextItems = matchIndex >= 0
    ? items.map((item, index) => index === matchIndex ? { ...item, ...nextItem } : item)
    : [nextItem, ...items]

  saveMasterData({ ...data, [key]: nextItems })
  return nextItem
}

export function activeMasterItems(masterDataOrKey, keyOrCategory = '', category = '') {
  // Supports both activeMasterItems(masterData, key) and activeMasterItems(key, category).
  const usingExplicitData = masterDataOrKey && typeof masterDataOrKey === 'object' && !Array.isArray(masterDataOrKey)
  const data = usingExplicitData ? masterDataOrKey : loadMasterData()
  const key = usingExplicitData ? keyOrCategory : masterDataOrKey
  const filterCategory = usingExplicitData ? category : keyOrCategory
  const items = data?.[key] || []

  return items.filter((item) => {
    const categories = Array.isArray(item.categories) ? item.categories : []
    const categoryMatches = !filterCategory || item.category === filterCategory || categories.includes(filterCategory) || item.category === 'Κοινό'
    return item.status !== 'Ανενεργό' && categoryMatches
  })
}

export function masterNames(key, category = '') {
  return activeMasterItems(key, category).map((item) => item.name)
}

export async function hydrateMasterData(){const {hydrateMasterDataBackend}=await import('./backend/configurationBackendService');return hydrateMasterDataBackend()}
export async function saveMasterDataAsync(nextData){const {saveMasterDataBackend}=await import('./backend/configurationBackendService');return saveMasterDataBackend(nextData)}
export async function upsertMasterItemAsync(key,record={}){
 const data=loadMasterData();const items=Array.isArray(data[key])?data[key]:[];const name=String(record.name||'').trim();if(!name)return null
 const matchIndex=items.findIndex(item=>normalizedName(item.name)===normalizedName(name));const nextItem={status:'Ενεργό',...record,name,id:record.id||(matchIndex>=0?items[matchIndex].id:`${key}-${Date.now()}`)}
 const nextItems=matchIndex>=0?items.map((item,index)=>index===matchIndex?{...item,...nextItem}:item):[nextItem,...items]
 await saveMasterDataAsync({...data,[key]:nextItems});return nextItem
}
