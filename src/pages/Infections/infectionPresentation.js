const EN = {
  'Λοίμωξη ουροποιητικού σχετιζόμενη με καθετήρα': 'Catheter-associated urinary tract infection',
  'Λοίμωξη αιματικής ροής σχετιζόμενη με κεντρική γραμμή': 'Central line-associated bloodstream infection',
  'Πνευμονία σχετιζόμενη με αναπνευστήρα': 'Ventilator-associated pneumonia',
  'Λοίμωξη χειρουργικού πεδίου': 'Surgical site infection',
  'Όλα': 'All',
  'Ενεργή': 'Active',
  'Υπό διερεύνηση': 'Under investigation',
  'Ολοκληρωμένη': 'Completed',
  'Νοσοκομειακή': 'Hospital-acquired',
  'Κοινότητας': 'Community-acquired',
  'Σχετιζόμενη με φροντίδα υγείας': 'Healthcare-associated',
  'Άγνωστη': 'Unknown',
  'Σε εξέλιξη': 'Ongoing',
  'Ίαση': 'Recovered',
  'Βελτίωση': 'Improved',
  'Επιπλοκή': 'Complication',
  'Θάνατος': 'Death',
  'Αναπνευστικό': 'Respiratory',
  'Ουροποιητικό': 'Urinary tract',
  'Αίμα': 'Blood',
  'Δέρμα': 'Skin',
  'Επαφής': 'Contact',
  'Σταγονιδίων': 'Droplet',
  'Αερογενής': 'Airborne',
  'Προστατευτική': 'Protective',
}
export function infectionDisplayValue(value, language = 'el') {
  if (value == null || value === '') return value
  return language === 'en' ? (EN[String(value)] || value) : value
}
export function infectionOptions(values = [], language = 'el') {
  return values.map((value) => ({ value, label: infectionDisplayValue(value, language) }))
}
