import { useEffect } from 'react'
import Drawer from '../../components/core/Drawer/Drawer'
import Form from '../../components/core/Form/Form'
import FormGrid from '../../components/core/FormGrid/FormGrid'
import FormSection from '../../components/core/FormSection/FormSection'
import FormActions from '../../components/core/FormActions/FormActions'
import { DateField, NumberField, SelectField, TextField, TimeField } from '../../components/core/fields/Fields'
import { numberRange, required, useCoreForm } from '../../core/forms'
import './NewPatientDrawer.css'
import { useI18n } from '../../i18n'

const initialPatient = {
  firstName: '',
  lastName: '',
  fatherName: '',
  gender: '',
  age: '',
  fullName: '',
  patientCode: '',
  amka: '',
  status: 'Νοσηλεύεται',
  department: '',
  room: '',
  admissionDate: '',
  admissionTime: '',
  daysInHospital: 0,
  primaryDiagnosis: '',
  positiveCulture: false,
  mdr: false,
  isolation: false,
}

export default function NewPatientDrawer({ open, onClose, onSave, departments = [] }) {
  const { language, t } = useI18n()
  const patientForm = useCoreForm({
    initialValues: initialPatient,
    validationSchema: {
      firstName: required(t('patients.form.validation.firstName', "Συμπληρώστε όνομα.")),
      lastName: required(t('patients.form.validation.lastName', "Συμπληρώστε επώνυμο.")),
      patientCode: required(t('patients.form.validation.patientCode', "Συμπληρώστε κωδικό ασθενούς.")),
      age: numberRange({ min: 0, max: 130, message: t('patients.form.validation.age', "Η ηλικία πρέπει να είναι από 0 έως 130.") }),
    },
    transform: (form) => ({
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      fatherName: form.fatherName.trim(),
      fullName: [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(' '),
      age: form.age === '' ? '' : Number(form.age),
      patientCode: form.patientCode.trim(),
      amka: form.amka.trim(),
      daysInHospital: Number(form.daysInHospital) || 0,
    }),
    onSubmit: (payload) => onSave?.(payload),
  })
  const { values: form, errors, isDirty, setFieldValue: update, reset, submit } = patientForm

  useEffect(() => {
    if (open) reset(initialPatient)
  }, [open, reset])

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('patients.newPatient', "Νέος ασθενής")}
      description={t('patients.form.description', "Δημιουργία εγγραφής στο μητρώο ασθενών")}
      width="760px"
      footer={<FormActions onCancel={onClose} form="new-patient-form" sticky={false} />}
    >
      <Form id="new-patient-form" className="new-patient-form" onSubmit={submit} onCancel={onClose} isDirty={isDirty}>
        <FormSection title={t('patients.form.basic', "Βασικά στοιχεία")}>
          <FormGrid columns={2}>
            <TextField label={t('patients.form.firstName', "Όνομα")} value={form.firstName} onChange={(event) => update('firstName', event.target.value)} error={errors.firstName} required />
            <TextField label={t('patients.form.lastName', "Επώνυμο")} value={form.lastName} onChange={(event) => update('lastName', event.target.value)} error={errors.lastName} required />
            <TextField label={t('patients.form.fatherName', "Πατρώνυμο")} value={form.fatherName} onChange={(event) => update('fatherName', event.target.value)} />
            <SelectField label={t('patients.form.gender', "Φύλο")} value={form.gender} onChange={(event) => update('gender', event.target.value)} placeholder={t('common.select', "Επιλέξτε")}
              options={[
                { value: 'Άνδρας', label: language === 'en' ? 'Male' : 'Άνδρας' },
                { value: 'Γυναίκα', label: language === 'en' ? 'Female' : 'Γυναίκα' },
                { value: 'Άλλο / μη δηλωμένο', label: language === 'en' ? 'Other / not specified' : 'Άλλο / μη δηλωμένο' },
              ]} />
            <NumberField label={t('patients.form.age', "Ηλικία")} min="0" max="130" value={form.age} onChange={(event) => update('age', event.target.value)} error={errors.age} />
            <TextField
              label={t('patients.form.patientCode', "Κωδικός ασθενούς")}
              value={form.patientCode}
              onChange={(event) => update('patientCode', event.target.value)}
              error={errors.patientCode}
              required
            />
            <TextField label={t('patients.amka', "ΑΜΚΑ")} value={form.amka} onChange={(event) => update('amka', event.target.value)} />
            <SelectField
              label={t('patients.status', "Κατάσταση")}
              value={form.status}
              onChange={(event) => update('status', event.target.value)}
              options={[
                { value: 'Νοσηλεύεται', label: language === 'en' ? 'Inpatient' : 'Νοσηλεύεται' },
                { value: 'Εξιτήριο', label: language === 'en' ? 'Discharged' : 'Εξιτήριο' },
              ]}
              placeholder={null}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={t('patients.form.hospitalization', "Νοσηλεία")}>
          <FormGrid columns={2}>
            <SelectField
              label={t('patients.department', "Τμήμα")}
              value={form.department}
              onChange={(event) => update('department', event.target.value)}
              options={departments}
              placeholder={t('common.select', "Επιλέξτε")}
            />
            <TextField label={t('patients.room', "Θάλαμος / Κλίνη")} value={form.room} onChange={(event) => update('room', event.target.value)} />
            <DateField label={t('patients.form.admissionDate', "Ημερομηνία εισαγωγής")} value={form.admissionDate} onChange={(event) => update('admissionDate', event.target.value)} />
            <TimeField label={t('patients.form.admissionTime', "Ώρα εισαγωγής")} value={form.admissionTime} onChange={(event) => update('admissionTime', event.target.value)} />
            <NumberField label={t('patients.form.daysInHospital', "Ημέρες νοσηλείας")} min="0" value={form.daysInHospital} onChange={(event) => update('daysInHospital', event.target.value)} />
          </FormGrid>
        </FormSection>

        <FormSection title={t('patients.form.clinicalInfo', "Κλινική πληροφορία")}>
          <TextField label={t('patients.diagnosis', "Κύρια διάγνωση")} value={form.primaryDiagnosis} onChange={(event) => update('primaryDiagnosis', event.target.value)} fullWidth />
        </FormSection>
      </Form>
    </Drawer>
  )
}
