const COPY = {
  caseReadOnly: {
    el: 'Η επιτήρηση έχει ολοκληρωθεί και είναι κλειδωμένη. Τα στοιχεία παραμένουν διαθέσιμα μόνο για προβολή.',
    en: 'This surveillance case is completed and locked. Records remain available in read-only mode.',
  },
  assessmentIntro: {
    el: 'Τα στοιχεία αφορούν το περιστατικό επιτήρησης. Το τμήμα προέρχεται από τη νοσηλεία και δεν επαναλαμβάνεται εδώ.',
    en: 'These data describe the surveillance episode. Department is inherited from the admission record.',
  },
  devicesIntro: {
    el: 'Καταγράφονται με έναρξη και λήξη ώστε να μπορούν να υπολογιστούν device-days και να τεκμηριωθεί πιθανή συσχέτιση.',
    en: 'Record start and end dates to support device-day calculations and document possible infection association.',
  },
  samplesIntro: {
    el: 'Νέο ανεξάρτητο δείγμα ή επανέλεγχος μέσα στην ίδια επιτήρηση. Οι επανέλεγχοι παραμένουν συνδεδεμένοι μέχρι την αρνητικοποίηση ή την τελική έκβαση.',
    en: 'Add an independent sample or a follow-up within the same surveillance case. Follow-ups remain linked through clearance or final outcome.',
  },
  therapyIntro: {
    el: 'Καταχωρίστε ένα ή περισσότερα αντιβιοτικά. Όσα σημειώνονται ως προωθημένα εμφανίζονται αυτόματα και στην κεντρική λίστα Προωθημένων Αντιβιοτικών.',
    en: 'Record one or more antimicrobials. Restricted agents also appear automatically in the central Restricted Antibiotics list.',
  },
  devicesEmpty: {
    el: 'Προσθέστε μόνο συσκευές που έχουν κλινική ή επιδημιολογική σημασία.',
    en: 'Add only devices with clinical or epidemiological relevance.',
  },
  therapyEmpty: {
    el: 'Προσθέστε μόνο τα αντιβιοτικά που χορηγούνται στο συγκεκριμένο περιστατικό.',
    en: 'Add only antimicrobials administered for this episode.',
  },
}
export function patientClinicalCopy(key, language = 'el') {
  const row = COPY[key]
  return row?.[language === 'en' ? 'en' : 'el'] || ''
}
