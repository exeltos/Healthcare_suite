const EN = {
  'Προγραμματισμένη':'Scheduled',
  'Σε εξέλιξη':'In progress',
  'Ολοκληρωμένη':'Completed',
  'Ακυρωμένη':'Cancelled',
  'Κλινική εκπαίδευση':'Clinical training',
  'Ασφάλεια':'Safety',
  'Ποιότητα':'Quality',
  'Εισαγωγική':'Induction',
  'Υποχρεωτική':'Mandatory',
  'Παρών':'Present',
  'Απών':'Absent',
  'Δικαιολογημένος':'Excused',
  'Δεν ολοκλήρωσε':'Did not complete',
  'Από μητρώο προσωπικού':'From staff registry',
  'Χειροκίνητη καταχώρηση':'Manual entry',
}
export function trainingDisplayValue(value, language='el') {
  if (value == null || value === '') return value
  return language === 'en' ? (EN[String(value)] || value) : value
}
