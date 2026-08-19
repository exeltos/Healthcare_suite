import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n'
import { notifyAction } from '../../components/core/feedback/index'
import { previewAttachment } from '../../core/files/attachmentPreview'
import { ChevronRight, Eye, FileText, Paperclip, Plus, RefreshCcw, Trash2, X } from 'lucide-react'
import Button from '../../components/core/Button/Button'
import Badge from '../../components/core/Badge/Badge'
import LibraryField from '../../components/core/LibraryField/LibraryField'
import { RESISTANCE_OPTIONS } from '../../core/constants/clinicalOptions'
import { masterNames } from '../../services/masterDataService'
import { attachmentSectionLabel, deriveOverallResistance, formatDate, formatFileSize, isRepeatSample, normalizeOrganismResults } from './patientWorkflowUtils'
import { patientDisplayValue } from './patientPresentation'

export function SampleEditor({ form, setForm, samples, save, cancel, files, upload, deleteAttachment, startRecheck }) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const organisms = normalizeOrganismResults(form)
  const repeat = isRepeatSample(form)
  const parent = samples.find((item) => String(item.id) === String(form.parentSampleId))
  const independentCategories = masterNames('sample-categories').filter((item) => item !== 'Επανέλεγχος')
  const saved = Boolean(form.id)
  const laboratoryReadOnly = true
  function setOrganisms(next) {
    setForm((current) => ({ ...current, microorganismResults: next, microorganisms: next.map((item) => item.name).filter(Boolean), microorganism: next.map((item) => item.name).filter(Boolean).join(', '), resistance: deriveOverallResistance(next) }))
  }
  function addOrganism() { setOrganisms([...organisms, { id: `ORG-${Date.now()}`, name: '', resistance: 'Χωρίς χαρακτηρισμό' }]) }
  function patchOrganism(index, patch) { setOrganisms(organisms.map((item, i) => i === index ? { ...item, ...patch } : item)) }
  function removeOrganism(index) { setOrganisms(organisms.filter((_, i) => i !== index)) }
  function changeMode(value) {
    if (value === 'Επανέλεγχος') {
      // An existing laboratory result is immutable as the source of a recheck.
      // Choosing "Επανέλεγχος" while viewing it creates a NEW pending sample
      // already linked to this sample instead of converting/overwriting the old record.
      if (form.id && !repeat && startRecheck) {
        startRecheck(form)
        return
      }
      setForm((x) => ({ ...x, category: 'Επανέλεγχος', repeatPurpose: x.repeatPurpose || 'Έλεγχος αρνητικοποίησης', status: 'Εκκρεμεί', resultDate: '', resultNotes: '', microorganisms: [], microorganismResults: [], microorganism: '', resistance: '', antibiogram: [] }))
    } else {
      setForm((x) => ({ ...x, category: value, parentSampleId: '', rootSampleId: '', repeatPurpose: '', repeatIndex: 0, monitoringFor: [] }))
    }
  }
  function changeParent(value) {
    const nextParent = samples.find((item) => String(item.id) === String(value))
    const rootId = nextParent ? (nextParent.rootSampleId || nextParent.id) : ''
    const chain = nextParent ? samples.filter((item) => String(item.rootSampleId || item.id) === String(rootId)) : []
    setForm((x) => ({ ...x, parentSampleId: value, rootSampleId: rootId, repeatIndex: nextParent ? Math.max(1, chain.length) : 0, sampleType: nextParent?.sampleType || x.sampleType, monitoringFor: nextParent ? normalizeOrganismResults(nextParent).map((item) => item.name).filter(Boolean) : [] }))
  }
  return <form className="pw-editor" onSubmit={save}><div className="pw-editor-head"><h3>{form.id ? L('Στοιχεία δείγματος', 'Sample details') : (repeat ? L('Νέος επανέλεγχος', 'New follow-up') : L('Νέο δείγμα', 'New sample'))}</h3></div>
  {repeat && <div className="pw-repeat-context"><RefreshCcw size={17} /><div><b>{L('Επανέλεγχος στην ίδια επιτήρηση', 'Follow-up in the same surveillance case')}</b><span>{parent ? `${patientDisplayValue(parent.sampleType, language)} · ${formatDate(parent.collectionDate)} · ${patientDisplayValue(parent.status, language)}` : L('Επιλέξτε το προηγούμενο δείγμα που επανελέγχεται.', 'Select the previous sample being followed up.')}{form.monitoringFor?.length ? language === 'en' ? ` · Monitoring: ${form.monitoringFor.join(', ')}` : ` · Παρακολούθηση: ${form.monitoringFor.join(', ')}` : ''}</span></div></div>}
  <div className="pw-form-grid compact">
    <Field label={L("Τύπος καταγραφής", "Record type")}><Select disabled={saved} value={repeat ? 'Επανέλεγχος' : (form.category || 'Αρχικό / νέο ανεξάρτητο δείγμα')} onChange={changeMode}>{independentCategories.map((x) => <option key={x} value={x}>{patientDisplayValue(x, language)}</option>)}<option value="Επανέλεγχος">{L("Επανέλεγχος", "Follow-up")}</option></Select></Field>
    {repeat && <Field label={L("Σκοπός επανελέγχου", "Follow-up purpose")}><Select disabled={saved} value={form.repeatPurpose} onChange={(v) => setForm((x) => ({ ...x, repeatPurpose: v }))}>{masterNames('sample-repeat-purposes').map((x) => <option key={x} value={x}>{patientDisplayValue(x, language)}</option>)}</Select></Field>}
    {repeat && <Field label={L("Προηγούμενο δείγμα", "Previous sample")}><Select disabled={saved} value={form.parentSampleId} onChange={changeParent}><option value="">{L("Επιλογή", "Select")}</option>{samples.filter((x) => x.id !== form.id).map((x) => <option key={x.id} value={x.id}>{patientDisplayValue(x.sampleType, language)} · {formatDate(x.collectionDate)} · {patientDisplayValue(x.status, language)}</option>)}</Select></Field>}
    <Field label={L("Τύπος δείγματος", "Sample type")}><LibraryField disabled={saved} hideLabel libraryKey="sample-types" category="Ασθενής" value={form.sampleType} allowManual placeholder={L("Επιλογή", "Select")} getOptionLabel={(item) => patientDisplayValue(item.name, language)} onChange={(v) => setForm((x) => ({ ...x, sampleType: v }))} /></Field>
    <Field label={L("Ημερομηνία λήψης", "Collection date")}><Input disabled={saved} type="date" value={form.collectionDate} onChange={(v) => setForm((x) => ({ ...x, collectionDate: v }))} /></Field>
    <Field label={L("Ώρα λήψης", "Collection time")}><Input disabled={saved} type="time" value={form.collectionTime} onChange={(v) => setForm((x) => ({ ...x, collectionTime: v }))} /></Field>
    <Field label={L("Αποτέλεσμα", "Result")}><Select disabled={laboratoryReadOnly} value={form.status} onChange={(v) => setForm((x) => ({ ...x, status: v }))}><option value="Εκκρεμεί">{L("Εκκρεμεί", "Pending")}</option><option value="Θετικό">{L("Θετικό", "Positive")}</option><option value="Αρνητικό">{L("Αρνητικό", "Negative")}</option></Select></Field>
    <Field label={L("Σχόλια αποτελέσματος", "Result notes")} wide><textarea disabled={laboratoryReadOnly} value={form.resultNotes || ''} onChange={(e) => setForm((x) => ({ ...x, resultNotes: e.target.value }))} /></Field>
  </div>
  <section className="pw-organisms-section"><div className="pw-mini-head"><div><b>{L('Μικροοργανισμοί & αντοχή', 'Microorganisms & resistance')}</b><span>{L('Το αποτέλεσμα, οι μικροοργανισμοί και η αντοχή οριστικοποιούνται από το Εργαστήριο. Από την καρτέλα ασθενούς δημιουργείται και παρακολουθείται το δείγμα.', 'Result, microorganisms and resistance are finalized in Laboratory. The patient record is used to create and follow the sample.')}</span></div><Button disabled={laboratoryReadOnly} type="button" variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addOrganism}>{L('Προσθήκη', 'Add')}</Button></div>
    {!organisms.length ? <div className={`pw-mini-empty ${form.status === 'Θετικό' ? 'is-warning' : ''}`.trim()}>{form.status === 'Θετικό' ? L('Θετικό αποτέλεσμα χωρίς καταχωρημένο μικροοργανισμό. Συμπληρώστε το αποτέλεσμα από το Εργαστήριο.', 'Positive result without a recorded microorganism. Complete the result in Laboratory.') : L('Δεν έχει καταχωρηθεί μικροοργανισμός.', 'No microorganism has been recorded.')}</div> : <div className="pw-organism-list">{organisms.map((item, index) => <div className="pw-organism-row" key={item.id || index}><LibraryField disabled={laboratoryReadOnly} hideLabel libraryKey="microorganisms" value={item.name} allowManual placeholder={L("Μικροοργανισμός", "Microorganism")} onChange={(v) => patchOrganism(index, { name: v })} /><Select disabled={laboratoryReadOnly} value={item.resistance || 'Χωρίς χαρακτηρισμό'} onChange={(v) => patchOrganism(index, { resistance: v })}>{RESISTANCE_OPTIONS.map((x) => <option key={x} value={x}>{patientDisplayValue(x, language)}</option>)}</Select>{!laboratoryReadOnly && <IconButton danger label={L("Αφαίρεση", "Remove")} icon={<Trash2 size={14} />} onClick={() => removeOrganism(index)} />}</div>)}</div>}
  </section>
  {form.id && <AttachmentTools files={files} upload={upload} deleteAttachment={deleteAttachment} />}
  <div className="pw-form-actions">
    {saved ? <Button type="button" onClick={cancel}>{L('Κλείσιμο', 'Close')}</Button> : <><Button variant="secondary" type="button" onClick={cancel}>{L('Ακύρωση', 'Cancel')}</Button><Button type="submit">{L('Αποθήκευση', 'Save')}</Button></>}
  </div></form>
}

