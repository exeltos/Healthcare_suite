import { Trash2 } from 'lucide-react'
import { confirmAction } from '../core/feedback/index'
import {
  Alert, Button, CheckboxField, DateField, IconButton, RepeatableList, SelectField, TextAreaField, TextField, TimeField, WorkspaceSectionHeader,
} from '../core'
import LibraryField from '../core/LibraryField/LibraryField'
import PersonLinkSelector from './PersonLinkSelector'
import { LABORATORY_RESISTANCE_OPTIONS, LABORATORY_RESULT_STATUSES } from '../../core/constants/laboratory'
import { useI18n } from '../../i18n'
import { laboratoryDisplayValue, laboratoryOptions } from '../../pages/Laboratory/laboratoryPresentation'

export function LaboratorySourceSection({
  form, setForm,
  patients, patientMode, setPatientMode, selectedPatientId, selectedPatient, choosePatient, newPatient, setNewPatient,
  employees, employeeMode, setEmployeeMode, selectedEmployeeId, selectedEmployee, chooseEmployee, newEmployee, setNewEmployee, createAndLinkEmployee,
  employeeFullName, onSourceChange,
}) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el

  function changeSource(value) {
    setForm((current) => ({
      ...current,
      sourceType: value,
      patientId: value === 'Ασθενής' ? current.patientId : '',
      patientName: value === 'Ασθενής' ? current.patientName : '',
      patientCode: value === 'Ασθενής' ? current.patientCode : '',
      employeeId: value === 'Προσωπικό' ? current.employeeId : '',
      staffName: value === 'Προσωπικό' ? current.staffName : '',
      staffCode: value === 'Προσωπικό' ? current.staffCode : '',
      subjectName: '',
      subjectCode: '',
      department: '',
    }))
    onSourceChange?.(value)
  }

  return <section className="lw-section">
    <WorkspaceSectionHeader
      eyebrow={L('ΠΗΓΗ', 'SOURCE')}
      title={L('Σύνδεση εγγραφής', 'Record source')}
      text={L(
        'Επιλέξτε την πηγή του δείγματος. Μπορείτε να συνδέσετε υπάρχον μητρώο ή να δημιουργήσετε νέο ασθενή / εργαζόμενο.',
        'Select the sample source. Link an existing registry record or create a new patient / staff member.',
      )}
    />
    <div className="lw-grid lw-grid--three">
      <SelectField
        label={L('Πηγή', 'Source')}
        value={form.sourceType}
        options={laboratoryOptions(['Ασθενής', 'Προσωπικό', 'Περιβάλλον', 'Νερό'], language)}
        placeholder={null}
        onChange={(event) => changeSource(event.target.value)}
      />
    </div>

    {form.sourceType === 'Ασθενής' ? <PersonLinkSelector
      ariaLabel={L('Τρόπος σύνδεσης ασθενούς', 'Patient linking mode')}
      existingLabel={L('Επιλογή ασθενούς', 'Select patient')}
      newLabel={L('Νέος ασθενής', 'New patient')}
      fieldLabel={L('Ασθενής', 'Patient')}
      mode={patientMode}
      onModeChange={setPatientMode}
      selectedId={selectedPatientId}
      options={patients.map((patient) => ({
        value: patient.id,
        label: `${patient.lastName || ''} ${patient.firstName || ''}`.trim() || patient.fullName || patient.patientCode,
      }))}
      onSelect={choosePatient}
      summary={[
        { label: L('Κωδικός', 'Code'), value: selectedPatient?.patientCode },
        { label: 'ΑΜΚΑ', value: selectedPatient?.amka },
        { label: L('Τμήμα', 'Department'), value: selectedPatient?.department },
        { label: L('Θάλαμος / Κλίνη', 'Room / Bed'), value: selectedPatient?.room },
      ]}
      showCreateAction={false}
    >
      <div className="lw-grid lw-grid--three">
        <TextField label={L('Επώνυμο *', 'Last name *')} value={newPatient.lastName} onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })} />
        <TextField label={L('Όνομα *', 'First name *')} value={newPatient.firstName} onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })} />
        <TextField label={L('Πατρώνυμο', "Father's name")} value={newPatient.fatherName} onChange={(e) => setNewPatient({ ...newPatient, fatherName: e.target.value })} />
        <SelectField
          label={L('Φύλο', 'Sex')}
          value={newPatient.gender}
          options={laboratoryOptions(['Άνδρας', 'Γυναίκα', 'Άλλο / μη δηλωμένο'], language)}
          onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
        />
        <TextField label={L('Ηλικία', 'Age')} value={newPatient.age} onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })} />
        <TextField label={L("ΑΜΚΑ", "AMKA")} value={newPatient.amka} onChange={(e) => setNewPatient({ ...newPatient, amka: e.target.value })} />
        <TextField
          label={L('Κωδικός ασθενούς', 'Patient code')}
          value={newPatient.patientCode}
          onChange={(e) => setNewPatient({ ...newPatient, patientCode: e.target.value })}
          helpText={L('Αφήστε κενό για αυτόματο κωδικό.', 'Leave blank for an automatic code.')}
        />
        <LibraryField label={L('Τμήμα', 'Department')} libraryKey="departments" value={newPatient.department} onChange={(value) => setNewPatient({ ...newPatient, department: value })} />
        <TextField label={L('Θάλαμος / Κλίνη', 'Room / Bed')} value={newPatient.room} onChange={(e) => setNewPatient({ ...newPatient, room: e.target.value })} />
        <DateField label={L('Ημερομηνία εισαγωγής', 'Admission date')} value={newPatient.admissionDate} onChange={(e) => setNewPatient({ ...newPatient, admissionDate: e.target.value })} />
      </div>
      <p className="lw-inline-save-hint">{L('Ο νέος ασθενής και το δείγμα θα αποθηκευτούν μαζί με το κύριο κουμπί «Αποθήκευση».', 'The new patient and sample will be saved together with the main Save button.')}</p>
    </PersonLinkSelector> : form.sourceType === 'Προσωπικό' ? <PersonLinkSelector
      ariaLabel={L('Τρόπος σύνδεσης εργαζομένου', 'Staff linking mode')}
      existingLabel={L('Επιλογή εργαζομένου', 'Select staff')}
      newLabel={L('Νέος εργαζόμενος', 'New staff member')}
      fieldLabel={L('Εργαζόμενος', 'Staff member')}
      createLabel={L('Δημιουργία & σύνδεση εργαζομένου', 'Create & link staff member')}
      mode={employeeMode}
      onModeChange={setEmployeeMode}
      selectedId={selectedEmployeeId}
      options={employees.map((employee) => ({
        value: employee.id,
        label: `${employeeFullName(employee)}${employee.employeeCode ? ` · ${employee.employeeCode}` : ''}`,
      }))}
      onSelect={chooseEmployee}
      summary={[
        { label: L('Κωδικός', 'Code'), value: selectedEmployee?.employeeCode || form.staffCode },
        { label: L('Ιδιότητα', 'Professional category'), value: selectedEmployee?.professionalCategory },
        { label: L('Τμήμα', 'Department'), value: selectedEmployee?.department || form.department },
        { label: L('Κατάσταση', 'Status'), value: laboratoryDisplayValue(selectedEmployee?.status, language) },
      ]}
      onCreate={createAndLinkEmployee}
    >
      <div className="lw-grid lw-grid--three">
        <TextField label={L('Επώνυμο *', 'Last name *')} value={newEmployee.lastName} onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })} />
        <TextField label={L('Όνομα *', 'First name *')} value={newEmployee.firstName} onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })} />
        <TextField label={L('Πατρώνυμο', "Father's name")} value={newEmployee.fatherName} onChange={(e) => setNewEmployee({ ...newEmployee, fatherName: e.target.value })} />
        <TextField
          label={L('Κωδικός εργαζομένου', 'Staff code')}
          value={newEmployee.employeeCode}
          onChange={(e) => setNewEmployee({ ...newEmployee, employeeCode: e.target.value })}
          helpText={L('Αφήστε κενό για αυτόματο κωδικό.', 'Leave blank for an automatic code.')}
        />
        <LibraryField label={L('Ιδιότητα', 'Professional category')} libraryKey="professional-categories" value={newEmployee.professionalCategory} onChange={(value) => setNewEmployee({ ...newEmployee, professionalCategory: value })} />
        <LibraryField label={L('Τμήμα', 'Department')} libraryKey="departments" value={newEmployee.department} onChange={(value) => setNewEmployee({ ...newEmployee, department: value })} />
        <TextField label="Email" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} />
        <TextField label={L('Τηλέφωνο', 'Phone')} value={newEmployee.phone} onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })} />
        <SelectField
          label={L('Κατάσταση', 'Status')}
          value={newEmployee.status}
          options={laboratoryOptions(['Ενεργό', 'Ανενεργό'], language)}
          placeholder={null}
          onChange={(e) => setNewEmployee({ ...newEmployee, status: e.target.value })}
        />
      </div>
    </PersonLinkSelector> : <div className="lw-grid lw-grid--three lw-source-fields">
      <TextField label={L('Αφορά', 'Subject')} value={form.subjectName} onChange={(e) => setForm({ ...form, subjectName: e.target.value })} />
      <TextField label={L('Κωδικός', 'Code')} value={form.subjectCode} onChange={(e) => setForm({ ...form, subjectCode: e.target.value })} />
      <LibraryField label={L('Τμήμα', 'Department')} libraryKey="departments" value={form.department} onChange={(value) => setForm({ ...form, department: value })} />
    </div>}
  </section>
}

