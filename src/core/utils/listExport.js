function escapeCsv(value) {
  const text = String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export function downloadCsv({ filename, columns, rows }) {
  const header = columns.map((column) => escapeCsv(column.label)).join(';')
  const body = rows.map((row) => columns.map((column) => escapeCsv(column.value(row))).join(';')).join('\n')
  const blob = new Blob([`\uFEFF${header}\n${body}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function printRows({ title, columns, rows }) {
  const popup = window.open('', '_blank', 'width=1100,height=760')
  if (!popup) return false
  popup.opener = null

  const head = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')
  const body = rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(column.value(row))}</td>`).join('')}</tr>`).join('')

  popup.document.write(`<!doctype html><html lang="el"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    body{font-family:Arial,sans-serif;color:#152238;padding:28px}h1{font-size:22px;margin:0 0 8px}.meta{color:#64748b;margin-bottom:18px}table{width:100%;border-collapse:collapse}th,td{padding:9px 10px;border:1px solid #d9e2ec;text-align:left;font-size:12px}th{background:#f3f6f9} @media print{body{padding:0}}
  </style></head><body><h1>${escapeHtml(title)}</h1><div class="meta">${rows.length} εγγραφές</div><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`)
  popup.document.close()
  return true
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
