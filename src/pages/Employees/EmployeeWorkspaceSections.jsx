import { ChevronRight, ClipboardList, Edit3, Plus, Save, ShieldCheck, Stethoscope, Syringe, X } from 'lucide-react'
import LibraryField from '../../components/core/LibraryField/LibraryField'
import { Button, FormActions, IconButton, WorkspaceSectionHeader } from '../../components/core'
import { SmartDateInput } from '../../components/core/fields/DateTimeControls'
import { employeeDisplayValue } from './employeePresentation'

const emptyOccupationalVisit = {
  date: '',
  fitness: 'Κατάλληλος',
  nextReviewDate: '',
  notes: '',
}

export function EmployeeHealthTab({ language, view, setView, vaccinations, selectedVaccination, setSelectedVaccination, lastVaccinationId, employee, onSaveVaccination, onDeleteVaccination, visits, occupationalDraft, setOccupationalDraft, onSaveOccupational, onDeleteOccupational }) {
  const L = (el, en) => language === 'en' ? en : el
  const newVaccination = () => setSelectedVaccination({ vaccine: '', date: '', dose: '', lot: '', validUntil: '', notes: '', employeeId: employee?.id || '' })
  return <section className="ew-health-shell">
    <div className="ew-health-tabs" role="tablist" aria-label={L('Υγεία εργαζομένου', 'Employee health')}>
      <Button variant="ghost" size="sm" className={view === 'vaccinations' ? 'active' : ''} icon={<Syringe size={16}/>} onClick={() => setView('vaccinations')}>{L('Εμβολιασμοί', 'Vaccinations')} <em>{vaccinations.length}</em></Button>
      <Button variant="ghost" size="sm" className={view === 'occupational' ? 'active' : ''} icon={<Stethoscope size={16}/>} onClick={() => setView('occupational')}>{L('Ιατρός εργασίας', 'Occupational Health')} <em>{visits.length}</em></Button>
    </div>
    <div className="ew-health-body">
      {view === 'vaccinations' && (selectedVaccination ? <section className="ew-list-section ew-vaccine-detail">
        <WorkspaceSectionHeader
          icon={<Syringe size={20}/>} eyebrow={L('ΕΜΒΟΛΙΑΣΜΟΣ','VACCINATION')}
          title={selectedVaccination.id ? employeeDisplayValue(selectedVaccination.vaccine || 'Εμβολιασμός', language) : L('Νέος εμβολιασμός','New vaccination')}
          text={L('Καταχώρηση στοιχείων εμβολιασμού του εργαζομένου.', 'Record the employee vaccination details.')}
        />
        <form className="ew-vaccine-form" onSubmit={onSaveVaccination}>
          <div className="ew-grid ew-grid--three">
            <Field label={L('Εμβόλιο *','Vaccine *')}><LibraryField hideLabel allowManual libraryKey="vaccines" value={selectedVaccination.vaccine || ''} onValueChange={(value) => setSelectedVaccination({ ...selectedVaccination, vaccine: value })} placeholder={L('Επιλέξτε ή γράψτε εμβόλιο','Select or enter vaccine')} /></Field>
            <Field label={L('Ημερομηνία *','Date *')}><SmartDateInput value={selectedVaccination.date || ''} onValueChange={(value) => setSelectedVaccination({ ...selectedVaccination, date: value })} /></Field>
            <Field label={L('Δόση','Dose')}><input value={selectedVaccination.dose || ''} onChange={(e) => setSelectedVaccination({ ...selectedVaccination, dose: e.target.value })} /></Field>
            <Field label={L('Παρτίδα','Lot')}><input value={selectedVaccination.lot || ''} onChange={(e) => setSelectedVaccination({ ...selectedVaccination, lot: e.target.value })} /></Field>
            <Field label={L('Ισχύς έως','Valid until')}><SmartDateInput value={selectedVaccination.validUntil || ''} onValueChange={(value) => setSelectedVaccination({ ...selectedVaccination, validUntil: value })} /></Field>
            <Field label={L('Σημειώσεις','Notes')} wide><textarea value={selectedVaccination.notes || ''} onChange={(e) => setSelectedVaccination({ ...selectedVaccination, notes: e.target.value })} /></Field>
          </div>
          <FormActions onCancel={() => setSelectedVaccination(null)} destructive={selectedVaccination.id ? <Button variant="danger" type="button" onClick={() => onDeleteVaccination?.(selectedVaccination.id)}>{L('Διαγραφή','Delete')}</Button> : null} />
        </form>
      </section> : <section className="ew-list-section ew-vaccination-list">
        <WorkspaceSectionHeader icon={<Syringe size={22}/>} eyebrow={L('ΕΜΒΟΛΙΑΣΜΟΙ', 'VACCINATIONS')} title={L('Ιστορικό εμβολιασμών', 'Vaccination history')} text={L('Επιλέξτε καταχώρηση για προβολή ή επεξεργασία.', 'Select a record to view or edit it.')} actions={<Button size="sm" icon={<Plus size={15}/>} onClick={newVaccination}>{L('Προσθήκη εμβολιασμού','Add vaccination')}</Button>} />
        {vaccinations.length ? <div className="ew-record-list">{vaccinations.map((item, index) => <article key={item.id || index} className={`ew-record-row is-clickable ${String(item.id || '') === String(lastVaccinationId || '') ? 'is-return-highlight' : ''}`} onClick={() => setSelectedVaccination({ ...item })}><div><strong>{employeeDisplayValue(item.vaccine || 'Εμβολιασμός', language)}</strong><small>{[item.dose,item.lot ? `${L('Παρτίδα', 'Lot')} ${item.lot}` : '',item.validUntil ? `${L('Ισχύς έως', 'Valid until')} ${formatDate(item.validUntil, language)}` : ''].filter(Boolean).join(' · ') || L('Χωρίς πρόσθετα στοιχεία', 'No additional details')}</small></div><span>{formatDate(item.date, language)}</span><ChevronRight size={17} /></article>)}</div> : <div className="ew-empty"><Syringe size={22}/><strong>{L('Δεν υπάρχουν εμβολιασμοί.', 'No vaccinations recorded.')}</strong></div>}
      </section>)}
      {view === 'occupational' && <OccupationalHealthTab language={language} visits={visits} draft={occupationalDraft} setDraft={setOccupationalDraft} onSave={onSaveOccupational} onDelete={onDeleteOccupational} />}
    </div>
  </section>
}