export function LaboratorySampleSection({ form, setForm, isNew, patientSampleOptions = [] }) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el

  return <section className="lw-section">
    <WorkspaceSectionHeader
      eyebrow={L('ΔΕΙΓΜΑ', 'SAMPLE')}
      title={L('Στοιχεία λήψης', 'Collection details')}
      text={L('Βασικά στοιχεία δείγματος και παραλαβής στο εργαστήριο.', 'Core sample collection and laboratory receipt details.')}
    />
    <div className="lw-grid lw-grid--three">
      {!isNew ? <TextField label={L('Πηγή', 'Source')} disabled value={laboratoryDisplayValue(form.sourceType, language) || ''} /> : null}
      {!isNew ? <TextField
        label={form.sourceType === 'Προσωπικό' ? L('Εργαζόμενος', 'Staff member') : form.sourceType === 'Ασθενής' ? L('Ασθενής', 'Patient') : L('Σημείο / πηγή', 'Site / source')}
        disabled
        value={form.subjectName || ''}
      /> : null}
      <LibraryField
        label={L('Είδος δείγματος', 'Sample type')}
        libraryKey="sample-types"
        category={form.sourceType}
        value={form.sampleType}
        allowManual
        getOptionLabel={(item) => laboratoryDisplayValue(item.name, language)}
        onChange={(value) => setForm({ ...form, sampleType: value })}
      />
      <SelectField
        label={L('Λόγος δείγματος', 'Sample reason')}
        value={form.sampleReason}
        options={laboratoryOptions(['Καλλιέργεια', 'Screening', 'Επανέλεγχος', 'Άλλο'], language)}
        onChange={(e) => {
          const sampleReason = e.target.value
          const recheck = form.sourceType === 'Ασθενής' && sampleReason === 'Επανέλεγχος'
          setForm({
            ...form,
            sampleReason,
            category: recheck ? 'Επανέλεγχος' : (form.category === 'Επανέλεγχος' ? 'Αρχικό / νέο ανεξάρτητο δείγμα' : form.category),
            isRecheck: recheck,
            parentSampleId: recheck ? form.parentSampleId : '',
            rootSampleId: recheck ? form.rootSampleId : '',
          })
        }}
      />
      {form.sourceType === 'Ασθενής' && form.category === 'Επανέλεγχος' ? <SelectField
        label={L('Προηγούμενο δείγμα *', 'Previous sample *')}
        value={form.parentSampleId || ''}
        options={patientSampleOptions}
        helpText={patientSampleOptions.length
          ? L('Ο επανέλεγχος θα παραμείνει στο ίδιο περιστατικό και δεν θα δημιουργήσει νέο case.', 'The follow-up remains in the same surveillance case and will not create a new case.')
          : L('Δεν βρέθηκε προηγούμενο δείγμα για τον ασθενή.', 'No previous sample was found for this patient.')}
        onChange={(e) => setForm({ ...form, parentSampleId: e.target.value, isRecheck: true })}
      /> : null}
      <DateField label={L('Ημερομηνία λήψης', 'Collection date')} value={form.collectionDate} onChange={(e) => setForm({ ...form, collectionDate: e.target.value })} />
      <TimeField label={L('Ώρα λήψης', 'Collection time')} value={form.collectionTime || ''} onChange={(e) => setForm({ ...form, collectionTime: e.target.value })} />
      <DateField label={L('Ημερομηνία παραλαβής', 'Receipt date')} value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} />
      <SelectField
        label={L('Αποδοχή δείγματος', 'Sample acceptance')}
        value={form.sampleAcceptance || 'Αποδεκτό'}
        options={laboratoryOptions(['Αποδεκτό', 'Απορρίφθηκε'], language)}
        placeholder={null}
        onChange={(e) => setForm({ ...form, sampleAcceptance: e.target.value, rejectionReason: e.target.value === 'Απορρίφθηκε' ? form.rejectionReason : '' })}
      />
      {form.sampleAcceptance === 'Απορρίφθηκε' ? <TextField
        label={L('Λόγος απόρριψης *', 'Rejection reason *')}
        value={form.rejectionReason || ''}
        onChange={(e) => setForm({ ...form, rejectionReason: e.target.value })}
        fullWidth
      /> : null}
      {form.sourceType === 'Ασθενής' ? <TextField label={L('Τμήμα', 'Department')} disabled value={form.department || ''} /> : null}
      <TextAreaField fullWidth label={L('Σημειώσεις', 'Notes')} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
    </div>
  </section>
}

