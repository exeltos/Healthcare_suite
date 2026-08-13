import { useI18n } from '../../i18n'
import { useEffect, useState } from 'react'
import { Activity, CalendarDays, ChevronRight, ClipboardList, Edit3, FileText, FlaskConical, History, Paperclip, Pill, Plus, Save, ShieldAlert, Trash2, X } from 'lucide-react'
import Button from '../../components/core/Button/Button'
import Badge from '../../components/core/Badge/Badge'
import Tabs from '../../components/core/Tabs/Tabs'
import Timeline from '../../components/core/Timeline/Timeline'
import LibraryField from '../../components/core/LibraryField/LibraryField'
import { EODY_DISEASES } from '../../services/notifiableDiseasesService'
import { buildPatientSampleRows, formatDate, formatDateTime, getTherapies, normalizeDate, sampleMicroorganismLabel, sampleResistanceLabel, today } from './patientWorkflowUtils'
import { ActionCard, EmptyState, Field, FileLibrary, IconButton, Input, PanelHeader, SectionHeader, Select, Tab } from './PatientWorkflowEditors'
import { patientCount, patientDisplayValue } from './patientPresentation'
import { readSessionValue, writeSessionValue } from '../../core/storage'

export function PatientHome({ patient, editing, setEditing, setPatient, savePatient, activeCases, closedCases, cases, samples, isolations, attachments, timeline, notifiableDiseases, createCase, createSample, openCase, openCaseRecord, openLaboratorySample, upload, deleteAttachment, saveNotifiable, deleteNotifiable, initialTab = 'summary', highlightedSampleId = '' }) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const patientViewKey = `limoxis:patient-view:${patient.id || patient.patientCode || 'unknown'}`
  const sampleHighlightKey = `${patientViewKey}:last-sample`
  const readStored = (key, fallback = '') => readSessionValue(key, fallback)
  const writeStored = (key, value) => writeSessionValue(key, String(value || ''))
  const [tab, setTab] = useState(() => initialTab !== 'summary' ? initialTab : readStored(patientViewKey, initialTab || 'summary'))
  const [lastOpenedSampleId, setLastOpenedSampleId] = useState(() => highlightedSampleId || readStored(sampleHighlightKey, ''))
  const [historyTab, setHistoryTab] = useState('timeline')
  const [diseaseFocusId, setDiseaseFocusId] = useState('')
  useEffect(() => {
    if (initialTab && initialTab !== 'summary') setTab(initialTab)
  }, [initialTab])
  useEffect(() => { writeStored(patientViewKey, tab) }, [patientViewKey, tab])
  useEffect(() => {
    if (!highlightedSampleId) return
    setLastOpenedSampleId(highlightedSampleId)
    writeStored(sampleHighlightKey, highlightedSampleId)
  }, [highlightedSampleId, sampleHighlightKey])
  const openSample = (sample) => {
    setLastOpenedSampleId(sample.id)
    writeStored(sampleHighlightKey, sample.id)
    if (sample.clinicalCaseId) openCaseRecord({ caseId: sample.clinicalCaseId, tab: 'samples', recordType: 'sample', recordId: sample.id })
    else openLaboratorySample?.(sample)
  }
  const therapies = cases.flatMap((surveillanceCase) => getTherapies(surveillanceCase).map((therapy) => ({ ...therapy, clinicalCaseId: surveillanceCase.id, caseReason: surveillanceCase.reason })))
  const activeIsolations = isolations.filter((item) => item.status === 'Ενεργή')
  const openTimelineItem = (item) => {
    if (!item) return
    if (item.type === 'notifiable') { setTab('diseases'); setDiseaseFocusId(item.id); return }
    if (item.type === 'admission' || item.type === 'discharge') { setTab('summary'); return }
    if (item.clinicalCaseId) openCaseRecord({ caseId: item.clinicalCaseId, tab: item.targetTab || 'assessment', recordType: item.recordType || '', recordId: item.recordId || item.id })
  }
  const patientTabs = [
    { id: 'summary', label: L('Σύνοψη', 'Summary'), icon: <ClipboardList size={16} /> },
    { id: 'surveillance', label: L('Επιτηρήσεις', 'Surveillance'), icon: <Activity size={16} />, count: cases.length },
    { id: 'samples', label: L('Δείγματα & Εργαστήριο', 'Samples & Laboratory'), icon: <FlaskConical size={16} />, count: samples.length },
    { id: 'care', label: L('Αγωγή & Μέτρα', 'Therapy & Precautions'), icon: <Pill size={16} />, count: therapies.length + isolations.length },
    { id: 'diseases', label: L('ΕΟΔΥ / Δηλούμενα', 'EODY / Notifiable'), icon: <ShieldAlert size={16} />, count: notifiableDiseases.length },
    { id: 'history', label: L('Ιστορικό & Αρχεία', 'History & Files'), icon: <History size={16} />, count: attachments.length },
  ]
  return <div className="pw-home">
    <div className="pw-patient-tabs"><Tabs ariaLabel={L("Φάκελος ασθενούς", "Patient record")} value={tab} onChange={setTab} items={patientTabs} variant="clinical" /></div>

    <section className="pw-patient-tab-body">
      {tab === 'summary' && <>
        <section className="pw-registry-strip">
          <div className="pw-registry-title"><div><small>{L("ΜΗΤΡΩΟ", "REGISTRY")}</small><h3>{L("Στοιχεία ασθενούς", "Patient details")}</h3></div><div>{editing ? <><IconButton label={L("Ακύρωση", "Cancel")} icon={<X size={16} />} onClick={() => setEditing(false)} /><Button size="sm" icon={<Save size={15} />} onClick={savePatient}>{L("Αποθήκευση", "Save")}</Button></> : <IconButton label={L("Επεξεργασία", "Edit")} icon={<Edit3 size={16} />} onClick={() => setEditing(true)} />}</div></div>
          <div className="pw-registry-grid pw-registry-grid--identity">
            <Field label={L("Όνομα", "First name")}><Input disabled={!editing} value={patient.firstName} onChange={(v) => setPatient((x) => ({ ...x, firstName: v, fullName: [v, x.lastName].filter(Boolean).join(' ') }))} /></Field>
            <Field label={L("Επώνυμο", "Last name")}><Input disabled={!editing} value={patient.lastName} onChange={(v) => setPatient((x) => ({ ...x, lastName: v, fullName: [x.firstName, v].filter(Boolean).join(' ') }))} /></Field>
            <Field label={L("Πατρώνυμο", "Father’s name")}><Input disabled={!editing} value={patient.fatherName} onChange={(v) => setPatient((x) => ({ ...x, fatherName: v }))} /></Field>
            <Field label={L("Φύλο", "Sex")}><Select disabled={!editing} value={patient.gender} onChange={(v) => setPatient((x) => ({ ...x, gender: v }))}><option value="">{L("Επιλογή", "Select")}</option><option value="Άνδρας">{L("Άνδρας", "Male")}</option><option value="Γυναίκα">{L("Γυναίκα", "Female")}</option><option value="Άλλο / μη δηλωμένο">{L("Άλλο / μη δηλωμένο", "Other / not specified")}</option></Select></Field>
            <Field label={L("Ηλικία", "Age")}><Input disabled={!editing} type="number" min="0" max="130" value={patient.age} onChange={(v) => setPatient((x) => ({ ...x, age: v }))} /></Field>
            <Field label={L("ΑΜΚΑ", "National ID (AMKA)")}><Input disabled={!editing} value={patient.amka} onChange={(v) => setPatient((x) => ({ ...x, amka: v }))} /></Field>
            <LibraryField disabled={!editing} label={L("Τμήμα", "Department")} libraryKey="departments" value={patient.department||''} onChange={(value)=>setPatient((x)=>({...x,department:value}))} placeholder={L("Επιλέξτε τμήμα", "Select department")} />
            <Field label={L("Θάλαμος / Κλίνη", "Room / Bed")}><Input disabled={!editing} value={patient.room} onChange={(v) => setPatient((x) => ({ ...x, room: v }))} /></Field>
            <Field label={L("Ημερομηνία εισαγωγής", "Admission date")}><Input disabled={!editing} type="date" value={normalizeDate(patient.admissionDate)} onChange={(v) => setPatient((x) => ({ ...x, admissionDate: v }))} /></Field>
            <Field label={L("Ημερομηνία εξόδου", "Discharge date")}><Input disabled={!editing} type="date" value={normalizeDate(patient.dischargeDate || patient.exitDate)} onChange={(v) => setPatient((x) => ({ ...x, dischargeDate: v }))} /></Field>
          </div>
        </section>

        <section className="pw-action-hub"><div className="pw-action-copy"><small>{L("ΤΙ ΘΕΛΕΤΕ ΝΑ ΚΑΝΕΤΕ;", "WHAT WOULD YOU LIKE TO DO?")}</small><h3>{L("Επιτήρηση ασθενούς", "Patient surveillance")}</h3><p>{L("Ξεκινήστε νέο φάκελο ή συνεχίστε μια ενεργή επιτήρηση.", "Start a new case or continue an active surveillance episode.")}</p></div><div className="pw-action-grid">
          <ActionCard icon={<Plus size={24} />} title={L("Νέα επιτήρηση", "New surveillance")} text={L("Κλινική υποψία που ξεκινά οργανωμένη παρακολούθηση του ασθενούς.", "Start structured follow-up for a clinical suspicion.")} onClick={createCase} />
          <ActionCard icon={<FlaskConical size={24} />} title={L("Νέο δείγμα", "New sample")} text={L("Νέος εργαστηριακός έλεγχος χωρίς αυτόματη δημιουργία επιτήρησης.", "Create a laboratory sample without automatically opening a surveillance case.")} onClick={createSample} />
          {activeCases.length > 0 && <ActionCard icon={<Activity size={24} />} title={L("Συνέχιση ενεργής επιτήρησης", "Continue active surveillance")} text={activeCases.length === 1 ? L("1 ενεργός φάκελος.", "1 active case.") : (language === "en" ? `${activeCases.length} active cases · select which one to continue.` : `${activeCases.length} ενεργοί φάκελοι · επιλέξτε ποιον θέλετε να συνεχίσετε.`)} onClick={() => activeCases.length === 1 ? openCase(activeCases[0], { tab: 'assessment' }) : setTab('surveillance')} />}
        </div></section>

      </>}

      {tab === 'surveillance' && <section className="pw-panel pw-surveillance-panel"><PanelHeader eyebrow={L("ΕΠΙΤΗΡΗΣΕΙΣ", "SURVEILLANCE")} title={L("Φάκελοι επιτήρησης", "Surveillance cases")} badge={patientCount(activeCases.length, "activeCase", language)} actions={<Button size="sm" icon={<Plus size={15} />} onClick={createCase}>{L("Νέα επιτήρηση", "New surveillance")}</Button>} />
        {cases.length === 0 ? <EmptyState icon={<Activity size={24} />} title={L("Δεν υπάρχουν επιτηρήσεις", "No surveillance cases")} text={L("Δημιουργήστε την πρώτη επιτήρηση του ασθενούς.", "Create the patient’s first surveillance case.")} /> : <>
          {activeCases.length > 0 && <div className="pw-case-group"><div className="pw-case-group-head"><b>{L("Ενεργές επιτηρήσεις", "Active surveillance")}</b><span>{L("Επιλέξτε τον φάκελο που θέλετε να συνεχίσετε", "Select the case you want to continue")}</span></div><div className="pw-case-cards">{activeCases.map((item) => { const waiting = item.status === 'Αναμονή εργαστηρίου'; return <button key={item.id} type="button" className="pw-case-card is-active" onClick={() => openCase(item, { tab: waiting ? 'samples' : 'assessment' })}><div><b>{patientDisplayValue(item.reason || 'Επιτήρηση', language)}</b><span>{L('Έναρξη', 'Started')} {formatDate(item.startDate)} · {samples.filter((x) => String(x.clinicalCaseId) === String(item.id)).length} {language === 'en' ? 'samples' : 'δείγματα'}</span></div><div className="pw-case-card-end"><Badge tone="warning">{patientDisplayValue(waiting ? 'Αναμονή εργαστηρίου' : 'Ενεργή', language)}</Badge><ChevronRight size={18} /></div></button> })}</div></div>}
          {closedCases.length > 0 && <div className="pw-case-group is-closed"><div className="pw-case-group-head"><b>{L("Ολοκληρωμένες", "Completed")}</b><span>{patientCount(closedCases.length, "closedCase", language)}</span></div><div className="pw-case-cards">{closedCases.map((item) => <button key={item.id} type="button" className="pw-case-card" onClick={() => openCase(item, { tab: 'assessment' })}><div><b>{patientDisplayValue(item.reason || 'Επιτήρηση', language)}</b><span>{L('Έναρξη', 'Started')} {formatDate(item.startDate)} · {samples.filter((x) => String(x.clinicalCaseId) === String(item.id)).length} {language === 'en' ? 'samples' : 'δείγματα'}</span></div><div className="pw-case-card-end"><Badge tone="success">{patientDisplayValue('Κλειστή', language)}</Badge><ChevronRight size={18} /></div></button>)}</div></div>}
        </>}
      </section>}

      {tab === 'samples' && <section className="pw-panel"><PanelHeader eyebrow={L("ΕΡΓΑΣΤΗΡΙΟ", "LABORATORY")} title={L("Δείγματα & αποτελέσματα", "Samples & results")} badge={patientCount(samples.length, "sample", language)} actions={<Button size="sm" icon={<Plus size={15} />} onClick={createSample}>{L("Νέο δείγμα", "New sample")}</Button>} />
        {samples.length === 0 ? <EmptyState icon={<FlaskConical size={24} />} title={L("Δεν υπάρχουν δείγματα", "No samples")} text={L("Μπορείτε να ξεκινήσετε δείγμα από τον ασθενή ή από το Εργαστήριο.", "Create a sample from the patient record or from Laboratory.")} /> : <div className="pw-record-list pw-sample-chain-list">{buildPatientSampleRows(samples).map(({ sample, depth }) => <div key={sample.id} className={`pw-record-row pw-sample-chain-row ${depth ? 'is-repeat' : ''} ${String(sample.id) === String(lastOpenedSampleId) ? 'is-return-highlight' : ''}`.trim()} style={{ '--sample-depth': depth }} role="button" tabIndex={0} onClick={() => openSample(sample)}><div className="pw-record-icon"><FlaskConical size={17} /></div><div className="pw-record-copy"><b>{patientDisplayValue(sample.sampleType || 'Δείγμα', language)}</b><span>{formatDateTime(sample.collectionDate, sample.collectionTime)} · {patientDisplayValue(sample.category || 'Αρχικό δείγμα', language)}{sample.repeatPurpose ? ` · ${patientDisplayValue(sample.repeatPurpose, language)}` : ''}</span><small>{sampleMicroorganismLabel(sample) || (sample.status === 'Θετικό' ? L('Θετικό αποτέλεσμα χωρίς καταχωρημένο μικροοργανισμό', 'Positive result without a recorded microorganism') : L('Χωρίς μικροοργανισμό', 'No microorganism recorded'))}{sampleResistanceLabel(sample) ? ` · ${sampleResistanceLabel(sample)}` : ''}</small></div><div className="pw-record-badges"><Badge tone={sample.status === 'Θετικό' ? 'danger' : sample.status === 'Αρνητικό' ? 'success' : 'neutral'}>{patientDisplayValue(sample.status || 'Εκκρεμεί', language)}</Badge></div><ChevronRight size={17} /></div>)}</div>}
      </section>}

      {tab === 'care' && <div className="pw-care-grid">
        <section className="pw-care-card"><SectionHeader eyebrow={L("ΑΝΤΙΜΙΚΡΟΒΙΑΚΗ ΑΓΩΓΗ", "ANTIMICROBIAL THERAPY")} title={L("Θεραπευτικά σχήματα", "Treatment regimens")} />{therapies.length === 0 ? <EmptyState icon={<Pill size={24} />} title={L("Δεν υπάρχει αγωγή", "No therapy recorded")} text={L("Οι αγωγές καταχωρίζονται μέσα από την επιτήρηση.", "Therapies are recorded within a surveillance case.")} /> : <div className="pw-record-list compact">{therapies.map((item) => <div key={item.id} className="pw-record-row" role="button" tabIndex={0} onClick={() => openCaseRecord({ caseId: item.clinicalCaseId, tab: 'care', recordType: 'therapy', recordId: item.id })}><div className="pw-record-icon"><Pill size={17} /></div><div className="pw-record-copy"><b>{item.antibiotic}</b><span>{[item.dosage, item.frequency, patientDisplayValue(item.route, language)].filter(Boolean).join(' · ') || L('Χωρίς δοσολογία', 'No dosage recorded')}{item.startDate ? ` · ${formatDate(item.startDate)}` : ''}{item.endDate ? ` – ${formatDate(item.endDate)}` : ''}</span></div><div className="pw-record-badges">{item.isPromoted && <Badge tone="warning">{L('Προωθημένο', 'Restricted')}</Badge>}</div><ChevronRight size={17} /></div>)}</div>}</section>
        <section className="pw-care-card"><SectionHeader eyebrow={L("ΑΠΟΜΟΝΩΣΗ", "ISOLATION")} title={L("Μέτρα προφύλαξης", "Precaution measures")} />{isolations.length === 0 ? <EmptyState icon={<ShieldAlert size={24} />} title={L("Δεν υπάρχει απομόνωση", "No isolation recorded")} text={L("Τα μέτρα απομόνωσης συνδέονται με την επιτήρηση.", "Isolation precautions are linked to surveillance cases.")} /> : <div className="pw-record-list compact">{isolations.map((item) => <div key={item.id} className="pw-record-row" role="button" tabIndex={0} onClick={() => openCaseRecord({ caseId: item.clinicalCaseId, tab: 'care', recordType: 'isolation', recordId: item.id })}><div className="pw-record-icon"><ShieldAlert size={17} /></div><div className="pw-record-copy"><b>{patientDisplayValue(item.isolationType || 'Απομόνωση', language)}</b><span>{formatDate(item.startDate)}{item.endDate ? ` – ${formatDate(item.endDate)}` : ''}{item.pathogen ? ` · ${item.pathogen}` : ''}</span></div><Badge tone={item.status === 'Ενεργή' ? 'danger' : 'neutral'}>{patientDisplayValue(item.status || 'Ενεργή', language)}</Badge><ChevronRight size={17} /></div>)}</div>}</section>
      </div>}

      {tab === 'diseases' && <section className="pw-panel"><PatientNotifiableDiseases patient={patient} items={notifiableDiseases} focusId={diseaseFocusId} onFocusHandled={() => setDiseaseFocusId('')} onSave={saveNotifiable} onDelete={deleteNotifiable} /></section>}

      {tab === 'history' && <section className="pw-panel pw-info-panel"><div className="pw-subtabs"><Tab active={historyTab === 'timeline'} onClick={() => setHistoryTab('timeline')} icon={<CalendarDays size={16} />} label={L("Χρονολόγιο", "Timeline")} count={timeline.length} /><Tab active={historyTab === 'files'} onClick={() => setHistoryTab('files')} icon={<Paperclip size={16} />} label={L("Αρχεία", "Files")} count={attachments.length} /></div><div className="pw-tab-body">{historyTab === 'timeline' && <Timeline items={timeline} formatDateTime={formatDateTime} onItemClick={openTimelineItem} empty={<EmptyState icon={<CalendarDays size={24} />} title={L("Δεν υπάρχουν γεγονότα", "No events")} text={L("Οι καταγραφές θα δημιουργούν αυτόματα το χρονολόγιο.", "Recorded activity will automatically populate the timeline.")} />} />}{historyTab === 'files' && <FileLibrary files={attachments} onUpload={upload} onDelete={deleteAttachment} />}</div></section>}
    </section>
  </div>
}

