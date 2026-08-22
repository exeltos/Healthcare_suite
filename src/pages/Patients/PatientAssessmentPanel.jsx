import { useEffect, useState } from 'react'
import { Activity, Plus, Trash2 } from 'lucide-react'
import { useI18n } from '../../i18n'
import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import Button from '../../components/core/Button/Button'
import FormActions from '../../components/core/FormActions/FormActions'
import Badge from '../../components/core/Badge/Badge'
import MultiSelect from '../../components/core/MultiSelect/MultiSelect'
import { CLINICAL_ASSESSMENT_OPTIONS } from '../../core/constants/clinicalOptions'
import { masterNames, upsertMasterItemAsync } from '../../services/masterDataService'
import { formatDate, getDeviceRecords, today } from './patientWorkflowUtils'
import { AttachmentTools, EmptyState, Field, IconButton, Input, SectionHeader, Select } from './PatientWorkflowEditors'
import { patientDisplayValue } from './patientPresentation'
import { patientClinicalCopy } from './patientClinicalCopy'

export function AssessmentPanel({ readOnly = false, data, patch, patchNested, focusedRecord, files, upload, deleteAttachment }) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const devices = getDeviceRecords(data)
  const [deviceForm, setDeviceForm] = useState(null)
  const [temperatureDraft, setTemperatureDraft] = useState(String(data.assessment?.temperature ?? ''))
  useEffect(() => {
    setTemperatureDraft(String(data.assessment?.temperature ?? ''))
  }, [data.assessment?.temperature])
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
      <Field label={L("Θερμοκρασία (°C)", "Temperature (°C)")}><Input
        disabled={readOnly}
        type="number"
        min="30"
        max="45"
        step="0.1"
        value={temperatureDraft}
        onChange={setTemperatureDraft}
        onBlur={async () => {
          const raw=String(temperatureDraft||'').trim()
          if(!raw){
            await patchNested('assessment',{temperature:''})
            return
          }
          const value=Number(raw)
          if(!Number.isFinite(value) || value<30 || value>45){
            notifyAction(L('Η θερμοκρασία πρέπει να είναι μεταξύ 30 και 45 °C.','Temperature must be between 30 and 45 °C.'))
            setTemperatureDraft(String(data.assessment?.temperature ?? ''))
            return
          }
          await patchNested('assessment',{temperature:raw})
        }}
      /></Field>
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
      </div><FormActions onCancel={() => setDeviceForm(null)} /></form>}
      {!devices.length ? <EmptyState icon={<Activity size={22} />} title={L("Δεν υπάρχουν συσκευές", "No devices")} text={patientClinicalCopy("devicesEmpty", language)} /> : <div className="pw-record-list compact">{devices.map((item) => <div key={item.id} className="pw-record-row" onClick={() => !readOnly && setDeviceForm({ ...item })}><div className="pw-record-icon"><Activity size={16} /></div><div className="pw-record-copy"><b>{patientDisplayValue(item.type, language)}</b><span>{formatDate(item.startDate)}{item.endDate ? ` – ${formatDate(item.endDate)}` : ' – ενεργή'} · {L('Συσχέτιση', 'Association')}: {patientDisplayValue(item.related || 'Όχι', language)}</span></div><Badge tone={item.endDate ? 'neutral' : 'success'}>{patientDisplayValue(item.endDate ? 'Ολοκληρωμένη' : 'Ενεργή', language)}</Badge><div className="pw-icon-actions" onClick={(e) => e.stopPropagation()}>{!readOnly && <IconButton danger label={L("Διαγραφή", "Delete")} icon={<Trash2 size={15} />} onClick={() => removeDevice(item.id)} />}</div></div>)}</div>}
    </section>
    {!readOnly && <FormActions primaryType="button" onPrimary={() => patch({ updatedAt: new Date().toISOString() })} extraActions={<label className="pw-check"><input type="checkbox" checked={Boolean(data.questionnaire?.completed)} onChange={(e) => patchNested('questionnaire', { completed: e.target.checked })} /> {L("Η αξιολόγηση ολοκληρώθηκε", "Assessment completed")}</label>} />}
  </div>
}
