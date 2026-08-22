import { useI18n } from '../../i18n'
import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useState } from 'react'
import { Activity, FlaskConical, Paperclip, Pill, Plus, RefreshCcw, ShieldAlert, Trash2 } from 'lucide-react'
import Button from '../../components/core/Button/Button'
import FormActions from '../../components/core/FormActions/FormActions'
import Badge from '../../components/core/Badge/Badge'
import MultiSelect from '../../components/core/MultiSelect/MultiSelect'
import LibraryField from '../../components/core/LibraryField/LibraryField'
import { deletePromotedAntibioticAsync, loadPromotedAntibiotics, promotedRecordIdForTherapy, syncPromotedTherapyAsync } from '../../services/preventionService'
import { CLINICAL_ASSESSMENT_OPTIONS, PROMOTED_ANTIBIOTIC_DEFAULTS, PROMOTED_APPROVAL_OPTIONS } from '../../core/constants/clinicalOptions'
import { masterNames, upsertMasterItemAsync } from '../../services/masterDataService'
import { buildPatientTimeline } from './patientWorkflowTimeline'
import { buildSampleChainRows, formatDate, getDeviceRecords, getTherapies, highestResistance, isRepeatSample, normalizeOrganismResults, sampleMicroorganismLabel, sampleResistanceLabel, today } from './patientWorkflowUtils'
import { AttachmentTools, EmptyState, Field, IconButton, Input, IsolationEditor, SampleEditor, SectionHeader, Select, Tab } from './PatientWorkflowEditors'
import { patientCount, patientDisplayValue } from './patientPresentation'
import { patientClinicalCopy } from './patientClinicalCopy'
import { AssessmentPanel } from './PatientAssessmentPanel'
export { AssessmentPanel } from './PatientAssessmentPanel'

const EMPTY_ISOLATION = { isolationType: '', pathogen: '', startDate: '', endDate: '', status: 'Ενεργή', notes: '' }

export function CaseWorkspace({ patient, data, tab, setTab, patch, patchNested, closeEpisode, focusedRecord, samples, sampleForm, setSampleForm, beginSample, saveSample, isolations, isolationForm, setIsolationForm, saveIsolation, attachments, filesFor, upload, deleteAttachment, removeCase, removeSample, removeIsolation }) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const timeline = buildPatientTimeline({ patient, cases: [data], samples, isolations, language })
  const readOnly = data.status === 'Κλειστό' || String(data.workflowPhase || '').startsWith('closed-') || Boolean(data.closedDate)
  return <div className="pw-workspace">
    <section className="pw-case-hero"><div><small>{L("ΦΑΚΕΛΟΣ ΕΠΙΤΗΡΗΣΗΣ", "SURVEILLANCE CASE")}</small><h3>{patientDisplayValue(data.reason, language) || L('Νέα επιτήρηση', 'New surveillance')}</h3><p>{L('Έναρξη', 'Started')} {formatDate(data.startDate)} · {patientCount(samples.length, 'sample', language)}{String(data.workflowPhase || '').startsWith('closed-negative') ? (data.close?.reason === 'negative-recheck' ? ` · ${L('Ολοκληρώθηκε με αρνητικό επανέλεγχο', 'Completed after negative follow-up')}` : ` · ${L('Έκλεισε μετά από αρνητικό αποτέλεσμα', 'Closed after negative result')}`) : data.workflowPhase === 'confirmed-positive' ? ` · ${L('Εργαστηριακά επιβεβαιωμένο', 'Laboratory confirmed')}` : data.workflowPhase === 'awaiting-laboratory' ? ` · ${L('Αναμονή εργαστηρίου', 'Awaiting laboratory')}` : ''}</p></div><div className="pw-case-hero-actions"><Badge tone={readOnly ? 'neutral' : 'warning'}>{readOnly ? L('Κλειστή · μόνο προβολή', 'Closed · read only') : patientDisplayValue(data.status || 'Ενεργό', language)}</Badge></div></section>
    <nav className="pw-workspace-tabs" aria-label={L("Ενότητες φακέλου", "Case sections")}>
      <Tab active={tab === 'assessment'} onClick={() => setTab('assessment')} icon={<Activity size={16} />} label={L("Κλινική αξιολόγηση", "Clinical assessment")} />
      <Tab active={tab === 'samples'} onClick={() => setTab('samples')} icon={<FlaskConical size={16} />} label={L("Δείγματα", "Samples")} count={samples.length} />
      <Tab active={tab === 'care'} onClick={() => setTab('care')} icon={<ShieldAlert size={16} />} label={L("Αντιμετώπιση", "Management")} />
    </nav>
    <section className={`pw-workspace-body ${readOnly ? 'is-readonly' : ''}`}>
      {readOnly && <div className="pw-readonly-notice">{patientClinicalCopy("caseReadOnly", language)}</div>}
      {tab === 'assessment' && <AssessmentPanel readOnly={readOnly} data={data} patch={patch} patchNested={patchNested} focusedRecord={focusedRecord} files={filesFor('questionnaire')} upload={() => upload({ step: 'questionnaire' })} deleteAttachment={deleteAttachment} />}
      {tab === 'samples' && <SamplesPanel readOnly={readOnly} samples={samples} form={sampleForm} setForm={setSampleForm} beginSample={beginSample} save={saveSample} remove={removeSample} filesFor={filesFor} upload={upload} deleteAttachment={deleteAttachment} />}
      {tab === 'care' && <CarePanel readOnly={readOnly} patient={patient} data={data} patch={patch} patchNested={patchNested} closeEpisode={closeEpisode} focusedRecord={focusedRecord} isolations={isolations} isolationForm={isolationForm} setIsolationForm={setIsolationForm} saveIsolation={saveIsolation} removeIsolation={removeIsolation} filesFor={filesFor} upload={upload} deleteAttachment={deleteAttachment} />}
    </section>
  </div>
}

