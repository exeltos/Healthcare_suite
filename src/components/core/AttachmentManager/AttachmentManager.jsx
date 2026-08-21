import { useRef, useState } from 'react'
import { Eye, FileText, LoaderCircle, Paperclip, Trash2, X } from 'lucide-react'
import { feedbackError, feedbackSuccess } from '../../../core/feedback'
import { confirmAction } from '../feedback/index'
import { useI18n } from '../../../i18n'
import Button from '../Button/Button'
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

function readFile(file, onProgress, errorLabel = 'Αποτυχία ανάγνωσης') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    reader.onload = () => resolve(makeAttachment(file, String(reader.result || '')))
    reader.onerror = () => reject(reader.error || new Error(`${errorLabel}: ${file.name}`))
    reader.readAsDataURL(file)
  })
}

export default function AttachmentManager({ value = [], onChange, hint, readOnly = false }) {
  const { language } = useI18n()
  const L = (el,en) => language === 'en' ? en : el
  const resolvedHint = hint || L('PDF, Word, Excel, εικόνες ή άλλο υλικό','PDF, Word, Excel, images or other material')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewFile, setPreviewFile] = useState(null)
  const inputRef = useRef(null)

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length || uploading || readOnly) return
    setUploading(true)
    setProgress(2)
    try {
      const additions = []
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const addition = await readFile(file, (fileProgress) => {
          setProgress(Math.round(((index + fileProgress / 100) / files.length) * 100))
        }, L('Αποτυχία ανάγνωσης','Read failed'))
        additions.push(addition)
      }
      onChange?.([...(value || []), ...additions])
      setProgress(100)
      feedbackSuccess(files.length === 1 ? `${L('Το αρχείο','File')} «${files[0].name}» ${L('προστέθηκε.','added.')}` : `${files.length} ${L('αρχεία προστέθηκαν.','files added.')}`, { title: L('Ανέβασμα ολοκληρώθηκε','Upload completed') })
    } catch (error) {
      feedbackError(error?.message || L('Δεν ήταν δυνατή η προσθήκη του αρχείου.','The file could not be added.'))
    } finally {
      window.setTimeout(() => {
        setUploading(false)
        setProgress(0)
      }, 250)
    }
  }

  const viewFile = (file) => {
    const source = file?.url || file?.data || ''
    if (!source) {
      feedbackError(L('Δεν υπάρχει διαθέσιμο περιεχόμενο για προβολή του αρχείου.','No file content is available for viewing.'))
      return
    }
    setPreviewFile({...file, previewSource: source})
  }

  return <div className={`attachment-manager ${uploading ? 'is-uploading' : ''}`}>
    <input ref={inputRef} type="file" multiple hidden disabled={uploading || readOnly} onChange={async (event) => { await addFiles(event.target.files); event.target.value = '' }} />
    {!readOnly && <button
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
      <span><strong>{uploading ? `${L('Ανέβασμα αρχείων…','Uploading files…')} ${progress}%` : L('Προσθήκη αρχείων','Add files')}</strong><small>{uploading ? L('Μην κλείσετε τη φόρμα μέχρι να ολοκληρωθεί.','Do not close the form until upload completes.') : resolvedHint}</small></span>
    </button>}
    {uploading && !readOnly && <div className="attachment-manager__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>}

    <div className="attachment-manager__list">
      {!value.length && <div className="attachment-manager__empty">{L('Δεν υπάρχουν συνημμένα.','No attachments.')}</div>}
      {value.map((file, index) => <article className="attachment-manager__item" key={file.id || `${file.name}-${index}`}>
        <FileText size={17} />
        <div><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></div>
        <div className="attachment-manager__actions">
          <button type="button" title={L('Προβολή','View')} disabled={!(file.url || file.data) || uploading} onClick={() => viewFile(file)}><Eye size={14} /></button>
          {!readOnly && <Button size="sm" variant="danger" type="button" title={L('Διαγραφή','Delete')} data-feedback-action="delete" disabled={uploading} onClick={() => { if (!confirmAction(`${L('Να διαγραφεί το αρχείο','Delete file')} «${file.name}»;`)) return; onChange?.(value.filter((_, itemIndex) => itemIndex !== index)) }}>{L('Διαγραφή','Delete')}</Button>}
        </div>
      </article>)}
    </div>
    {previewFile && <div className="attachment-preview" role="dialog" aria-modal="true" aria-label={L('Προβολή αρχείου','File preview')} onMouseDown={(event)=>{if(event.target===event.currentTarget)setPreviewFile(null)}}>
      <div className="attachment-preview__panel">
        <div className="attachment-preview__header">
          <div><strong>{previewFile.name||L('Αρχείο','File')}</strong><small>{formatBytes(previewFile.size||previewFile.size_bytes||0)}</small></div>
          <button type="button" className="attachment-preview__close" onClick={()=>setPreviewFile(null)} title={L('Κλείσιμο','Close')}><X size={18}/></button>
        </div>
        <div className="attachment-preview__body">
          {String(previewFile.type||previewFile.mimeType||'').startsWith('image/')
            ? <img src={previewFile.previewSource} alt={previewFile.name||''}/>
            : <iframe src={previewFile.previewSource} title={previewFile.name||L('Προβολή αρχείου','File preview')}/>}
        </div>
      </div>
    </div>}
  </div>
}
