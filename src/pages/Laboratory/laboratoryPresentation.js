const EN = {
  'Ασθενής': 'Patient',
  'Προσωπικό': 'Staff',
  'Περιβάλλον': 'Environment',
  'Νερό': 'Water',
  'Εκκρεμεί': 'Pending',
  'Αρνητικό': 'Negative',
  'Θετικό': 'Positive',
  'Καλλιέργεια': 'Culture',
  'Επανέλεγχος': 'Follow-up',
  'Άλλο': 'Other',
  'Αρχικό / νέο ανεξάρτητο δείγμα': 'Initial / new independent sample',
  'Αίμα': 'Blood',
  'Ούρα': 'Urine',
  'Πτύελα': 'Sputum',
  'Βρογχικές εκκρίσεις': 'Bronchial secretions',
  'Τραύμα': 'Wound',
  'Ρινικό επίχρισμα': 'Nasal swab',
  'Φαρυγγικό επίχρισμα': 'Throat swab',
  'Ορθικό επίχρισμα': 'Rectal swab',
  'Άκρο καθετήρα': 'Catheter tip',
  'ΕΝΥ': 'CSF',
  'Κόπρανα': 'Stool',
  'Χωρίς χαρακτηρισμό': 'Not classified',
  'Ενεργό': 'Active',
  'Ανενεργό': 'Inactive',
  'Άνδρας': 'Male',
  'Γυναίκα': 'Female',
  'Άλλο / μη δηλωμένο': 'Other / not specified',
}
export function laboratoryDisplayValue(value, language = 'el') {
  if (value == null || value === '') return value
  return language === 'en' ? (EN[String(value)] || value) : value
}
export function laboratoryOptions(values = [], language = 'el') {
  return values.map((value) => ({ value, label: laboratoryDisplayValue(value, language) }))
}
