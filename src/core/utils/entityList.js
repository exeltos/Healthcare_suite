export function normalizeText(value) {
  return String(value ?? '').trim().toLocaleLowerCase('el-GR')
}

export function searchableText(values) {
  return normalizeText(values.filter(Boolean).join(' '))
}

export function sortRows(rows, sort, { locale = 'el', numeric = true } = {}) {
  if (!sort?.key) return rows

  return [...rows].sort((leftRow, rightRow) => {
    const left = leftRow?.[sort.key] ?? ''
    const right = rightRow?.[sort.key] ?? ''
    const comparison = String(left).localeCompare(String(right), locale, {
      numeric,
      sensitivity: 'base',
    })
    return sort.direction === 'desc' ? -comparison : comparison
  })
}

export function selectedRows(rows, selectedKeys, getRowKey = (row) => row.id) {
  const keys = new Set(selectedKeys.map((key) => String(key)))
  return rows.filter((row) => keys.has(String(getRowKey(row))))
}

export function uniqueSortedValues(rows, getter) {
  return [...new Set(rows.map(getter).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), 'el', { numeric: true, sensitivity: 'base' }),
  )
}
