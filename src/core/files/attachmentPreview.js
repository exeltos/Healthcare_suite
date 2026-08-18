export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function previewAttachment(file) {
  if (!file?.data) return false
  const preview = window.open('', '_blank', 'noopener,noreferrer')
  if (!preview) return false
  preview.location.href = file.data
  return true
}
