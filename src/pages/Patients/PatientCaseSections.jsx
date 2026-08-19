import { useI18n } from '../../i18n'
import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useState } from 'react'
import { Activity, FlaskConical, Paperclip, Pill, Plus, RefreshCcw, ShieldAlert, Trash2 } from 'lucide-react'
import Button from '../../components/core/Button/Button'
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

export function AssessmentPanel({ readOnly = false, data, patch, patchNested, focusedRecord, files, upload, deleteAttachment }) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const devices = getDeviceRecords(data)
  const [deviceForm, setDeviceForm] = useState(null)
  useEffect(() => {
    if (focusedRecord?.type !== 'device' || !focusedRecord.id) return
    const target = devices.find((item) => String(item.id) === String(focusedRecord.id))
    if (target) setDeviceForm({ ...target })
  }, [focusedRecord?.type, focusedRecord?.id])
  async function saveDevice(event) {
    event.preventDefault()
    if (readOnly) return
    if (!deviceForm?.type) {
      notifyAction(L('Επιλέξτε ή καταχωρίστε συσκευή.', 'Select or enter a device.'))
      return
    }
    const savedDevice = { ...deviceForm }
    const next = devices.some((item) => String(item.id) === String(savedDevice.id))
      ? devices.map((item) => String(item.id) === String(savedDevice.id) ? savedDevice : item)
      : [...devices, savedDevice]
    try {
      if (savedDevice.customDevice) await upsertMasterItemAsync('devices', { name: savedDevice.type })
      await patch({ deviceRecords: next, questionnaire: { ...(data.questionnaire || {}), devices: next.map((item) => item.type) } })
      // Collapse only the inline device editor after persistence succeeds.
      // The clinical-assessment workspace itself remains open.
      setDeviceForm(null)
    } catch (error) {
      notifyAction(L('Η συσκευή δεν αποθηκεύτηκε. Δοκιμάστε ξανά.', 'The device was not saved. Please try again.'))
    }
  }
  function removeDevice(id) {
    if (readOnly) return
    if (!confirmAction('Να διαγραφεί η συσκευή;')) return
    const next = devices.filter((item) => String(item.id) !== String(id))
    patch({ deviceRecords: next, questionnaire: { ...(data.questionnaire || {}), devices: next.map((item) => item.type) } })
  }
  return <div className="pw-form-page"><SectionHeader eyebrow={L("ΚΛΙΝΙΚΗ ΑΞΙΟΛΟΓΗΣΗ", "CLINICAL ASSESSMENT")} title={L("Αρχική εικόνα περιστατικού", "Initial clinical picture")} text={patientClinicalCopy("assessmentIntro", language)} actions={<AttachmentTools readOnly={readOnly} files={files} upload={upload} deleteAttachment={deleteAttachment} />} />
    <div className="pw-form-grid">
      <Field label={L("Λόγος επιτήρησης", "Surveillance reason")}><Select disabled={readOnly} value={data.reason} onChange={(v) => patch({ reason: v })}><option value="">{L("Επιλογή", "Select")}</option>{masterNames('surveillance-reasons').map((x) => <option key={x} value={x}>{patientDisplayValue(x, language)}</option>)}</Select></Field>
      <Field label={L("Ημερομηνία έναρξης", "Start date")}><Input disabled={readOnly} type="date" value={data.startDate} onChange={(v) => patch({ startDate: v })} /></Field>
      <Field label={L("Έναρξη συμπτωμάτων", "Symptom onset")}><Input disabled={readOnly} type="date" value={data.assessment?.symptomOnsetDate} onChange={(v) => patchNested('assessment', { symptomOnsetDate: v })} /></Field>
      <Field label={L("Κλινική ταξινόμηση", "Clinical classification")}><Select disabled={readOnly} value={data.assessment?.classification} onChange={(v) => patchNested('assessment', { classification: v })}><option value="">{L("Επιλογή", "Select")}</option>{CLINICAL_ASSESSMENT_OPTIONS.map((x) => <option key={x} value={x}>{patientDisplayValue(x, language)}</option>)}</Select></Field>
      <Field label={L("Εστία / τύπος λοίμωξης", "Infection site / type")}><Select disabled={readOnly} value={data.assessment?.infectionSite} onChange={(v) => patchNested('assessment', { infectionSite: v })}><option value="">{L("Επιλογή", "Select")}</option>{masterNames('infection-sites').map((x) => <option key={x} value={x}>{patientDisplayValue(x, language)}</option>)}</Select></Field>
      <Field label={L("Θερμοκρασία (°C)", "Temperature (°C)")}><Input disabled={readOnly} type="number" step="0.1" value={data.assessment?.temperature} onChange={(v) => patchNested('assessment', { temperature: v })} /></Field>
      <Field label="CRP"><Input disabled={readOnly} value={data.assessment?.crp} onChange={(v) => patchNested('assessment', { crp: v })} placeholder={L("π.χ. mg/L", "e.g. mg/L")} /></Field>
      <Field label="PCT"><Input disabled={readOnly} value={data.assessment?.pct} onChange={(v) => patchNested('assessment', { pct: v })} placeholder={L("π.χ. ng/mL", "e.g. ng/mL")} /></Field>
      <Field label={L("Συμπτώματα", "Symptoms")} wide><MultiSelect disabled={readOnly} value={data.questionnaire?.symptoms} options={masterNames('symptoms')} getOptionLabel={(value) => patientDisplayValue(value, language)} onChange={(v) => patchNested('questionnaire', { symptoms: v })} emptyLabel={L("Χωρίς καταχωρημένα συμπτώματα", "No symptoms recorded")} allowCustom customLabel={L("Προσθήκη συμπτώματος", "Add symptom")} onAddCustom={(name) => upsertMasterItemAsync('symptoms', { name })} /></Field>
      <Field label={L("Παράγοντες κινδύνου", "Risk factors")} wide><MultiSelect disabled={readOnly} value={data.questionnaire?.riskFactors} options={masterNames('risk-factors')} getOptionLabel={(value) => patientDisplayValue(value, language)} onChange={(v) => patchNested('questionnaire', { riskFactors: v })} emptyLabel={L("Κανένας καταχωρημένος παράγοντας", "No risk factors recorded")} allowCustom customLabel={L("Προσθήκη παράγοντα", "Add risk factor")} onAddCustom={(name) => upsertMasterItemAsync('risk-factors', { name })} /></Field>
      <Field label={L("Πρόσφατη επέμβαση", "Recent surgery")}><Select disabled={readOnly} value={data.questionnaire?.surgery} onChange={(v) => patchNested('questionnaire', { surgery: v })}><option value="">{L("Επιλογή", "Select")}</option><option value="Όχι">{L("Όχι", "No")}</option><option value="Ναι, εντός 30 ημερών">{L("Ναι, εντός 30 ημερών", "Yes, within 30 days")}</option><option value="Ναι, εντός 90 ημερών">{L("Ναι, εντός 90 ημερών", "Yes, within 90 days")}</option></Select></Field>
      <Field label={L("Κλινικές παρατηρήσεις", "Clinical notes")} wide><textarea disabled={readOnly} value={data.questionnaire?.notes || ''} onChange={(e) => patchNested('questionnaire', { notes: e.target.value })} /></Field>
    </div>
    <section className="pw-inline-section">
      <SectionHeader eyebrow={L("ΣΥΣΚΕΥΕΣ", "DEVICES")} title={L("Συσκευές / καθετήρες", "Devices / catheters")} text={patientClinicalCopy("devicesIntro", language)} actions={!readOnly ? <Button size="sm" icon={<Plus size={15} />} onClick={() => setDeviceForm({ id: `DEV-${Date.now()}`, type: '', startDate: today(), endDate: '', related: 'Όχι', notes: '' })}>{L('Νέα συσκευή', 'New device')}</Button> : null} />
      {deviceForm && !readOnly && <form className="pw-editor compact" onSubmit={saveDevice}><div className="pw-form-grid compact">
        <Field label={L("Συσκευή", "Device")}><Select value={masterNames('devices').includes(deviceForm.type) ? deviceForm.type : (deviceForm.type ? '__custom__' : '')} onChange={(v) => setDeviceForm((x) => ({ ...x, type: v === '__custom__' ? '' : v, customDevice: v === '__custom__' }))}><option value="">{L("Επιλογή", "Select")}</option>{masterNames('devices').map((x) => <option key={x} value={x}>{patientDisplayValue(x, language)}</option>)}<option value="__custom__">{L("Άλλη συσκευή…", "Other device…")}</option></Select></Field>
        {(deviceForm.customDevice || (deviceForm.type && !masterNames('devices').includes(deviceForm.type))) && <Field label={L("Άλλη συσκευή", "Other device")}><Input value={deviceForm.type} onChange={(v) => setDeviceForm((x) => ({ ...x, type: v, customDevice: true }))} placeholder={L("Πληκτρολογήστε συσκευή", "Enter device")} /></Field>}
        <Field label={L("Έναρξη", "Start")}><Input type="date" value={deviceForm.startDate} onChange={(v) => setDeviceForm((x) => ({ ...x, startDate: v }))} /></Field>
        <Field label={L("Λήξη", "End")}><Input type="date" value={deviceForm.endDate} onChange={(v) => setDeviceForm((x) => ({ ...x, endDate: v }))} /></Field>
        <Field label={L("Συσχέτιση με λοίμωξη", "Association with infection")}><Select value={deviceForm.related} onChange={(v) => setDeviceForm((x) => ({ ...x, related: v }))}><option value="Όχι">{L("Όχι", "No")}</option><option value="Πιθανή">{L("Πιθανή", "Possible")}</option><option value="Επιβεβαιωμένη">{L("Επιβεβαιωμένη", "Confirmed")}</option></Select></Field>
        <Field label={L("Σημειώσεις", "Notes")} wide><Input value={deviceForm.notes} onChange={(v) => setDeviceForm((x) => ({ ...x, notes: v }))} /></Field>
      </div><div className="pw-form-actions"><Button type="button" variant="secondary" onClick={() => setDeviceForm(null)}>{L('Ακύρωση', 'Cancel')}</Button><Button type="submit">{L('Αποθήκευση', 'Save')}</Button></div></form>}
      {!devices.length ? <EmptyState icon={<Activity size={22} />} title={L("Δεν υπάρχουν συσκευές", "No devices")} text={patientClinicalCopy("devicesEmpty", language)} /> : <div className="pw-record-list compact">{devices.map((item) => <div key={item.id} className="pw-record-row" onClick={() => !readOnly && setDeviceForm({ ...item })}><div className="pw-record-icon"><Activity size={16} /></div><div className="pw-record-copy"><b>{patientDisplayValue(item.type, language)}</b><span>{formatDate(item.startDate)}{item.endDate ? ` – ${formatDate(item.endDate)}` : ' – ενεργή'} · {L('Συσχέτιση', 'Association')}: {patientDisplayValue(item.related || 'Όχι', language)}</span></div><Badge tone={item.endDate ? 'neutral' : 'success'}>{patientDisplayValue(item.endDate ? 'Ολοκληρωμένη' : 'Ενεργή', language)}</Badge><div className="pw-icon-actions" onClick={(e) => e.stopPropagation()}>{!readOnly && <IconButton danger label={L("Διαγραφή", "Delete")} icon={<Trash2 size={15} />} onClick={() => removeDevice(item.id)} />}</div></div>)}</div>}
    </section>
    {!readOnly && <div className="pw-save-bar"><label className="pw-check"><input type="checkbox" checked={Boolean(data.questionnaire?.completed)} onChange={(e) => patchNested('questionnaire', { completed: e.target.checked })} /> {L("Η αξιολόγηση ολοκληρώθηκε", "Assessment completed")}</label><Button onClick={() => patch({ updatedAt: new Date().toISOString() })}>{L('Αποθήκευση', 'Save')}</Button></div>}
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
        actions={!readOnly ? <Button size="sm" icon={<Plus size={15} />} onClick={() => beginTherapy()}>{L('Νέο αντιβιοτικό', 'New antimicrobial')}</Button> : null}
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
        <div className="pw-form-actions"><Button variant="secondary" type="button" onClick={() => setTherapyForm(null)}>{L('Ακύρωση', 'Cancel')}</Button><Button type="submit">{L('Αποθήκευση', 'Save')}</Button></div>
      </form>}
      {!therapies.length ? <EmptyState icon={<Pill size={24} />} title={L("Δεν υπάρχει αντιμικροβιακή αγωγή", "No antimicrobial therapy")} text={patientClinicalCopy("therapyEmpty", language)} /> : <div className="pw-record-list compact">{therapies.map((item) => <div key={item.id} className={`pw-record-row ${!readOnly ? 'is-clickable' : ''}`} role={!readOnly ? "button" : undefined} tabIndex={!readOnly ? 0 : undefined} onClick={() => !readOnly && beginTherapy(item)}><div className="pw-record-icon"><Pill size={17} /></div><div className="pw-record-copy"><b>{item.antibiotic}</b><span>{[item.dosage, item.frequency, patientDisplayValue(item.route, language)].filter(Boolean).join(' · ') || 'Χωρίς στοιχεία δοσολογίας'}{item.startDate ? ` · ${formatDate(item.startDate)}` : ''}{item.endDate ? ` – ${formatDate(item.endDate)}` : ''}</span></div><div className="pw-record-badges">{item.isPromoted && <Badge tone={item.approval === 'Εγκρίθηκε' ? 'success' : item.approval === 'Απορρίφθηκε' ? 'danger' : 'warning'}>Προωθημένο · {patientDisplayValue(item.approval || 'Εκκρεμεί', language)}</Badge>}<Badge tone={item.endDate && item.endDate < today() ? 'neutral' : 'success'}>{item.endDate && item.endDate < today() ? 'Ολοκληρωμένη' : 'Ενεργή'}</Badge></div><div className="pw-icon-actions" onClick={(e) => e.stopPropagation()}>{!readOnly && <><IconButton label={L("Επισύναψη", "Attach")} icon={<Paperclip size={15} />} onClick={() => upload({ step: 'treatment', recordId: item.id })} /><IconButton danger label={L("Διαγραφή", "Delete")} icon={<Trash2 size={15} />} onClick={() => removeTherapy(item.id)} /></>}</div></div>)}</div>}
    </section>
    <section className="pw-care-card"><SectionHeader eyebrow={L("ΑΠΟΜΟΝΩΣΗ", "ISOLATION")} title={L("Μέτρα προφύλαξης", "Precaution measures")} actions={!readOnly ? <Button size="sm" icon={<Plus size={15} />} onClick={() => setIsolationForm({ ...EMPTY_ISOLATION, startDate: today() })}>{L('Νέα απομόνωση', 'New isolation')}</Button> : null} />{isolationForm && !readOnly && <IsolationEditor form={isolationForm} setForm={setIsolationForm} save={saveIsolation} cancel={() => setIsolationForm(null)} />}{isolations.length === 0 ? <EmptyState icon={<ShieldAlert size={24} />} title={L("Δεν υπάρχει απομόνωση", "No isolation")} text={L("Καταχωρίστε μέτρα μόνο όταν απαιτούνται.", "Record isolation precautions only when required.")} /> : <div className="pw-record-list compact">{isolations.map((item) => <div key={item.id} className={`pw-record-row ${!readOnly ? 'is-clickable' : ''}`} role={!readOnly ? "button" : undefined} tabIndex={!readOnly ? 0 : undefined} onClick={() => !readOnly && setIsolationForm({ ...item })}><div className="pw-record-icon"><ShieldAlert size={17} /></div><div className="pw-record-copy"><b>{patientDisplayValue(item.isolationType || 'Απομόνωση', language)}</b><span>{formatDate(item.startDate)}{item.endDate ? ` – ${formatDate(item.endDate)}` : ''}{item.pathogen ? ` · ${item.pathogen}` : ''}</span></div><Badge tone={item.status === 'Ενεργή' ? 'danger' : 'neutral'}>{patientDisplayValue(item.status || 'Ενεργή', language)}</Badge><div className="pw-icon-actions" onClick={(e) => e.stopPropagation()}>{!readOnly && <><IconButton label={L("Επισύναψη", "Attach")} icon={<Paperclip size={15} />} onClick={() => upload({ step: 'isolation', recordId: item.id })} /><IconButton danger label={L("Διαγραφή", "Delete")} icon={<Trash2 size={15} />} onClick={() => removeIsolation(item.id)} /></>}</div></div>)}</div>}</section>
    <section className="pw-care-card"><SectionHeader eyebrow={L("ΕΠΑΝΕΚΤΙΜΗΣΗ & ΕΚΒΑΣΗ", "REASSESSMENT & OUTCOME")} title={L("Κλινική πορεία", "Clinical course")} actions={<AttachmentTools readOnly={readOnly} files={filesFor('review')} upload={() => upload({ step: 'review' })} deleteAttachment={deleteAttachment} />} /><div className="pw-form-grid compact"><Field label={L("Ημερομηνία", "Date")}><Input disabled={readOnly} type="date" value={data.review?.date} onChange={(v) => patchNested('review', { date: v })} /></Field><Field label={L("Έκβαση", "Outcome")}><Select disabled={readOnly} value={data.review?.outcome} onChange={(v) => patchNested('review', { outcome: v })}><option value="">{L("Επιλογή", "Select")}</option><option>Ίαση / αρνητικοποίηση</option><option>Κλινική βελτίωση</option><option>Επιμονή</option><option>Υποτροπή</option><option>Επαναλοίμωξη</option><option>Νέο παθογόνο</option></Select></Field><Field label={L("Παρατηρήσεις", "Notes")} wide><textarea disabled={readOnly} value={data.review?.notes || ''} onChange={(e) => patchNested('review', { notes: e.target.value })} /></Field></div>{!readOnly && <div className="pw-form-actions"><Button variant="secondary" onClick={() => closeEpisode?.()}>{L("Κλείσιμο επιτήρησης", "Close surveillance")}</Button></div>}</section>
  </div>
}