export function IsolationEditor({ form, setForm, save, cancel, files = [], upload, deleteAttachment }) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const todayIso = new Date().toISOString().slice(0, 10)
  const computedStatus = form.status === 'Ακυρωμένη' ? 'Ακυρωμένη' : (form.endDate && form.endDate < todayIso ? 'Ολοκληρωμένη' : 'Ενεργή')
  const patchDate = (key, value) => setForm((x) => ({ ...x, [key]: value, status: x.status === 'Ακυρωμένη' ? 'Ακυρωμένη' : ((key === 'endDate' ? value : x.endDate) && (key === 'endDate' ? value : x.endDate) < todayIso ? 'Ολοκληρωμένη' : 'Ενεργή') }))
  return <form className="pw-editor compact pw-isolation-editor" onSubmit={save}>
    <div className="pw-form-grid compact">
      <Field label={L("Τύπος", "Type")}><LibraryField hideLabel libraryKey="isolation-types" value={form.isolationType} allowManual placeholder={L("Επιλογή", "Select")} getOptionLabel={(item) => patientDisplayValue(item.name, language)} onChange={(v) => setForm((x) => ({ ...x, isolationType: v }))} /></Field>
      <Field label={L("Παθογόνο", "Pathogen")}><LibraryField hideLabel libraryKey="microorganisms" value={form.pathogen} allowManual placeholder={L("Επιλογή", "Select")} onChange={(v) => setForm((x) => ({ ...x, pathogen: v }))} /></Field>
      <Field label={L("Έναρξη", "Start")}><Input type="date" value={form.startDate} onChange={(v) => patchDate('startDate', v)} /></Field>
      <Field label={L("Λήξη", "End")}><Input type="date" value={form.endDate} onChange={(v) => patchDate('endDate', v)} /></Field>
    </div>
    <div className="pw-isolation-status-line">
      <span className="pw-isolation-status-label">{L('Κατάσταση', 'Status')}</span>
      <Badge tone={computedStatus === 'Ενεργή' ? 'danger' : computedStatus === 'Ολοκληρωμένη' ? 'neutral' : 'warning'}>{patientDisplayValue(computedStatus, language)}</Badge>
      <small>{L('Υπολογίζεται αυτόματα από τις ημερομηνίες έναρξης και λήξης.', 'Calculated automatically from the start and end dates.')}</small>
    </div>
    <div className="pw-isolation-attachment-card">
      <span>{L('Επισύναψη', 'Attachment')}</span>
      <div className="pw-inline-attachment-field">{form.id ? <AttachmentTools files={files} upload={upload} deleteAttachment={deleteAttachment} /> : <small>{L('Μετά την πρώτη αποθήκευση μπορείτε να προσθέσετε αρχείο.', 'After the first save you can add a file.')}</small>}</div>
    </div>
    <div className="pw-form-actions"><Button variant="secondary" type="button" onClick={cancel}>{L('Ακύρωση', 'Cancel')}</Button><Button type="submit">{L('Αποθήκευση', 'Save')}</Button></div>
  </form>
}

