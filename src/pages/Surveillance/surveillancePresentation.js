const EN = {
  'Περιβάλλον': 'Environment',
  'Νερό': 'Water',
  'Ενεργό': 'Active',
  'Ανενεργό': 'Inactive',
  'Ολοκληρωμένο': 'Completed',
  'Εκκρεμεί': 'Pending',
  'Αρνητικό': 'Negative',
  'Θετικό': 'Positive',
  'Ναι': 'Yes',
  'Όχι': 'No',
}
export function surveillanceDisplayValue(value, language = 'el') {
  if (value == null || value === '') return value
  return language === 'en' ? (EN[String(value)] || value) : value
}

export function surveillanceProgramState(program, language = 'el') {
  if (!program.active) return { label: language === 'en' ? 'Inactive' : 'Ανενεργό', tone: 'neutral', key: 'inactive' }
  const due = program.nextDueDate ? new Date(`${program.nextDueDate}T12:00:00`) : null
  const today = new Date()
  today.setHours(12,0,0,0)
  if (!due || Number.isNaN(due.getTime())) return { label: language === 'en' ? 'No date' : 'Χωρίς ημερομηνία', tone: 'neutral', key: 'unscheduled' }
  const days = Math.ceil((due - today) / 86400000)
  if (days < 0) return { label: language === 'en' ? 'Overdue' : 'Εκπρόθεσμο', tone: 'danger', key: 'overdue' }
  if (days === 0) return { label: language === 'en' ? 'Today' : 'Σήμερα', tone: 'warning', key: 'today' }
  if (days <= Number(program.reminderDays || 0)) {
    return { label: language === 'en' ? `In ${days} day${days === 1 ? '' : 's'}` : `Σε ${days} ημέρ${days === 1 ? 'α' : 'ες'}`, tone: 'warning', key: 'due-soon' }
  }
  return { label: language === 'en' ? 'Scheduled' : 'Προγραμματισμένο', tone: 'success', key: 'scheduled' }
}

export function surveillanceRecurrenceLabel(program, language = 'el') {
  if (program.recurrence === 'once') return language === 'en' ? 'Once' : 'Μία φορά'
  const amount = Number(program.interval || 1)
  if (language === 'en') {
    const unit = { days: 'day', weeks: 'week', months: 'month', years: 'year' }[program.recurrence] || ''
    return `Every ${amount} ${unit}${amount === 1 ? '' : 's'}`
  }
  const unit = {
    days: amount === 1 ? 'ημέρα' : 'ημέρες',
    weeks: amount === 1 ? 'εβδομάδα' : 'εβδομάδες',
    months: amount === 1 ? 'μήνα' : 'μήνες',
    years: amount === 1 ? 'έτος' : 'έτη',
  }[program.recurrence]
  return `Κάθε ${amount} ${unit || ''}`
}
