import { useRef, useState } from 'react'
import { Eye, FileText, LoaderCircle, Paperclip, Trash2 } from 'lucide-react'
import { feedbackError, feedbackSuccess } from '../../../core/feedback'
import { confirmAction } from '../feedback/index'
import './AttachmentManager.css'

function makeAttachment(file, data) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    size: file.size || 0,
    type: file.type || 'application/octet-stream',
    data,
    uploadedAt: new Date().toISOString(),
  }
}

function formatBytes(bytes = 0) {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

function readFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    reader.onload = () => resolve(makeAttachment(file, String(reader.result || '')))
    reader.onerror = () => reject(reader.error || new Error(`Αποτυχία ανάγνωσης: ${file.name}`))
    reader.readAsDataURL(file)
  })
}

export default function AttachmentManager({ value = [], onChange, hint = 'PDF, Word, Excel, εικόνες ή άλλο υλικό' }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef(null)

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length || uploading) return
    setUploading(true)
    setProgress(2)
    try {
      const additions = []
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const addition = await readFile(file, (fileProgress) => {
          setProgress(Math.round(((index + fileProgress / 100) / files.length) * 100))
        })
        additions.push(addition)
      }
      onChange?.([...(value || []), ...additions])
      setProgress(100)
      feedbackSuccess(files.length === 1 ? `Το αρχείο «${files[0].name}» προστέθηκε.` : `Προστέθηκαν ${files.length} αρχεία.`, { title: 'Ανέβασμα ολοκληρώθηκε' })
    } catch (error) {
      feedbackError(error?.message || 'Δεν ήταν δυνατή η προσθήκη του αρχείου.')
    } finally {
      window.setTimeout(() => {
        setUploading(false)
        setProgress(0)
      }, 250)
    }
  }

  const viewFile = (file) => {
    if (!file?.data) {
      feedbackError('Δεν υπάρχει διαθέσιμο περιεχόμενο για προβολή του αρχείου.')
      return
    }
    const preview = window.open('', '_blank', 'noopener,noreferrer')
    if (!preview) {
      feedbackError('Η προβολή αποκλείστηκε από τον browser. Επιτρέψτε τα αναδυόμενα παράθυρα για το Healthcare Suite.')
      return
    }
    preview.location.href = file.data
  }

  return <div className={`attachment-manager ${uploading ? 'is-uploading' : ''}`}>
    <input ref={inputRef} type="file" multiple hidden disabled={uploading} onChange={async (event) => { await addFiles(event.target.files); event.target.value = '' }} />
    <button
      type="button"
      className={`attachment-manager__dropzone ${dragging ? 'is-dragging' : ''}`}
      disabled={uploading}
      aria-busy={uploading || undefined}
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => { event.preventDefault(); if (!uploading) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={async (event) => { event.preventDefault(); setDragging(false); await addFiles(event.dataTransfer.files) }}
    >
      {uploading ? <LoaderCircle className="attachment-manager__spinner" size={18} /> : <Paperclip size={18} />}
      <span><strong>{uploading ? `Ανέβασμα αρχείων… ${progress}%` : 'Προσθήκη αρχείων'}</strong><small>{uploading ? 'Μην κλείσετε τη φόρμα μέχρι να ολοκληρωθεί.' : hint}</small></span>
    </button>
    {uploading && <div className="attachment-manager__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>}

    <div className="attachment-manager__list">
      {!value.length && <div className="attachment-manager__empty">Δεν υπάρχουν συνημμένα.</div>}
      {value.map((file, index) => <article className="attachment-manager__item" key={file.id || `${file.name}-${index}`}>
        <FileText size={17} />
        <div><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></div>
        <div className="attachment-manager__actions">
          <button type="button" title="Προβολή" disabled={!file.data || uploading} onClick={() => viewFile(file)}><Eye size={14} /></button>
          <button type="button" className="danger" title="Διαγραφή" data-feedback-action="delete" disabled={uploading} onClick={() => { if (!confirmAction(`Να διαγραφεί το αρχείο «${file.name}»;`)) return; onChange?.(value.filter((_, itemIndex) => itemIndex !== index)) }}><Trash2 size={14} /></button>
        </div>
      </article>)}
    </div>
  </div>
}
