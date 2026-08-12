import { APP_EVENTS } from '../core/events'
import { createCollectionRepository } from '../repositories/createCollectionRepository'
import { upsertEnvironmentalSample } from './laboratorySourcesService'
import { upsertWaterRecord } from './laboratorySourcesService'

const PROGRAMS_KEY = 'limoxisSurveillanceControlPrograms'
const EXECUTIONS_KEY = 'limoxisSurveillanceControlExecutions'

export const SURVEILLANCE_PROGRAMS_EVENT = APP_EVENTS.SURVEILLANCE_PROGRAMS_UPDATED
export const SURVEILLANCE_EXECUTIONS_EVENT = APP_EVENTS.SURVEILLANCE_EXECUTIONS_UPDATED

const seedPrograms = [
  {
    id: 'CTRL-1001',
    title: 'Έλεγχος Legionella',
    category: 'Νερό',
    controlType: 'Legionella',
    department: 'ΜΕΘ',
    location: 'Δίκτυο ζεστού νερού',
    controlPoints: ['Ντους ΜΕΘ'],
    owner: 'ΝΕΛ',
    startDate: '2026-08-01',
    recurrence: 'months',
    interval: 6,
    reminderDays: 15,
    nextDueDate: '2026-08-12',
    active: true,
    notes: '',
  },
  {
    id: 'CTRL-1002',
    title: 'Μικροβιολογικός έλεγχος επιφανειών Χειρουργείου',
    category: 'Περιβάλλον',
    controlType: 'Επιφάνειες',
    department: 'Χειρουργείο',
    location: 'Χειρουργικές αίθουσες',
    controlPoints: ['Χειρουργική τράπεζα', 'Αναισθησιολογικό μηχάνημα'],
    owner: 'ΝΕΛ',
    startDate: '2026-08-01',
    recurrence: 'months',
    interval: 3,
    reminderDays: 10,
    nextDueDate: '2026-08-15',
    active: true,
    notes: '',
  },
]

function normalizeProgram(record = {}) {
  return {
    title: '',
    category: 'Περιβάλλον',
    controlType: '',
    department: '',
    location: '',
    controlPoints: [],
    owner: '',
    startDate: '',
    recurrence: 'months',
    interval: 1,
    reminderDays: 10,
    nextDueDate: '',
    active: true,
    notes: '',
    ...record,
    id: record.id || `CTRL-${Date.now()}`,
    interval: Math.max(1, Number(record.interval || 1)),
    reminderDays: Math.max(0, Number(record.reminderDays || 0)),
    controlPoints: Array.isArray(record.controlPoints) ? record.controlPoints.filter(Boolean) : [],
  }
}

function normalizeExecution(record = {}) {
  return {
    programId: '',
    category: 'Περιβάλλον',
    dueDate: '',
    performedDate: '',
    department: '',
    location: '',
    owner: '',
    status: 'Ολοκληρωμένο',
    notes: '',
    items: [],
    ...record,
    id: record.id || `EXEC-${Date.now()}`,
    items: Array.isArray(record.items) ? record.items : [],
  }
}

const programsStore = createCollectionRepository({
  storageKey: PROGRAMS_KEY,
  eventName: SURVEILLANCE_PROGRAMS_EVENT,
  normalize: normalizeProgram,
  seed: seedPrograms,
})

const executionsStore = createCollectionRepository({
  storageKey: EXECUTIONS_KEY,
  eventName: SURVEILLANCE_EXECUTIONS_EVENT,
  normalize: normalizeExecution,
})

export const loadControlPrograms = programsStore.findAll
export const saveControlPrograms = programsStore.replaceAll
export const upsertControlProgram = programsStore.save
export const deleteControlProgram = programsStore.remove

export const loadControlExecutions = executionsStore.findAll
export const saveControlExecutions = executionsStore.replaceAll

export function upsertControlExecution(record) {
  const normalized = executionsStore.save(record)
  syncExecutionToLaboratory(normalized)
  return normalized
}

export const deleteControlExecution = executionsStore.remove

export function addIntervalToDate(dateString, recurrence, interval = 1) {
  if (!dateString || recurrence === 'once') return ''
  const date = new Date(`${dateString}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  const amount = Math.max(1, Number(interval || 1))
  if (recurrence === 'days') date.setDate(date.getDate() + amount)
  if (recurrence === 'weeks') date.setDate(date.getDate() + amount * 7)
  if (recurrence === 'months') date.setMonth(date.getMonth() + amount)
  if (recurrence === 'years') date.setFullYear(date.getFullYear() + amount)
  return date.toISOString().slice(0, 10)
}

export function completeProgram(program, execution) {
  const savedExecution = upsertControlExecution({
    ...execution,
    programId: program.id,
    category: program.category,
    department: execution.department || program.department,
    location: execution.location || program.location,
    owner: execution.owner || program.owner,
    dueDate: execution.dueDate || program.nextDueDate,
  })

  const nextDueDate = addIntervalToDate(
    execution.performedDate || program.nextDueDate,
    program.recurrence,
    program.interval,
  )

  upsertControlProgram({
    ...program,
    lastCompletedDate: execution.performedDate,
    nextDueDate,
    active: program.recurrence === 'once' ? false : program.active,
  })

  return savedExecution
}

function syncExecutionToLaboratory(execution) {
  execution.items.forEach((item, index) => {
    if (!item.sampleCode && !item.microorganism && !item.resultStatus) return

    const base = {
      id: item.labRecordId || `${execution.category === 'Νερό' ? 'WATER' : 'ENV'}-${execution.id}-${index + 1}`,
      surveillanceExecutionId: execution.id,
      surveillanceProgramId: execution.programId,
      department: execution.department,
      samplingPoint: item.samplingPoint || execution.location,
      sampleCode: item.sampleCode || '',
      sampleType: item.sampleType || (execution.category === 'Νερό' ? 'Δείγμα νερού' : 'Περιβαλλοντικό δείγμα'),
      collectionDate: execution.performedDate,
      collector: execution.owner,
      microorganism: item.microorganism || '',
      resultNotes: item.resultNotes || '',
      notes: execution.notes || '',
    }

    if (execution.category === 'Νερό') {
      upsertWaterRecord({
        ...base,
        resultStatus: item.resultStatus || 'Εκκρεμεί',
        acceptable: item.acceptable || '',
        waterCategory: item.sampleType || 'Δείγμα νερού',
      })
    } else {
      upsertEnvironmentalSample({
        ...base,
        status: item.resultStatus || 'Εκκρεμεί',
        acceptable: item.acceptable || '',
      })
    }
  })
}