export function LaboratoryResultSection({ form, setForm, normalizeMicroorganismRows, updateMicroorganism }) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const rows = normalizeMicroorganismRows(form)

  function changeStatus(status) {
    setForm((current) => ({
      ...current,
      status,
      ...(status === 'Αρνητικό'
        ? { microorganismResults: [], microorganism: '', resistance: '', antibiogram: [] }
        : {}),
    }))
  }

  return <section className="lw-section">
    <WorkspaceSectionHeader
      eyebrow={L('ΑΠΟΤΕΛΕΣΜΑ', 'RESULT')}
      title={L('Εργαστηριακή αξιολόγηση', 'Laboratory assessment')}
      text={L('Καταχώρηση αποτελέσματος, μικροοργανισμού και ανθεκτικότητας.', 'Finalize result, microorganisms and resistance in Laboratory.')}
    />

    {form.sourceType === 'Ασθενής' ? <Alert tone={form.status === 'Θετικό' ? 'warning' : 'info'} title={L('Κλινική ροή', 'Clinical workflow')}>
      {form.category === 'Επανέλεγχος'
        ? L('Ο επανέλεγχος παραμένει συνδεδεμένος με το προηγούμενο δείγμα και δεν ανοίγει νέο περιστατικό λοίμωξης.', 'The follow-up remains linked to the previous sample and does not open a new infection case.')
        : form.status === 'Θετικό'
          ? (language === 'en'
            ? `Saving creates or updates the linked case for clinical assessment${form.relatedInfection ? ` (${form.relatedInfection})` : ''}.`
            : `Με την αποθήκευση δημιουργείται ή ενημερώνεται αυτόματα περιστατικό προς κλινική αξιολόγηση${form.relatedInfection ? ` (${form.relatedInfection})` : ''}.`)
          : form.status === 'Αρνητικό'
            ? L('Το αρνητικό αποτέλεσμα ολοκληρώνει τη ροή του συγκεκριμένου δείγματος χωρίς δημιουργία περιστατικού λοίμωξης.', 'A negative result completes this sample workflow without creating an infection case.')
            : L('Το δείγμα παραμένει σε αναμονή εργαστηριακού αποτελέσματος.', 'The sample remains pending laboratory result.')}
    </Alert> : null}

    <div className="lw-grid lw-grid--three">
      <SelectField
        label={L('Κατάσταση', 'Status')}
        value={form.status}
        options={laboratoryOptions(LABORATORY_RESULT_STATUSES, language)}
        placeholder={null}
        onChange={(e) => changeStatus(e.target.value)}
      />
      <DateField label={L('Ημερομηνία αποτελέσματος', 'Result date')} value={form.resultDate || ''} onChange={(e) => setForm({ ...form, resultDate: e.target.value })} />
      <TextAreaField fullWidth label={L('Παρατηρήσεις αποτελέσματος', 'Result notes')} value={form.resultNotes || ''} onChange={(e) => setForm({ ...form, resultNotes: e.target.value })} />
    </div>

    {form.status !== 'Εκκρεμεί' ? <Alert tone="success" title={L('Επικύρωση αποτελέσματος', 'Result validation')}>
      {form.validatedAt
        ? `${L('Επικυρώθηκε από', 'Validated by')} ${form.validatedBy || '—'} · ${new Date(form.validatedAt).toLocaleString(language === 'en' ? 'en-GB' : 'el-GR')}`
        : L('Με την αποθήκευση, η επικύρωση καταγράφεται αυτόματα στον τρέχοντα χρήστη.', 'On save, validation is automatically recorded against the current user.')}
    </Alert> : null}

    {form.status !== 'Εκκρεμεί' ? <div className="lw-grid lw-grid--three">
      <CheckboxField
        label={L('Κρίσιμο αποτέλεσμα', 'Critical result')}
        description={L('Ενεργοποιήστε μόνο όταν απαιτείται άμεση γνωστοποίηση.', 'Use only when immediate communication is required.')}
        checked={!!form.criticalResult}
        onChange={(e) => setForm({ ...form, criticalResult: e.target.checked })}
      />
      {form.criticalResult ? <TextField
        label={L('Γνωστοποιήθηκε σε *', 'Communicated to *')}
        value={form.criticalCommunicatedTo || ''}
        onChange={(e) => setForm({ ...form, criticalCommunicatedTo: e.target.value })}
      /> : null}
      {form.criticalResult ? <TextField
        type="datetime-local"
        label={L('Ημερομηνία / ώρα γνωστοποίησης *', 'Communication date / time *')}
        value={String(form.criticalCommunicatedAt || '').slice(0,16)}
        onChange={(e) => setForm({ ...form, criticalCommunicatedAt: e.target.value })}
      /> : null}
    </div> : null}

    <RepeatableList
      className="lw-organisms"
      eyebrow={L('ΜΙΚΡΟΟΡΓΑΝΙΣΜΟΙ', 'MICROORGANISMS')}
      title={L('Απομονωθέντες μικροοργανισμοί', 'Isolated microorganisms')}
      items={rows}
      emptyText={form.status === 'Θετικό'
        ? L('Το θετικό αποτέλεσμα απαιτεί τουλάχιστον έναν μικροοργανισμό.', 'A positive result requires at least one microorganism.')
        : L('Δεν έχει καταχωρηθεί μικροοργανισμός.', 'No microorganism has been recorded.')}
      onAdd={() => setForm((current) => ({
        ...current,
        microorganismResults: [...normalizeMicroorganismRows(current), { id: `ORG-${Date.now()}`, name: '', resistance: '' }],
      }))}
      renderRow={(row, index) => <div className="lw-organism-row">
        <LibraryField
          label={L('Μικροοργανισμός', 'Microorganism')}
          libraryKey="microorganisms"
          value={row.name || ''}
          allowManual
          onChange={(value) => updateMicroorganism(index, { name: value })}
        />
        <SelectField
          label={L('Χαρακτηρισμός αντοχής', 'Resistance classification')}
          value={row.resistance || ''}
          options={laboratoryOptions(LABORATORY_RESISTANCE_OPTIONS, language)}
          onChange={(e) => updateMicroorganism(index, { resistance: e.target.value })}
        />
        <IconButton
          label={L('Διαγραφή μικροοργανισμού', 'Delete microorganism')}
          variant="danger"
          onClick={() => {
            if (!confirmAction(L('Να διαγραφεί ο μικροοργανισμός από την καταχώρηση;', 'Remove this microorganism from the record?'))) return
            setForm((current) => ({
              ...current,
              microorganismResults: normalizeMicroorganismRows(current).filter((_, i) => i !== index),
            }))
          }}
        >
          <Trash2 size={16} />
        </IconButton>
      </div>}
    />
  </section>
}

