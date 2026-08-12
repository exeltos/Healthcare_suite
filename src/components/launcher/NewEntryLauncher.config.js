export const entryTypes = [
  {
    id: 'infection',
    label: 'Λοίμωξη',
    icon: '🦠',
    description: 'Καταγραφή λοίμωξης και σύνδεση με νοσηλεία.',
    patientRequired: true,
  },
  {
    id: 'culture',
    label: 'Καλλιέργεια',
    icon: '🧫',
    description: 'Νέα καλλιέργεια ή αποτέλεσμα εργαστηρίου.',
    patientRequired: false,
  },
  {
    id: 'screening',
    label: 'Screening ασθενούς',
    icon: '👤',
    description: 'Έλεγχος αποικισμού ή προληπτικός έλεγχος.',
    patientRequired: true,
  },
  {
    id: 'hand-hygiene',
    label: 'Υγιεινή Χεριών',
    icon: '🤲',
    description: 'Παρατήρηση ή έλεγχος συμμόρφωσης.',
    patientRequired: false,
  },
  {
    id: 'environment',
    label: 'Περιβαλλοντικός Έλεγχος',
    icon: '🏥',
    description: 'Έλεγχος χώρου, επιφάνειας ή εξοπλισμού.',
    patientRequired: false,
  },
  {
    id: 'water',
    label: 'Έλεγχος Νερού',
    icon: '💧',
    description: 'Δείγμα και αποτέλεσμα ελέγχου νερού.',
    patientRequired: false,
  },
  {
    id: 'staff',
    label: 'Έλεγχος Προσωπικού',
    icon: '👩‍⚕️',
    description: 'Καλλιέργεια ή προληπτικός έλεγχος προσωπικού.',
    patientRequired: false,
  },
  {
    id: 'incident',
    label: 'Συμβάν',
    icon: '⚠️',
    description: 'Καταγραφή συμβάντος ή μη συμμόρφωσης.',
    patientRequired: false,
  },
]


export const whoMoments = [
  { id: 'moment1', label: '1. Πριν την επαφή με τον ασθενή' },
  { id: 'moment2', label: '2. Πριν από καθαρό / άσηπτο χειρισμό' },
  { id: 'moment3', label: '3. Μετά από κίνδυνο έκθεσης σε σωματικά υγρά' },
  { id: 'moment4', label: '4. Μετά την επαφή με τον ασθενή' },
  { id: 'moment5', label: '5. Μετά την επαφή με το περιβάλλον του ασθενούς' },
]




export const emptyWhoObservation = {
  id: '',
  professionalCode: '',
  professionalCategory: 'Νοσηλευτής / Νοσηλεύτρια',
  moment: 'moment1',
  action: 'HR',
  gloves: false,
  notes: '',
}



export const environmentSurfaceTypes = [
  'Επιφάνεια εργασίας',
  'Κρεβάτι / κάγκελο',
  'Πόμολο',
  'Ιατροτεχνολογικός εξοπλισμός',
  'Νιπτήρας',
  'Δάπεδο',
  'Τοίχος',
  'Αεραγωγός / HVAC',
  'Χειρουργική αίθουσα',
  'Αποστειρωμένος χώρος',
  'Άλλο',
]

export const environmentMethods = [
  'Swab',
  'Contact Plate',
  'ATP',
  'Άλλη μέθοδος',
]

export const emptyEnvironmentSession = {
  facility: 'ΙΑΣΩ Θεσσαλίας',
  date: '',
  department: '',
  area: '',
  observer: '',
  reason: 'Προγραμματισμένος έλεγχος',
}

export const emptyEnvironmentSample = {
  id: '',
  samplingPoint: '',
  surfaceType: 'Επιφάνεια εργασίας',
  method: 'Swab',
  resultStatus: 'Εκκρεμεί',
  microorganism: '',
  cfu: '',
  acceptable: '',
  notes: '',
}

export const emptyNewPatient = {
  fullName: '',
  patientCode: '',
  amka: '',
  department: '',
  room: '',
  admissionDate: '',
  primaryDiagnosis: '',
}

export const emptyEntry = {
  date: '',
  department: '',
  title: '',
  result: '',
  notes: '',
}