export function PatientNotifiableDiseases({ patient, items, focusId, onFocusHandled, onSave, onDelete }) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const empty = { disease: '', deadline: '', diagnosisDate: today(), declarationDate: '', status: 'Πρόχειρο', caseClassification: 'Ύποπτο', physician: '', department: patient.department || '', notes: '', attachments: [], history: [] }
  const [draft, setDraft] = useState(null)
  useEffect(() => {
    if (!focusId) return
    const target = items.find((item) => String(item.id) === String(focusId))
    if (target) setDraft(structuredClone(target))
    onFocusHandled?.()
  }, [focusId, items, onFocusHandled])
  function update(name, value) { setDraft((current) => ({ ...current, [name]: value })) }
  function diseaseChanged(value) { const found = EODY_DISEASES.find((item) => item.name === value); setDraft((current) => ({ ...current, disease: value, deadline: found?.deadline || '' })) }
  function addFiles(event) {
    const files = Array.from(event.target.files || []).map((file) => ({ id: `NDF-${Date.now()}-${file.name}`, name: file.name, type: file.type, size: file.size, uploadedAt: new Date().toISOString() }))
    setDraft((current) => ({ ...current, attachments: [...(current.attachments || []), ...files] }))
    event.target.value = ''
  }
  function save(event) { event.preventDefault(); if (!draft?.disease) return; onSave(draft); setDraft(null) }
  return <div className="pw-disease-panel">
    <div className="pw-disease-head"><div><small>EODY</small><h3>{L("Υποχρεωτικώς δηλούμενα νοσήματα", "Notifiable diseases")}</h3><p>{L("Οι δηλώσεις συνδέονται με τον ασθενή και διατηρούν τα δικά τους συνοδευτικά αρχεία.", "Notifications are linked to the patient and keep their own supporting files.")}</p></div><Button size="sm" icon={<Plus size={15} />} onClick={() => setDraft({ ...empty })}>{L("Νέα δήλωση", "New notification")}</Button></div>
    {draft && <form className="pw-editor pw-disease-editor" onSubmit={save}><div className="pw-editor-head"><h3>{draft.id ? L('Επεξεργασία δήλωσης', 'Edit notification') : L('Νέα δήλωση νοσήματος', 'New disease notification')}</h3><IconButton label={L("Κλείσιμο", "Close")} icon={<X size={16} />} onClick={() => setDraft(null)} /></div><div className="pw-form-grid compact">
      <Field label={L("Νόσημα", "Disease")} wide><Select value={draft.disease} onChange={diseaseChanged}><option value="">{L("Επιλέξτε από τον κατάλογο", "Select from list")}</option>{EODY_DISEASES.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</Select></Field>
      <Field label={L("Χρόνος δήλωσης", "Notification timeframe")}><Input value={draft.deadline} onChange={() => {}} readOnly /></Field>
      <Field label={L("Κατάσταση", "Status")}><Select value={draft.status} onChange={(v) => update('status', v)}><option value="Πρόχειρο">{L("Πρόχειρο", "Draft")}</option><option value="Προς δήλωση">{L("Προς δήλωση", "Pending notification")}</option><option value="Δηλώθηκε">{L("Δηλώθηκε", "Notified")}</option><option value="Ακυρώθηκε">{L("Ακυρώθηκε", "Cancelled")}</option></Select></Field>
      <Field label={L("Κατηγορία κρούσματος", "Case classification")}><Select value={draft.caseClassification} onChange={(v) => update('caseClassification', v)}><option value="Ύποπτο">{L("Ύποπτο", "Suspected")}</option><option value="Πιθανό">{L("Πιθανό", "Probable")}</option><option value="Επιβεβαιωμένο">{L("Επιβεβαιωμένο", "Confirmed")}</option></Select></Field>
      <Field label={L("Ημερομηνία διάγνωσης", "Diagnosis date")}><Input type="date" value={draft.diagnosisDate} onChange={(v) => update('diagnosisDate', v)} /></Field>
      <Field label={L("Ημερομηνία δήλωσης", "Notification date")}><Input type="date" value={draft.declarationDate} onChange={(v) => update('declarationDate', v)} /></Field>
      <Field label={L("Θεράπων / δηλών ιατρός", "Treating / notifying physician")}><Input value={draft.physician} onChange={(v) => update('physician', v)} /></Field>
      <LibraryField label={L("Τμήμα", "Department")} libraryKey="departments" value={draft.department||''} onChange={(value)=>update('department',value)} placeholder={L("Επιλέξτε τμήμα", "Select department")} />
      <Field label={L("Κλινικές πληροφορίες", "Clinical information")} wide><textarea value={draft.notes || ''} onChange={(e) => update('notes', e.target.value)} /></Field>
      <Field label={L("Συνοδευτικά αρχεία", "Supporting files")} wide><div className="pw-inline-files"><label className="pw-upload-label"><Paperclip size={14} /> {L("Προσθήκη αρχείων", "Add files")}<input hidden multiple type="file" onChange={addFiles} /></label>{(draft.attachments || []).map((file) => <span key={file.id}><FileText size={13} />{file.name}<IconButton danger label={L("Αφαίρεση", "Remove")} icon={<Trash2 size={12} />} onClick={() => update('attachments', draft.attachments.filter((item) => item.id !== file.id))} /></span>)}</div></Field>
    </div><div className="pw-form-actions"><Button variant="secondary" type="button" onClick={() => setDraft(null)}>{L("Ακύρωση", "Cancel")}</Button><Button type="submit">{L("Αποθήκευση", "Save")}</Button></div></form>}
    {!items.length ? <EmptyState icon={<ShieldAlert size={24} />} title={L("Δεν υπάρχουν δηλούμενα νοσήματα", "No notifiable diseases")} text={L("Δημιουργήστε δήλωση μόνο όταν απαιτείται.", "Create a notification only when required.")} /> : <div className="pw-record-list">{items.map((item) => <div key={item.id} className="pw-record-row" role="button" tabIndex={0} onClick={() => setDraft(structuredClone(item))}><div className="pw-record-icon"><ShieldAlert size={17} /></div><div className="pw-record-copy"><b>{item.disease}</b><span>{patientDisplayValue(item.caseClassification, language)} · {formatDate(item.diagnosisDate)} · {item.deadline || 'Χωρίς προθεσμία'}</span></div><div className="pw-record-badges"><Badge tone={item.status === 'Δηλώθηκε' ? 'success' : item.deadline === 'Αμέσως' ? 'danger' : 'warning'}>{patientDisplayValue(item.status, language)}</Badge>{item.attachments?.length > 0 && <Badge tone="neutral">{item.attachments.length} {language === 'en' ? 'files' : 'αρχεία'}</Badge>}</div><div className="pw-icon-actions" onClick={(e) => e.stopPropagation()}><IconButton label={L("Επεξεργασία", "Edit")} icon={<Edit3 size={15} />} onClick={() => setDraft(structuredClone(item))} /><IconButton danger label={L("Διαγραφή", "Delete")} icon={<Trash2 size={15} />} onClick={() => onDelete(item.id)} /></div></div>)}</div>}
  </div>
}

