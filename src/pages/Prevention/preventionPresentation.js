const EN = {
  'Ενεργό': 'Active',
  'Ανενεργό': 'Inactive',
  'Εκκρεμεί': 'Pending',
  'Εγκρίθηκε': 'Approved',
  'Απορρίφθηκε': 'Rejected',
  'Ηπατίτιδα Β': 'Hepatitis B',
  'Γρίπη': 'Influenza',
  'Ανεμευλογιά': 'Varicella',
  'Τέτανος / Διφθερίτιδα': 'Tetanus / Diphtheria',
  'Συμμόρφωση': 'Compliant',
  'Μη συμμόρφωση': 'Non-compliant',
  'Αλκοολούχο αντισηπτικό': 'Alcohol-based handrub',
  'Πλύσιμο χεριών': 'Handwashing',
  'Καμία ενέργεια': 'No action',
  '1. Πριν την επαφή με τον ασθενή': '1. Before touching a patient',
  '2. Πριν από καθαρό / άσηπτο χειρισμό': '2. Before clean / aseptic procedure',
  '3. Μετά από κίνδυνο έκθεσης σε σωματικά υγρά': '3. After body fluid exposure risk',
  '4. Μετά την επαφή με τον ασθενή': '4. After touching a patient',
  '5. Μετά την επαφή με το περιβάλλον του ασθενούς': '5. After touching patient surroundings',
}
export function preventionDisplayValue(value, language='el') {
  if (value == null || value === '') return value
  return language === 'en' ? (EN[String(value)] || value) : value
}
export function preventionOptions(values=[], language='el') {
  return values.map((value) => ({ value, label: preventionDisplayValue(value, language) }))
}
