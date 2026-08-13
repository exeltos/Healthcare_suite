const EN = {
  'Επιτροπή':'Committee',
  'Ομάδα εργασίας':'Working group',
  'Συμβούλιο':'Council',
  'Ενεργή':'Active',
  'Ανενεργή':'Inactive',
  'Μηνιαία':'Monthly',
  'Διμηνιαία':'Every two months',
  'Τριμηνιαία':'Quarterly',
  'Εξαμηνιαία':'Every six months',
  'Ετήσια':'Annual',
  'Έκτακτη':'Ad hoc',
  'Μέλος':'Member',
  'Πρόεδρος':'Chair',
  'Γραμματέας':'Secretary',
  'Συντονιστής':'Coordinator',
  'Ανοικτή':'Open',
  'Σε εξέλιξη':'In progress',
  'Ολοκληρωμένη':'Completed',
  'Χειροκίνητη καταχώρηση':'Manual entry',
  'Από μητρώο προσωπικού':'From staff registry',
}
export function committeeDisplayValue(value, language='el') {
  if (value == null || value === '') return value
  return language === 'en' ? (EN[String(value)] || value) : value
}
