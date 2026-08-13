const EN = {
  'Νέα αναφορά':'New report','Υπό διερεύνηση':'Under investigation','Σε ενέργειες βελτίωσης':'Improvement actions','Κλειστό':'Closed',
  'Χωρίς βλάβη / near miss':'No harm / near miss','Ήπια βλάβη':'Mild harm','Μέτρια βλάβη':'Moderate harm','Σοβαρή βλάβη':'Severe harm','Θάνατος':'Death',
  'Ανοικτή':'Open','Σε εξέλιξη':'In progress','Σε επαλήθευση':'Verification','Ολοκληρωμένη':'Completed','Ακυρωμένη':'Cancelled',
  'Χαμηλή':'Low','Μέτρια':'Medium','Υψηλή':'High','Κρίσιμη':'Critical',
  'Εκκρεμεί':'Pending','Αποτελεσματική':'Effective','Μερικώς αποτελεσματική':'Partially effective','Μη αποτελεσματική':'Ineffective',
  'Διορθωτική':'Corrective','Προληπτική':'Preventive','Βελτίωση διαδικασίας':'Process improvement',
  'Συμβάν':'Incident','Έλεγχος':'Control','Δείκτης':'Indicator','Παράπονο':'Complaint','Επιτροπή':'Committee','Άλλο':'Other',
  'Ολοκληρωμένο':'Completed','Ανοικτό':'Open','Μείζον':'Major','Κρίσιμο':'Critical',
}
export function qualityDisplayValue(value, language='el') {
  if (value == null || value === '') return value
  return language === 'en' ? (EN[String(value)] || value) : value
}