export function SamplesPanel({ readOnly = false, samples, form, setForm, beginSample, save, remove, filesFor, upload, deleteAttachment }) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const chainRows = buildSampleChainRows(samples)
  return <div><SectionHeader eyebrow={L("ΔΕΙΓΜΑΤΑ & ΑΠΟΤΕΛΕΣΜΑΤΑ", "SAMPLES & RESULTS")} title={L("Καταγραφές εργαστηρίου", "Laboratory records")} text={patientClinicalCopy("samplesIntro", language)} actions={!readOnly ? <Button size="sm" icon={<Plus size={15} />} onClick={() => beginSample()}>{L('Νέο ανεξάρτητο δείγμα', 'New independent sample')}</Button> : null} />
    {form && !readOnly && <SampleEditor form={form} setForm={setForm} samples={samples} save={save} cancel={() => setForm(null)} files={form.id ? filesFor('sample', form.id) : []} upload={() => form.id && upload({ step: 'sample', recordId: form.id })} deleteAttachment={deleteAttachment} startRecheck={beginSample} />}
    {samples.length === 0 ? <EmptyState icon={<FlaskConical size={25} />} title={L("Δεν υπάρχουν δείγματα", "No samples")} text={L("Προσθέστε το πρώτο δείγμα της επιτήρησης.", "Add the first sample for this surveillance case.")} /> : <div className="pw-record-list pw-sample-chain-list">{chainRows.map(({ sample, depth, repeatNumber, chainLength }) => {
      const repeat = isRepeatSample(sample)
      const negativeClearance = repeat && sample.status === 'Αρνητικό' && String(sample.repeatPurpose || '').includes('αρνητικοποίησης')
      return <div key={sample.id} className={`pw-record-row pw-sample-chain-row ${repeat ? 'is-repeat' : 'is-root'}`} style={{ '--sample-depth': depth }} onClick={() => !readOnly && setForm({ ...sample })} role={readOnly ? undefined : "button"} tabIndex={readOnly ? undefined : 0}>
        <div className="pw-record-icon"><FlaskConical size={17} /></div>
        <div className="pw-record-copy"><b>{patientDisplayValue(sample.sampleType, language)}</b><span>{repeat ? `${patientDisplayValue(sample.repeatPurpose || 'Επανέλεγχος', language)} · ${L('Επανέλεγχος', 'Follow-up')} #${repeatNumber}` : patientDisplayValue(sample.category || 'Νέο ανεξάρτητο δείγμα', language)} · {formatDate(sample.collectionDate)}{sampleMicroorganismLabel(sample) ? ` · ${sampleMicroorganismLabel(sample)}` : (sample.status === 'Θετικό' ? ` · ${L('χωρίς καταχωρημένο μικροοργανισμό', 'microorganism not recorded')}` : '')}{!repeat && chainLength > 1 ? language === 'en' ? ` · ${chainLength - 1} follow-up${chainLength - 1 === 1 ? '' : 's'}` : ` · ${chainLength - 1} επανέλεγχος/οι` : ''}</span>{repeat && sample.monitoringFor?.length ? <small>Παρακολούθηση για: {sample.monitoringFor.join(', ')}</small> : null}</div>
        <div className="pw-record-badges"><Badge tone={sample.status === 'Θετικό' ? 'danger' : sample.status === 'Αρνητικό' ? 'success' : 'neutral'}>{patientDisplayValue(negativeClearance ? 'Αρνητικοποίηση' : sample.status, language)}</Badge>{sampleResistanceLabel(sample) && <Badge tone="danger">{highestResistance(normalizeOrganismResults(sample).map((x) => x.resistance))}</Badge>}</div>
        <div className="pw-icon-actions" onClick={(e) => e.stopPropagation()}>{!readOnly && <><IconButton label={L("Νέος επανέλεγχος", "New follow-up")} icon={<RefreshCcw size={15} />} onClick={() => beginSample(sample)} /><IconButton label={L("Επισύναψη", "Attach")} icon={<Paperclip size={15} />} onClick={() => upload({ step: 'sample', recordId: sample.id })} /><IconButton danger label={L("Διαγραφή", "Delete")} icon={<Trash2 size={15} />} onClick={() => remove(sample.id)} /></>}</div>
      </div>
    })}</div>}
  </div>
}

