import { eventDateTimeKey, formatDate, formatDateTime, normalizeDate, todayIso } from '../../core/utils/dateTime'
import { normalizeValues } from '../../components/core/MultiSelect/MultiSelect'

export function getTherapies(data) {
  if (Array.isArray(data?.therapies)) return data.therapies.filter((item) => item?.antibiotic)
  if (data?.therapy?.antibiotic) return [{ id: data.therapy.id || 'legacy-therapy', ...data.therapy }]
  return []
}

export function normalizeOrganismResults(sample = {}) {
  if (Array.isArray(sample.microorganismResults) && sample.microorganismResults.length) return sample.microorganismResults.map((item, index) => typeof item === 'string' ? { id: `legacy-${index}`, name: item, resistance: sample.resistance || 'Χωρίς χαρακτηρισμό' } : { id: item.id || `org-${index}`, name: item.name || '', resistance: item.resistance || 'Χωρίς χαρακτηρισμό' }).filter((item) => item.name)
  const values = Array.isArray(sample.microorganisms) ? sample.microorganisms.filter(Boolean) : normalizeValues(sample.microorganism)
  return values.map((name, index) => ({ id: `legacy-${index}`, name, resistance: sample.resistance || 'Χωρίς χαρακτηρισμό' }))
}
export function sampleMicroorganismLabel(sample) { return normalizeOrganismResults(sample).map((item) => item.name).filter(Boolean).join(', ') }
export function highestResistance(values = []) { const rank = { PDR: 3, XDR: 2, MDR: 1 }; return values.filter((x) => rank[x]).sort((a,b) => rank[b]-rank[a])[0] || '' }
export function isRepeatSample(sample = {}) {
  return Boolean(sample.parentSampleId) || sample.category === 'Επανέλεγχος' || ['Επανέλεγχος ίασης','Έλεγχος υποτροπής / επαναλοίμωξης'].includes(sample.category)
}
export function buildSampleChainRows(samples = []) {
  const byId = new Map(samples.map((item) => [String(item.id), item]))
  const children = new Map()
  samples.forEach((item) => {
    const parentId = String(item.parentSampleId || '')
    if (!parentId || !byId.has(parentId)) return
    if (!children.has(parentId)) children.set(parentId, [])
    children.get(parentId).push(item)
  })
  const sortSamples = (rows) => [...rows].sort((a, b) => `${normalizeDate(a.collectionDate)}T${a.collectionTime || '00:00'}`.localeCompare(`${normalizeDate(b.collectionDate)}T${b.collectionTime || '00:00'}`))
  children.forEach((rows, key) => children.set(key, sortSamples(rows)))
  const roots = sortSamples(samples.filter((item) => !item.parentSampleId || !byId.has(String(item.parentSampleId))))
  const output = []
  function walk(item, depth, repeatNumber, rootId) {
    const chainMembers = samples.filter((x) => String(x.rootSampleId || x.id) === String(rootId))
    output.push({ sample: item, depth, repeatNumber, chainLength: chainMembers.length || 1 })
    ;(children.get(String(item.id)) || []).forEach((child, index) => walk(child, depth + 1, repeatNumber + index + 1, rootId))
  }
  roots.forEach((root) => walk(root, 0, 0, root.rootSampleId || root.id))
  return output
}
export function getSampleDescendants(samples = [], parentId) {
  const result = []
  function visit(id) {
    samples.filter((item) => String(item.parentSampleId || '') === String(id)).forEach((child) => { result.push(child); visit(child.id) })
  }
  visit(parentId)
  return result
}
export function deriveOverallResistance(items = []) { return highestResistance(items.map((item) => item.resistance)) }
export function sampleResistanceLabel(sample) {
  const rows = normalizeOrganismResults(sample).filter((item) => ['MDR','XDR','PDR'].includes(item.resistance))
  if (!rows.length) return ''
  return rows.map((item) => `${item.name}: ${item.resistance}`).join(' · ')
}
export function getDeviceRecords(data = {}) {
  if (Array.isArray(data.deviceRecords) && data.deviceRecords.length) return data.deviceRecords
  return normalizeValues(data.questionnaire?.devices).map((type, index) => ({ id: `legacy-device-${index}`, type, startDate: data.startDate || '', endDate: '', related: 'Όχι', notes: '' }))
}
export function getPatientSignals({ patient, samples, isolations }) {
  const resistance = highestResistance(samples.flatMap((item) => normalizeOrganismResults(item).map((org) => org.resistance))) || (patient.mdr ? 'MDR' : '')
  return { positive: samples.some((item) => item.status === 'Θετικό') || Boolean(patient.positiveCulture), resistance, isolation: isolations.some((item) => item.status === 'Ενεργή') || Boolean(patient.isolation), pending: samples.some((item) => item.status === 'Εκκρεμεί') }
}

export function today() { return todayIso() }
export { normalizeDate, formatDate, formatDateTime, eventDateTimeKey }
export function attachmentSectionLabel(step, language = 'el') {
  const el = { 'patient-records': 'Γενικά αρχεία ασθενούς', questionnaire: 'Κλινική αξιολόγηση', sample: 'Δείγμα', treatment: 'Αντιμικροβιακή αγωγή', isolation: 'Απομόνωση', review: 'Επανεκτίμηση' }
  const en = { 'patient-records': 'General patient files', questionnaire: 'Clinical assessment', sample: 'Sample', treatment: 'Antimicrobial therapy', isolation: 'Isolation', review: 'Reassessment' }
  return (language === 'en' ? en : el)[step] || (language === 'en' ? 'Other section' : 'Άλλη ενότητα')
}
export function formatFileSize(bytes) { if (!bytes) return ''; if (bytes < 1024) return `${bytes} B`; if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB` }


export function buildPatientSampleRows(samples = []) {
  const byCase = new Map()
  samples.forEach((sample) => {
    const key = String(sample.clinicalCaseId || 'no-case')
    if (!byCase.has(key)) byCase.set(key, [])
    byCase.get(key).push(sample)
  })
  const rows = []
  byCase.forEach((caseSamples) => rows.push(...buildSampleChainRows(caseSamples)))
  return rows.sort((a, b) => eventDateTimeKey({ date: a.sample.collectionDate, time: a.sample.collectionTime }).localeCompare(eventDateTimeKey({ date: b.sample.collectionDate, time: b.sample.collectionTime })))
}

