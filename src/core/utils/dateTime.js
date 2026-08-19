const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const GREEK_DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function currentTime() {
  return new Date().toTimeString().slice(0, 5)
}

export function normalizeDate(value) {
  if (!value) return ''
  const text = String(value).trim()
  if (ISO_DATE_RE.test(text)) return text
  if (GREEK_DATE_RE.test(text)) {
    const [day, month, year] = text.split('/')
    return `${year}-${month}-${day}`
  }
  return text
}

export function parseLocalDate(value) {
  const normalized = normalizeDate(value)
  if (!ISO_DATE_RE.test(normalized)) return null
  const date = new Date(`${normalized}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value, fallback = '—') {
  if (!value) return fallback
  const date = parseLocalDate(value)
  return date ? date.toLocaleDateString('el-GR',{day:'2-digit',month:'2-digit',year:'numeric'}) : String(value)
}

export function formatDateTime(date, time = '', fallback = '—') {
  const formatted = formatDate(date, fallback)
  return time ? `${formatted} · ${time}` : formatted
}

export function todayGreek() {
  return formatDate(todayIso(), '')
}

export function eventDateTimeKey(item = {}) {
  return `${normalizeDate(item.date)}T${item.time || '00:00'}`
}