const ATTACHMENT_DESTINATIONS = [
  ['patient-records','Γενικά αρχεία ασθενούς','General patient files'],
  ['questionnaire','Κλινική αξιολόγηση','Clinical assessment'],
  ['sample','Δείγματα / Εργαστήριο','Samples / Laboratory'],
  ['isolation','Απομόνωση','Isolation'],
  ['treatment','Αντιμικροβιακή αγωγή','Antimicrobial therapy'],
  ['review','Επανεκτίμηση','Reassessment'],
]

export function FileLibrary({ files, onUpload, onDelete }) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const [adding, setAdding] = useState(false)
  const [destination, setDestination] = useState('patient-records')
  const sorted = [...files].sort((a, b) => String(b.uploadedAt || b.createdAt || b.id).localeCompare(String(a.uploadedAt || a.createdAt || a.id)))
  return <div className="pw-file-library">
    <div className="pw-library-head"><div><small>{L('ΑΡΧΕΙΟ', 'FILES')}</small><h3>{L('Επισυναπτόμενα', 'Attachments')}</h3><p>{L('Όλα τα αρχεία του ασθενούς σε ένα σημείο, με σαφή ένδειξη προέλευσης.', 'All patient files in one place with a clear source label.')}</p></div><Button variant="secondary" size="sm" icon={<Paperclip size={14} />} onClick={() => setAdding((v) => !v)}>{L('Νέα επισύναψη', 'New attachment')}</Button></div>
    {adding && <div className="pw-file-upload-card"><Field label={L('Το αρχείο αφορά', 'File relates to')}><Select value={destination} onChange={setDestination}>{ATTACHMENT_DESTINATIONS.map(([value, el, en]) => <option key={value} value={value}>{language === 'en' ? en : el}</option>)}</Select></Field><div><Button variant="secondary" type="button" onClick={() => setAdding(false)}>{L('Ακύρωση','Cancel')}</Button><Button type="button" icon={<Paperclip size={14} />} onClick={() => { onUpload?.({ step: destination }); setAdding(false) }}>{L('Επιλογή αρχείου','Choose file')}</Button></div></div>}
    {!sorted.length ? <EmptyState icon={<FileText size={24} />} title={L("Δεν υπάρχουν αρχεία", "No files")} text={L("Τα αρχεία από όλες τις ενότητες συγκεντρώνονται εδώ.", "Files from all patient sections are collected here.")} /> : <div className="pw-file-list">{sorted.map((file) => <div key={file.id} className="pw-file-row"><div className="pw-file-icon"><FileText size={17} /></div><div className="pw-file-copy"><b>{file.name}</b><span><strong>{attachmentSectionLabel(file.step, language)}</strong>{file.createdAt || file.uploadedAt ? ` · ${formatDate(String(file.createdAt || file.uploadedAt).slice(0,10))}` : ''}{file.size ? ` · ${formatFileSize(file.size)}` : ''}{file.type ? ` · ${file.type.split('/').pop()?.toUpperCase() || file.type}` : ''}</span></div><div className="pw-icon-actions"><IconButton label={L("Προβολή", "View")} icon={<Eye size={15} />} onClick={() => { if (!previewAttachment(file)) notifyAction(language === 'en' ? `No preview content is available: ${file.name}` : `Δεν υπάρχει διαθέσιμο περιεχόμενο για προβολή: ${file.name}`) }} /><IconButton danger label={L("Διαγραφή", "Delete")} icon={<Trash2 size={15} />} onClick={() => onDelete(file.id)} /></div></div>)}</div>}
  </div>
}
export function AttachmentTools({ files = [], upload, deleteAttachment, readOnly = false }) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  return <div className="pw-attachment-tools">{!readOnly && <IconButton label={L("Επισύναψη", "Attach")} icon={<Paperclip size={15} />} onClick={upload} />}{files.map((file) => <span key={file.id} title={file.name}><FileText size={13} />{file.name}<IconButton label={L("Προβολή", "View")} icon={<Eye size={12} />} onClick={() => { if (!previewAttachment(file)) notifyAction(language === 'en' ? `No preview content is available: ${file.name}` : `Δεν υπάρχει διαθέσιμο περιεχόμενο για προβολή: ${file.name}`) }} />{!readOnly && <IconButton danger label={L("Διαγραφή", "Delete")} icon={<Trash2 size={12} />} onClick={() => deleteAttachment(file.id)} />}</span>)}</div>
}
export function ActionCard({ icon, title, text, onClick }) { return <button type="button" className="pw-action-card" onClick={onClick}><span>{icon}</span><div><b>{title}</b><p>{text}</p></div><ChevronRight size={18} /></button> }
export function PanelHeader({ eyebrow, title, badge }) { return <div className="pw-panel-head"><div><small>{eyebrow}</small><h3>{title}</h3></div>{badge && <Badge tone="warning">{badge}</Badge>}</div> }
export function SectionHeader({ eyebrow, title, text, actions }) { return <div className="pw-section-header"><div><small>{eyebrow}</small><h3>{title}</h3>{text && <p>{text}</p>}</div>{actions && <div className="pw-section-header-actions">{actions}</div>}</div> }
export function Tab({ active, onClick, icon, label, count }) { return <button type="button" className={active ? 'active' : ''} onClick={onClick}>{icon}<span>{label}</span>{count !== undefined && <em>{count}</em>}</button> }
export function IconButton({ label, icon, onClick, danger = false }) { return <button type="button" className={`pw-icon-button ${danger ? 'danger' : ''}`} onClick={onClick} title={label} aria-label={label}>{icon}</button> }
export function EmptyState({ icon, title, text }) { return <div className="pw-empty">{icon}<b>{title}</b><span>{text}</span></div> }
export function Field({ label, children, wide = false }) { return <label className={`pw-field ${wide ? 'wide' : ''}`}><span>{label}</span>{children}</label> }
function toGreekDate(value='') {
  const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value||'')
}
function toIsoDate(value='') {
  const text=String(value||'').trim()
  if(!text)return ''
  const match=text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/)
  if(!match)return null
  const day=match[1].padStart(2,'0'),month=match[2].padStart(2,'0'),year=match[3]
  const iso=`${year}-${month}-${day}`
  const probe=new Date(`${iso}T12:00:00`)
  return Number.isNaN(probe.getTime()) || probe.getFullYear()!==Number(year) || probe.getMonth()+1!==Number(month) || probe.getDate()!==Number(day) ? null : iso
}
function LocalizedDateInput({ value, onChange, disabled, ...props }) {
  const [text,setText]=useState(()=>toGreekDate(value))
  useEffect(()=>setText(toGreekDate(value)),[value])
  return <input {...props} disabled={disabled} type="text" inputMode="numeric" placeholder="ηη/μμ/εεεε" value={text} onChange={(event)=>{const next=event.target.value.replace(/[^0-9\/.-]/g,'').slice(0,10);setText(next);const iso=toIsoDate(next);if(iso!==null)onChange?.(iso)}} onBlur={()=>{const iso=toIsoDate(text);if(iso===null)setText(toGreekDate(value));else setText(toGreekDate(iso))}} />
}
export function Input({ value, onChange, type, ...props }) { return type === 'date' ? <LocalizedDateInput value={value} onChange={onChange} {...props} /> : <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} {...props} /> }
export function Select({ value, onChange, children, ...props }) { return <select value={value || ''} onChange={(event) => onChange(event.target.value)} {...props}>{children}</select> }