function Detail({ label, value, wide=false }) {
  return <div className={`ew-detail ${wide ? 'wide' : ''}`}><span>{label}</span><strong>{value}</strong></div>
}

export function ProfileTab({ language, form, setForm, editing, saving=false, onEdit, onCancel, onSave }) {
  const L = (el, en) => language === 'en' ? en : el
  return <div className="ew-profile">
    <section className="ew-section">
      <WorkspaceSectionHeader
        icon={<ClipboardList size={18} />}
        title={L('Προσωπικά στοιχεία', 'Personal details')}
        text={L('Στοιχεία ταυτοποίησης του εργαζομένου.', 'Employee identification details.')}
        actions={!editing ? <IconButton label={L('Επεξεργασία', 'Edit')} size="sm" onClick={onEdit}><Edit3 size={15} /></IconButton> : null}
      />
      <div className="ew-grid ew-grid--three">
        <Field label={L('Επώνυμο *', 'Last name *')}><input disabled={!editing} required value={form.lastName || ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
        <Field label={L('Όνομα *', 'First name *')}><input disabled={!editing} required value={form.firstName || ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
        <Field label={L('Πατρώνυμο', "Father's name")}><input disabled={!editing} value={form.fatherName || ''} onChange={(e) => setForm({ ...form, fatherName: e.target.value })} /></Field>
        <Field label={L('Φύλο', 'Sex')}><select disabled={!editing} value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="">{L('Επιλέξτε', 'Select')}</option><option value="Άνδρας">{employeeDisplayValue('Άνδρας', language)}</option><option value="Γυναίκα">{employeeDisplayValue('Γυναίκα', language)}</option><option value="Άλλο / μη δηλωμένο">{employeeDisplayValue('Άλλο / μη δηλωμένο', language)}</option></select></Field>
      </div>
    </section>

    <section className="ew-section">
      <WorkspaceSectionHeader icon={<ShieldCheck size={18} />} title={L('Γενικά & υπηρεσιακά στοιχεία', 'Employment details')} text={L('Κωδικός, ιδιότητα, τμήμα και κατάσταση απασχόλησης.', 'Code, professional category, department and employment status.')} />
      <div className="ew-grid ew-grid--three">
        <Field label={L('Κωδικός εργαζομένου', 'Employee code')}><input disabled={!editing} value={form.employeeCode || ''} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} /></Field>
        <LibraryField disabled={!editing} label={L('Ιδιότητα', 'Professional category')} libraryKey="professional-categories" value={form.professionalCategory || ''} onValueChange={(value) => setForm({ ...form, professionalCategory: value })} />
        <LibraryField disabled={!editing} label={L('Τμήμα', 'Department')} libraryKey="departments" value={form.department || ''} onValueChange={(value) => setForm({ ...form, department: value })} />
        <Field label={L('Ημερομηνία πρόσληψης', 'Hire date')}><SmartDateInput disabled={!editing} value={form.hireDate || ''} onValueChange={(value) => setForm({ ...form, hireDate: value })} /></Field>
        <Field label={L('Κατάσταση', 'Status')}><select disabled={!editing} value={form.status || 'Ενεργό'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="Ενεργό">{employeeDisplayValue('Ενεργό', language)}</option><option value="Ανενεργό">{employeeDisplayValue('Ανενεργό', language)}</option></select></Field>
      </div>
    </section>

    <section className="ew-section">
      <WorkspaceSectionHeader icon={<ShieldCheck size={18} />} title={L('Στοιχεία επικοινωνίας', 'Contact details')} text={L('Υπηρεσιακά στοιχεία επικοινωνίας.', 'Work contact details.')} />
      <div className="ew-grid ew-grid--two">
        <Field label="Email"><input disabled={!editing} type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label={L('Τηλέφωνο', 'Phone')}><input disabled={!editing} value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label={L('Σημειώσεις', 'Notes')} wide><textarea disabled={!editing} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      </div>
    </section>
    {editing ? <FormActions primaryType="button" onPrimary={onSave} onCancel={onCancel} saving={saving} /> : null}
  </div>
}

function OccupationalHealthTab({ language, visits, draft, setDraft, onSave, onDelete }) {
  const L = (el, en) => language === 'en' ? en : el
  const isEditing = Boolean(draft)
  return <section className="ew-list-section ew-occupational-list">
    <WorkspaceSectionHeader
      icon={<Stethoscope size={20} />}
      eyebrow={L('ΙΑΤΡΟΣ ΕΡΓΑΣΙΑΣ', 'OCCUPATIONAL HEALTH')}
      title={isEditing ? (draft?.id ? L('Καταχώρηση ιατρού εργασίας', 'Occupational-health record') : L('Νέα καταχώρηση', 'New record')) : L('Ιατρική καταλληλότητα & επανέλεγχοι', 'Fitness assessments & reviews')}
      text={isEditing ? L('Συμπληρώστε τα στοιχεία και επιλέξτε Αποθήκευση ή Ακύρωση.', 'Complete the fields and choose Save or Cancel.') : L('Καταγράφονται μόνο στοιχεία καταλληλότητας, ημερομηνίες και επανέλεγχοι — όχι διάγνωση ή αναλυτικό ιατρικό ιστορικό.', 'Only fitness status, dates and reviews are recorded — not diagnoses or detailed medical history.')}
      actions={!isEditing ? <Button size="sm" icon={<Plus size={15} />} onClick={() => setDraft({ ...emptyOccupationalVisit })}>{L('Νέα καταχώρηση', 'New record')}</Button> : null}
    />

    {isEditing ? <form className="ew-occupational-form" onSubmit={onSave}>
      <div className="ew-grid ew-grid--three">
        <Field label={L('Ημερομηνία εξέτασης *', 'Examination date *')}><SmartDateInput value={draft.date || ''} onValueChange={(value) => setDraft({ ...draft, date: value })} /></Field>
        <Field label={L('Καταλληλότητα', 'Fitness')}><select value={draft.fitness || 'Κατάλληλος'} onChange={(e) => setDraft({ ...draft, fitness: e.target.value })}><option value="Κατάλληλος">{employeeDisplayValue('Κατάλληλος', language)}</option><option value="Κατάλληλος με περιορισμούς">{employeeDisplayValue('Κατάλληλος με περιορισμούς', language)}</option><option value="Προσωρινά μη κατάλληλος">{employeeDisplayValue('Προσωρινά μη κατάλληλος', language)}</option></select></Field>
        <Field label={L('Επόμενος επανέλεγχος', 'Next review')}><SmartDateInput value={draft.nextReviewDate || ''} onValueChange={(value) => setDraft({ ...draft, nextReviewDate: value })} /></Field>
        <Field label={L('Σημειώσεις', 'Notes')} wide><textarea value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
      </div>
      <FormActions onCancel={() => setDraft(null)} destructive={draft.id ? <Button variant="danger" type="button" onClick={() => onDelete(draft.id)}>{L('Διαγραφή', 'Delete')}</Button> : null} />
    </form> : visits.length ? <div className="ew-record-list">{visits.map((item) => <article key={item.id} className="ew-record-row is-clickable" onClick={() => setDraft({ ...item })}>
      <div><strong>{employeeDisplayValue(item.fitness, language) || '—'}</strong><small>{item.nextReviewDate ? `${L('Επανέλεγχος', 'Review')} ${formatDate(item.nextReviewDate, language)}` : L('Χωρίς προγραμματισμένο επανέλεγχο', 'No review scheduled')}</small></div>
      <span>{formatDate(item.date, language)}</span>
      <ChevronRight size={17} />
    </article>)}</div> : <div className="ew-empty"><Stethoscope size={22} /><strong>{L('Δεν υπάρχουν καταχωρήσεις ιατρού εργασίας.', 'No occupational-health records.')}</strong></div>}
  </section>
}

export function ListTab({ icon, eyebrow, title, text, empty, rows, render, clickable=false, onRowClick, highlightedId='' }) {
  return <section className="ew-list-section"><WorkspaceSectionHeader icon={icon} eyebrow={eyebrow} title={title} text={text} />{rows.length ? <div className="ew-record-list">{rows.map((item, index) => <article key={item.id || item.trainingId || index} className={`ew-record-row ${clickable ? 'is-clickable' : ''} ${String(item.id || '') === String(highlightedId || '') ? 'is-return-highlight' : ''}`.trim()} onClick={clickable ? () => onRowClick?.(item) : undefined}>{render(item)}</article>)}</div> : <div className="ew-empty">{icon}<strong>{empty}</strong></div>}</section>
}


function Field({ label, wide, children }) {
  return <label className={wide ? 'ew-field ew-field--wide' : 'ew-field'}><span>{label}</span>{children}</label>
}

export function formatDate(value, language='el') {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'el-GR').format(date)
}

export function hasProfileData(record = {}) {
  return Boolean(record.firstName || record.lastName || record.employeeCode || record.professionalCategory || record.department)
}

export function pickUnsaved(current, next) {
  if (!current?.id || String(current.id) !== String(next?.id)) return {}
  return {}
}

export function accountStatusLabel(value, language='el') {
  const el = { pending: 'Εκκρεμεί', invited: 'Πρόσκληση', active: 'Ενεργός', disabled: 'Ανενεργός' }
  const en = { pending: 'Pending', invited: 'Invited', active: 'Active', disabled: 'Disabled' }
  return (language === 'en' ? en : el)[value] || value || '—'
}