export function CarePanel({ readOnly = false, patient, data, patch, patchNested, closeEpisode, focusedRecord, isolations, isolationForm, setIsolationForm, saveIsolation, removeIsolation, filesFor, upload, deleteAttachment }) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const therapies = getTherapies(data)
  const [therapyForm, setTherapyForm] = useState(null)

  useEffect(() => {
    if (!focusedRecord?.id) return
    if (focusedRecord.type === 'therapy') {
      const target = therapies.find((item) => String(item.id) === String(focusedRecord.id))
      if (target) beginTherapy(target)
    } else if (focusedRecord.type === 'isolation') {
      const target = isolations.find((item) => String(item.id) === String(focusedRecord.id))
      if (target) setIsolationForm({ ...target })
    }
  }, [focusedRecord?.type, focusedRecord?.id])

  function beginTherapy(item = null) {
    if (item) {
      const promoted = loadPromotedAntibiotics().find((record) => String(record.sourceId || '') === String(item.id) || String(record.id || '') === String(promotedRecordIdForTherapy(item.id)))
      setTherapyForm({
        ...item,
        approval: promoted?.approval ?? item.approval ?? 'Εκκρεμεί',
        approvalDoctor: promoted?.doctor ?? item.approvalDoctor ?? '',
        approvalDate: promoted?.approvalDate ?? item.approvalDate ?? '',
        approvalNotes: promoted?.notes ?? item.approvalNotes ?? '',
      })
      return
    }
    setTherapyForm({
      id: `TH-${Date.now()}`,
      antibiotic: '',
      dosage: '',
      route: '',
      frequency: '',
      startDate: today(),
      endDate: '',
      indication: '',
      antibiogramNotes: '',
      isPromoted: false,
      approval: 'Εκκρεμεί',
      approvalDoctor: '',
      approvalDate: '',
      approvalNotes: '',
    })
  }

  async function saveTherapy(event) {
    event.preventDefault()
    if (!therapyForm?.antibiotic || !therapyForm?.startDate) {
      notifyAction(L('Συμπληρώστε αντιμικροβιακό και ημερομηνία έναρξης.', 'Enter antimicrobial and start date.'))
      return
    }
    const savedTherapy = { ...therapyForm }
    const next = therapies.some((item) => String(item.id) === String(savedTherapy.id))
      ? therapies.map((item) => String(item.id) === String(savedTherapy.id) ? savedTherapy : item)
      : [...therapies, savedTherapy]
    await patch({ therapies: next, therapy: next[0] || {} })
    await syncPromotedTherapyAsync({ therapy: savedTherapy, patient, surveillanceCase: { ...data, therapies: next, therapy: next[0] || {} } })
    setTherapyForm(null)
  }

  async function removeTherapy(id) {
    if (!confirmAction(L('Να διαγραφεί η αντιμικροβιακή αγωγή;', 'Delete this antimicrobial therapy?'))) return
    const next = therapies.filter((item) => String(item.id) !== String(id))
    await patch({ therapies: next, therapy: next[0] || {} })
    await deletePromotedAntibioticAsync(promotedRecordIdForTherapy(id))
    setTherapyForm(null)
  }

  return <div className="pw-care-grid">
    <section className="pw-care-card pw-care-wide">
      <SectionHeader
        eyebrow={L("ΑΝΤΙΜΙΚΡΟΒΙΑΚΗ ΑΓΩΓΗ", "ANTIMICROBIAL THERAPY")}
        title={L("Θεραπευτικά σχήματα", "Treatment regimens")}
        text={patientClinicalCopy("therapyIntro", language)}
        actions={!readOnly ? <Button className="pw-add-therapy-button" size="sm" variant="secondary" icon={<Plus size={15} />} onClick={() => beginTherapy()}>{L('Προσθήκη αγωγής', 'Add therapy')}</Button> : null}
      />
      {therapyForm && !readOnly && <form className="pw-editor compact" onSubmit={saveTherapy}>
        <div className="pw-form-grid compact">
          <Field label={L("Αντιβιοτικό", "Antimicrobial")}><LibraryField hideLabel libraryKey="antibiotics" value={therapyForm.antibiotic} allowManual placeholder={L("Επιλογή", "Select")} onChange={(v) => setTherapyForm((x) => ({ ...x, antibiotic: v, isPromoted: x.isPromoted || PROMOTED_ANTIBIOTIC_DEFAULTS.includes(v) }))} /></Field>
          <Field label={L("Δοσολογία", "Dose")}><Input value={therapyForm.dosage} onChange={(v) => setTherapyForm((x) => ({ ...x, dosage: v }))} placeholder={L("π.χ. 1 g", "e.g. 1 g")} /></Field>
          <Field label={L("Συχνότητα", "Frequency")}><Input value={therapyForm.frequency} onChange={(v) => setTherapyForm((x) => ({ ...x, frequency: v }))} placeholder={L("π.χ. ανά 8 ώρες", "e.g. every 8 hours")} /></Field>
          <Field label={L("Οδός χορήγησης", "Route")}><Select value={therapyForm.route} onChange={(v) => setTherapyForm((x) => ({ ...x, route: v }))}><option value="">{L("Επιλογή", "Select")}</option><option value="Ενδοφλέβια">{L("Ενδοφλέβια", "Intravenous")}</option><option value="Από το στόμα">{L("Από το στόμα", "Oral")}</option><option value="Ενδομυϊκά">{L("Ενδομυϊκά", "Intramuscular")}</option><option value="Τοπικά">{L("Τοπικά", "Topical")}</option><option value="Άλλη">{L("Άλλη", "Other")}</option></Select></Field>
          <Field label={L("Έναρξη", "Start")}><Input type="date" value={therapyForm.startDate} onChange={(v) => setTherapyForm((x) => ({ ...x, startDate: v }))} /></Field>
          <Field label={L("Λήξη", "End")}><Input type="date" value={therapyForm.endDate} onChange={(v) => setTherapyForm((x) => ({ ...x, endDate: v }))} /></Field>
          <Field label={L("Προωθημένο / περιορισμένης χρήσης", "Restricted / controlled use")}><label className="pw-check pw-check-inline pw-check-compact"><input type="checkbox" checked={Boolean(therapyForm.isPromoted)} onChange={(e) => setTherapyForm((x) => ({ ...x, isPromoted: e.target.checked }))} /><span>{L("Ναι", "Yes")}</span></label></Field>
          {therapyForm.isPromoted && <>
            <Field label={L("Κατάσταση έγκρισης", "Approval status")}><Select disabled value={therapyForm.approval}>{PROMOTED_APPROVAL_OPTIONS.map((x) => <option key={x} value={x}>{patientDisplayValue(x, language)}</option>)}</Select></Field>
            <Field label={L("Εγκρίνων ιατρός", "Approving physician")}><Input disabled value={therapyForm.approvalDoctor} onChange={() => {}} placeholder={L("Συμπληρώνεται από την έγκριση", "Filled from approval")} /></Field>
            <Field label={L("Ημερομηνία έγκρισης", "Approval date")}><Input disabled type="date" value={therapyForm.approvalDate} onChange={() => {}} /></Field>
            <Field label={L("Σημειώσεις έγκρισης", "Approval notes")} wide><textarea disabled value={therapyForm.approvalNotes || ''} readOnly /></Field>
          </>}
          <Field label={L("Ένδειξη", "Indication")} wide><Input value={therapyForm.indication} onChange={(v) => setTherapyForm((x) => ({ ...x, indication: v }))} /></Field>
          <Field label={L("Σχόλια αντιβιογράμματος", "Antibiogram notes")} wide><textarea value={therapyForm.antibiogramNotes || ''} onChange={(e) => setTherapyForm((x) => ({ ...x, antibiogramNotes: e.target.value }))} /></Field>
        </div>
        <AttachmentTools files={filesFor('treatment', therapyForm.id)} upload={() => upload({ step: 'treatment', recordId: therapyForm.id })} deleteAttachment={deleteAttachment} />
        <FormActions onCancel={() => setTherapyForm(null)} />
      </form>}
      {!therapies.length ? <EmptyState icon={<Pill size={24} />} title={L("Δεν υπάρχει αντιμικροβιακή αγωγή", "No antimicrobial therapy")} text={patientClinicalCopy("therapyEmpty", language)} /> : <div className="pw-record-list compact">{therapies.map((item) => <div key={item.id} className={`pw-record-row ${!readOnly ? 'is-clickable' : ''}`} role={!readOnly ? "button" : undefined} tabIndex={!readOnly ? 0 : undefined} onClick={() => !readOnly && beginTherapy(item)}><div className="pw-record-icon"><Pill size={17} /></div><div className="pw-record-copy"><b>{item.antibiotic}</b><span>{[item.dosage, item.frequency, patientDisplayValue(item.route, language)].filter(Boolean).join(' · ') || 'Χωρίς στοιχεία δοσολογίας'}{item.startDate ? ` · ${formatDate(item.startDate)}` : ''}{item.endDate ? ` – ${formatDate(item.endDate)}` : ''}</span></div><div className="pw-record-badges">{item.isPromoted && <Badge tone={item.approval === 'Εγκρίθηκε' ? 'success' : item.approval === 'Απορρίφθηκε' ? 'danger' : 'warning'}>Προωθημένο · {patientDisplayValue(item.approval || 'Εκκρεμεί', language)}</Badge>}<Badge tone={item.endDate && item.endDate < today() ? 'neutral' : 'success'}>{item.endDate && item.endDate < today() ? 'Ολοκληρωμένη' : 'Ενεργή'}</Badge></div><div className="pw-icon-actions" onClick={(e) => e.stopPropagation()}>{!readOnly && <><IconButton label={L("Επισύναψη", "Attach")} icon={<Paperclip size={15} />} onClick={() => upload({ step: 'treatment', recordId: item.id })} /><IconButton danger label={L("Διαγραφή", "Delete")} icon={<Trash2 size={15} />} onClick={() => removeTherapy(item.id)} /></>}</div></div>)}</div>}
    </section>
    <section className="pw-care-card"><SectionHeader eyebrow={L("ΑΠΟΜΟΝΩΣΗ", "ISOLATION")} title={L("Μέτρα προφύλαξης", "Precaution measures")} actions={!readOnly ? <Button size="sm" icon={<Plus size={15} />} onClick={() => setIsolationForm({ ...EMPTY_ISOLATION, startDate: today() })}>{L('Νέα απομόνωση', 'New isolation')}</Button> : null} />{isolationForm && !readOnly && <IsolationEditor form={isolationForm} setForm={setIsolationForm} save={saveIsolation} cancel={() => setIsolationForm(null)} files={isolationForm?.id ? filesFor('isolation', isolationForm.id) : []} upload={isolationForm?.id ? () => upload({ step: 'isolation', recordId: isolationForm.id }) : undefined} deleteAttachment={deleteAttachment} />}{isolations.length === 0 ? <EmptyState icon={<ShieldAlert size={24} />} title={L("Δεν υπάρχει απομόνωση", "No isolation")} text={L("Καταχωρίστε μέτρα μόνο όταν απαιτούνται.", "Record isolation precautions only when required.")} /> : <div className="pw-record-list compact">{isolations.map((item) => <div key={item.id} className={`pw-record-row ${!readOnly ? 'is-clickable' : ''}`} role={!readOnly ? "button" : undefined} tabIndex={!readOnly ? 0 : undefined} onClick={() => !readOnly && setIsolationForm({ ...item })}><div className="pw-record-icon"><ShieldAlert size={17} /></div><div className="pw-record-copy"><b>{patientDisplayValue(item.isolationType || 'Απομόνωση', language)}</b><span>{formatDate(item.startDate)}{item.endDate ? ` – ${formatDate(item.endDate)}` : ''}{item.pathogen ? ` · ${item.pathogen}` : ''}</span></div><Badge tone={(item.status === 'Ακυρωμένη' ? 'Ακυρωμένη' : (item.endDate && item.endDate < today() ? 'Ολοκληρωμένη' : 'Ενεργή')) === 'Ενεργή' ? 'danger' : 'neutral'}>{patientDisplayValue(item.status === 'Ακυρωμένη' ? 'Ακυρωμένη' : (item.endDate && item.endDate < today() ? 'Ολοκληρωμένη' : 'Ενεργή'), language)}</Badge><div className="pw-icon-actions" onClick={(e) => e.stopPropagation()}>{!readOnly && <><IconButton label={L("Επισύναψη", "Attach")} icon={<Paperclip size={15} />} onClick={() => upload({ step: 'isolation', recordId: item.id })} /><IconButton danger label={L("Διαγραφή", "Delete")} icon={<Trash2 size={15} />} onClick={() => removeIsolation(item.id)} /></>}</div></div>)}</div>}</section>
    <section className="pw-care-card"><SectionHeader eyebrow={L("ΕΠΑΝΕΚΤΙΜΗΣΗ & ΕΚΒΑΣΗ", "REASSESSMENT & OUTCOME")} title={L("Κλινική πορεία", "Clinical course")} actions={<AttachmentTools readOnly={readOnly} files={filesFor('review')} upload={() => upload({ step: 'review' })} deleteAttachment={deleteAttachment} />} /><div className="pw-form-grid compact"><Field label={L("Ημερομηνία", "Date")}><Input disabled={readOnly} type="date" value={data.review?.date} onChange={(v) => patchNested('review', { date: v })} /></Field><Field label={L("Έκβαση", "Outcome")}><Select disabled={readOnly} value={data.review?.outcome} onChange={(v) => patchNested('review', { outcome: v })}><option value="">{L("Επιλογή", "Select")}</option><option>Ίαση / αρνητικοποίηση</option><option>Κλινική βελτίωση</option><option>Επιμονή</option><option>Υποτροπή</option><option>Επαναλοίμωξη</option><option>Νέο παθογόνο</option></Select></Field><Field label={L("Παρατηρήσεις", "Notes")} wide><textarea disabled={readOnly} value={data.review?.notes || ''} onChange={(e) => patchNested('review', { notes: e.target.value })} /></Field></div>{!readOnly && <FormActions showPrimary={false} extraActions={<Button variant="secondary" onClick={() => closeEpisode?.()}>{L("Κλείσιμο επιτήρησης", "Close surveillance")}</Button>} />}</section>
  </div>
}