export function LaboratoryAntibiogramSection({ form, setForm, updateAntibiogram }) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const hasOrganism = Array.isArray(form.microorganismResults)
    && form.microorganismResults.some((row) => String(row?.name || '').trim())

  return <section className="lw-section">
    <WorkspaceSectionHeader
      eyebrow={L('ΑΝΤΙΒΙΟΓΡΑΜΜΑ', 'ANTIBIOGRAM')}
      title={L('Ευαισθησίες αντιβιοτικών', 'Antimicrobial susceptibility')}
      text={L('Καταχωρήστε μία ή περισσότερες γραμμές αντιβιογράμματος για το αποτέλεσμα.', 'Record one or more antimicrobial susceptibility results.')}
      actions={<Button
        size="sm"
        variant="secondary"
        disabled={form.status !== 'Θετικό' || !hasOrganism}
        onClick={() => setForm((current) => ({
          ...current,
          antibiogram: [...(current.antibiogram || []), { id: `ABG-${Date.now()}`, antibiotic: '', sensitivity: '', mic: '' }],
        }))}
      >
        {L('+ Προσθήκη', '+ Add')}
      </Button>}
    />

    {form.status !== 'Θετικό' || !hasOrganism ? <Alert tone="info" title={L('Αντιβιόγραμμα', 'Antibiogram')}>
      {L('Το αντιβιόγραμμα καταχωρείται όταν υπάρχει θετικό αποτέλεσμα και απομονωμένος μικροοργανισμός.', 'Record an antibiogram when the result is positive and a microorganism has been isolated.')}
    </Alert> : null}

    <RepeatableList
      className="lw-antibiogram"
      items={form.antibiogram || []}
      emptyText={L('Δεν έχει καταχωρηθεί αντιβιόγραμμα.', 'No antibiogram has been recorded.')}
      renderRow={(row, index) => <div className="lw-antibiogram-row">
        <LibraryField label={L('Αντιβιοτικό', 'Antimicrobial')} libraryKey="antibiotics" value={row.antibiotic || ''} allowManual onChange={(value) => updateAntibiogram(index, { antibiotic: value })} />
        <SelectField label={L('Ευαισθησία', 'Susceptibility')} value={row.sensitivity || ''} options={['S', 'I', 'R']} onChange={(e) => updateAntibiogram(index, { sensitivity: e.target.value })} />
        <TextField label="MIC" value={row.mic || ''} onChange={(e) => updateAntibiogram(index, { mic: e.target.value })} />
        <IconButton
          label={L('Διαγραφή γραμμής', 'Delete row')}
          variant="danger"
          onClick={() => {
            if (!confirmAction(L('Να διαγραφεί η γραμμή του αντιβιογράμματος;', 'Delete this antibiogram row?'))) return
            setForm((current) => ({
              ...current,
              antibiogram: (current.antibiogram || []).filter((_, i) => i !== index),
            }))
          }}
        >
          <Trash2 size={16} />
        </IconButton>
      </div>}
    />
  </section>
}
