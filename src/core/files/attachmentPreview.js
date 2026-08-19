export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function previewAttachment(file) {
  const target = file?.previewUrl || file?.signedUrl || file?.url || file?.data || ''
  if (!target) return false
  const preview = window.open(target, '_blank', 'noopener,noreferrer')
  return Boolean(preview)
}
