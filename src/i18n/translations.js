export const translations = {
  el: {
    common: {
      language: 'Γλώσσα', greek: 'Ελληνικά', english: 'English', menu: 'Μενού',
      navigationToggle: 'Άνοιγμα ή σύμπτυξη μενού', loading: 'Φόρτωση…', administrator: 'Διαχειριστής', accessibility: 'Προσβασιμότητα', profile: 'Προφίλ', logout: 'Αποσύνδεση', cancel: 'Ακύρωση', textSize: 'Μέγεθος κειμένου', highContrast: 'Υψηλή αντίθεση', reducedMotion: 'Μειωμένη κίνηση', reset: 'Επαναφορά', confirmSignOut: 'Επιβεβαίωση αποσύνδεσης', signOutQuestion: 'Θέλετε να αποσυνδεθείτε από το Healthcare Suite;', signedOutTitle: 'Η αποσύνδεση ολοκληρώθηκε', signedOutText: 'Η συνεδρία σας έκλεισε με ασφάλεια.', secureEnvironment: 'Ασφαλές Περιβάλλον Υγείας', yes: 'Ναι', no: 'Όχι', select: 'Επιλέξτε',
    },
    login: {
      eyebrow: 'Πλατφόρμα Πρόληψης Λοιμώξεων',
      heroTitle: 'Έλεγχος λοιμώξεων με καθαρή εικόνα.',
      heroText: 'Ενιαία ψηφιακή πλατφόρμα για την πρόληψη, επιτήρηση, καταγραφή και ανάλυση λοιμώξεων σε νοσοκομειακό περιβάλλον.',
      infectionSurveillance: 'Επιτήρηση λοιμώξεων', sampleManagement: 'Διαχείριση δειγμάτων', automaticIndicators: 'Αυτόματοι δείκτες', reportsAi: 'Αναφορές και AI Analytics',
      secureEnvironment: 'Ασφαλές Περιβάλλον Υγείας', yes: 'Ναι', no: 'Όχι', select: 'Επιλέξτε', welcome: 'Καλώς ήρθατε',
      welcomeText: 'Συνδεθείτε στο Healthcare Suite για ασφαλή πρόσβαση στην εφαρμογή.', enter: 'Είσοδος στην εφαρμογή →', demoEnter: 'Είσοδος Demo', demoUser: 'Χρήστης Demo', support: 'Τεχνική υποστήριξη',
      supportLater: 'Η τεχνική υποστήριξη θα συνδεθεί αργότερα με το SupportHub.', available: 'Το σύστημα είναι διαθέσιμο', back: '← Επιστροφή',
      signInTitle: 'Σύνδεση χρήστη', signInText: 'Εισαγάγετε τα προσωπικά σας στοιχεία για ασφαλή πρόσβαση.', username: 'Όνομα χρήστη', password: 'Κωδικός πρόσβασης', signIn: 'Σύνδεση',
      missingCredentials: 'Συμπληρώστε όνομα χρήστη και κωδικό πρόσβασης.', forgotPassword: 'Ξέχασα τον κωδικό', forgotTitle: 'Ανάκτηση κωδικού', forgotText: 'Εισαγάγετε το email ή το όνομα χρήστη σας. Θα σταλούν οδηγίες ανάκτησης όταν συνδεθεί η υπηρεσία ταυτοποίησης.', sendRecovery: 'Αποστολή οδηγιών', recoverySent: 'Αν ο λογαριασμός υπάρχει, θα λάβετε οδηγίες ανάκτησης.', showPassword: 'Εμφάνιση κωδικού', hidePassword: 'Απόκρυψη κωδικού',
    },
    dashboard: {
      title: 'Κεντρική εικόνα', newEntry: 'Νέα καταχώρηση', kpiAria: 'Βασικοί δείκτες',
      kpi: { admitted: 'Νοσηλευόμενοι', pendingSamples: 'Εκκρεμή δείγματα', positiveResults: 'Θετικά αποτελέσματα', activeInfections: 'Ενεργές λοιμώξεις', isolations: 'Απομονώσεις' },
      attention: 'Τι χρειάζεται προσοχή', openLaboratory: 'Εργαστήριο', noUrgent: 'Δεν υπάρχουν επείγουσες εκκρεμότητες.',
      priority: {
        resistantTitle: '{count} αποτελέσματα MDR / XDR', resistantText: 'Χρειάζονται αξιολόγηση και συσχέτιση με ασθενείς ή τμήματα.',
        pendingTitle: '{count} εκκρεμή δείγματα', pendingText: 'Παραμένουν χωρίς οριστικοποιημένο μικροβιολογικό αποτέλεσμα.',
        infectionsTitle: '{count} ενεργές λοιμώξεις', infectionsText: 'Ελέγξτε την κλινική εξέλιξη και τις εκκρεμείς ενέργειες.',
        isolationsTitle: '{count} ενεργές απομονώσεις', isolationsText: 'Ελέγξτε διάρκεια, αιτιολογία και μέτρα προφύλαξης.',
      },
      departmentsTitle: 'Τμήματα με αυξημένη δραστηριότητα', allResults: 'Όλα τα αποτελέσματα', departmentsAria: 'Δραστηριότητα ανά τμήμα', noDepartmentData: 'Δεν υπάρχουν διαθέσιμα δεδομένα ανά τμήμα.', noDepartment: 'Χωρίς τμήμα',
      table: { department: 'Τμήμα', total: 'Σύνολο', positive: 'Θετικά' },
      openAi: 'Άνοιγμα AI', ai: {
        resistant: 'Εντοπίζονται {count} καταχωρήσεις ανθεκτικών μικροοργανισμών. Προτεραιότητα έχει η αξιολόγηση ανά τμήμα και η συσχέτιση με ενεργές λοιμώξεις.',
        positive: 'Υπάρχουν {count} θετικά μικροβιολογικά αποτελέσματα. Συνιστάται έλεγχος για πιθανή συρροή ή κοινό τμήμα.',
        clear: 'Δεν προκύπτει άμεσο σήμα αυξημένου κινδύνου από τα διαθέσιμα δεδομένα.',
        note: 'Αυτόματη σύνοψη κανόνων από τα διαθέσιμα δεδομένα· δεν αποτελεί κλινική απόφαση.',
      },
      quickActions: 'Γρήγορη πρόσβαση', quick: { patients: 'Ασθενείς', laboratory: 'Εργαστήριο', infections: 'Λοιμώξεις', indicators: 'Δείκτες' },
      indicators: 'Δείκτες', viewAll: 'Προβολή όλων', indicatorsAria: 'Σύνοψη δεικτών', indicator: { available: 'Με διαθέσιμη τιμή', attention: 'Χρειάζονται δεδομένα / προσοχή' },
      recentActivity: 'Πρόσφατη δραστηριότητα', noRecentActivity: 'Δεν υπάρχει πρόσφατη δραστηριότητα.',
      activity: { sample: 'Δείγμα', infection: 'Λοίμωξη', infectionEntry: 'Καταχώρηση λοίμωξης', isolation: 'Απομόνωση' },
    },

    patients: {
      title: 'Ασθενείς', description: 'Μητρώο και παρακολούθηση ασθενών', newPatient: 'Νέος ασθενής', summaryAria: 'Σύνολα ασθενών', total: 'Σύνολο', admitted: 'Νοσηλεύονται', positive: 'Θετικές', isolations: 'Απομονώσεις',
      searchPlaceholder: 'Αναζήτηση με όνομα, κωδικό, ΑΜΚΑ ή διάγνωση…', allDepartments: 'Όλα τα τμήματα', allStatuses: 'Όλες οι καταστάσεις', clinicalFlag: 'Κλινική ένδειξη', allFlags: 'Όλες οι ενδείξεις', positiveCulture: 'Θετική καλλιέργεια', inIsolation: 'Σε απομόνωση',
      selectedLabel: 'ασθενείς', selectedPatients: 'Επιλεγμένοι ασθενείς', printPdf: 'Εκτύπωση / PDF', exportCsv: 'Εξαγωγή CSV', registryAria: 'Μητρώο ασθενών', code: 'Κωδικός', fullName: 'Ονοματεπώνυμο', amka: 'ΑΜΚΑ', department: 'Τμήμα', room: 'Θάλαμος / Κλίνη', status: 'Κατάσταση', diagnosis: 'Κύρια διάγνωση', isolation: 'Απομόνωση', patient: 'Ασθενής', noAmka: 'Χωρίς ΑΜΚΑ', noDiagnosis: 'Χωρίς διάγνωση', departmentRoom: 'Τμήμα / Θάλαμος', noRoom: 'Χωρίς θάλαμο / κλίνη', hospitalization: 'Νοσηλεία', days: 'ημέρες', flags: 'Ενδείξεις', records: 'εγγραφές', selected: 'επιλεγμένες',
      form: { description: 'Δημιουργία εγγραφής στο μητρώο ασθενών', basic: 'Βασικά στοιχεία', firstName: 'Όνομα', lastName: 'Επώνυμο', fatherName: 'Πατρώνυμο', gender: 'Φύλο', age: 'Ηλικία', patientCode: 'Κωδικός ασθενούς', hospitalization: 'Νοσηλεία', admissionDate: 'Ημερομηνία εισαγωγής', admissionTime: 'Ώρα εισαγωγής', daysInHospital: 'Ημέρες νοσηλείας', clinicalInfo: 'Κλινική πληροφορία', validation: { firstName: 'Συμπληρώστε όνομα.', lastName: 'Συμπληρώστε επώνυμο.', patientCode: 'Συμπληρώστε κωδικό ασθενούς.', age: 'Η ηλικία πρέπει να είναι από 0 έως 130.' } },
    },
    nav: {
      dashboard: 'Κεντρική εικόνα', patients: 'Ασθενείς', employees: 'Προσωπικό', laboratory: 'Εργαστήριο', surveillance: 'Επιτήρηση', overview: 'Επισκόπηση', water: 'Νερό', surfaces: 'Επιφάνειες', indicators: 'Δείκτες', records: 'Καταγραφές',
      notifiableDiseases: 'Δηλούμενα Νοσήματα', antiseptics: 'Αντισηπτικά', waste: 'Απόβλητα', prevention: 'Πρόληψη', vaccinations: 'Εμβολιασμοί', handHygiene: 'Υγιεινή Χεριών',
      promotedAntibiotics: 'Προωθημένα Αντιβιοτικά', quality: 'Κέντρο Ποιότητας', committees: 'Επιτροπές', training: 'Εκπαίδευση', documents: 'Έγγραφα', lira: 'LIRA AI', studio: 'Κέντρο Διαχείρισης',
    },
  },
  en: {
    common: {
      language: 'Language', greek: 'Ελληνικά', english: 'English', menu: 'Menu',
      navigationToggle: 'Open or collapse menu', loading: 'Loading…', administrator: 'Administrator', accessibility: 'Accessibility', profile: 'Profile', logout: 'Sign out', cancel: 'Cancel', textSize: 'Text size', highContrast: 'High contrast', reducedMotion: 'Reduced motion', reset: 'Reset', confirmSignOut: 'Confirm sign out', signOutQuestion: 'Do you want to sign out of Healthcare Suite?', signedOutTitle: 'Signed out successfully', signedOutText: 'Your session has been closed safely.', secureEnvironment: 'Secure Healthcare Environment', yes: 'Yes', no: 'No', select: 'Select',
    },
    login: {
      eyebrow: 'Infection Prevention Platform', heroTitle: 'Infection control with a clear view.',
      heroText: 'A unified digital platform for infection prevention, surveillance, recording and analysis in the hospital environment.',
      infectionSurveillance: 'Infection surveillance', sampleManagement: 'Sample management', automaticIndicators: 'Automated indicators', reportsAi: 'Reports and AI Analytics',
      secureEnvironment: 'Secure Healthcare Environment', yes: 'Yes', no: 'No', select: 'Select', welcome: 'Welcome', welcomeText: 'Sign in to Healthcare Suite for secure access to the application.', enter: 'Enter application →', demoEnter: 'Enter Demo', demoUser: 'Demo User', support: 'Technical support',
      supportLater: 'Technical support will be connected to SupportHub later.', available: 'System available', back: '← Back', signInTitle: 'User sign in', signInText: 'Enter your personal credentials for secure access.',
      username: 'Username', password: 'Password', signIn: 'Sign in', missingCredentials: 'Enter your username and password.', forgotPassword: 'Forgot password?', forgotTitle: 'Password recovery', forgotText: 'Enter your email or username. Recovery instructions will be sent when the authentication service is connected.', sendRecovery: 'Send instructions', recoverySent: 'If the account exists, recovery instructions will be sent.', showPassword: 'Show password', hidePassword: 'Hide password',
    },
    dashboard: {
      title: 'Overview', newEntry: 'New entry', kpiAria: 'Key indicators',
      kpi: { admitted: 'Inpatients', pendingSamples: 'Pending samples', positiveResults: 'Positive results', activeInfections: 'Active infections', isolations: 'Isolations' },
      attention: 'Needs attention', openLaboratory: 'Laboratory', noUrgent: 'No urgent items require attention.',
      priority: {
        resistantTitle: '{count} MDR / XDR results', resistantText: 'Review and correlate these results with patients and clinical departments.',
        pendingTitle: '{count} pending samples', pendingText: 'These samples do not yet have a finalized microbiology result.',
        infectionsTitle: '{count} active infections', infectionsText: 'Review clinical progress and outstanding actions.',
        isolationsTitle: '{count} active isolations', isolationsText: 'Review duration, indication and required precautions.',
      },
      departmentsTitle: 'Departments with increased activity', allResults: 'All results', departmentsAria: 'Activity by department', noDepartmentData: 'No department-level data are available.', noDepartment: 'No department',
      table: { department: 'Department', total: 'Total', positive: 'Positive' },
      openAi: 'Open AI', ai: {
        resistant: '{count} resistant-organism records are currently identified. Priority should be given to department-level review and correlation with active infections.',
        positive: '{count} positive microbiology results are currently available. Review for a possible cluster or shared department.',
        clear: 'No immediate elevated-risk signal is identified in the available data.',
        note: 'Automated rules-based summary of available data; not a clinical decision.',
      },
      quickActions: 'Quick access', quick: { patients: 'Patients', laboratory: 'Laboratory', infections: 'Infections', indicators: 'Indicators' },
      indicators: 'Indicators', viewAll: 'View all', indicatorsAria: 'Indicator summary', indicator: { available: 'With available value', attention: 'Need data / attention' },
      recentActivity: 'Recent activity', noRecentActivity: 'No recent activity is available.',
      activity: { sample: 'Sample', infection: 'Infection', infectionEntry: 'Infection record', isolation: 'Isolation' },
    },

    patients: {
      title: 'Patients', description: 'Patient registry and clinical follow-up', newPatient: 'New patient', summaryAria: 'Patient totals', total: 'Total', admitted: 'Inpatients', positive: 'Positive', isolations: 'Isolations',
      searchPlaceholder: 'Search by name, patient code, national ID or diagnosis…', allDepartments: 'All departments', allStatuses: 'All statuses', clinicalFlag: 'Clinical flag', allFlags: 'All flags', positiveCulture: 'Positive culture', inIsolation: 'In isolation',
      selectedLabel: 'patients', selectedPatients: 'Selected patients', printPdf: 'Print / PDF', exportCsv: 'Export CSV', registryAria: 'Patient registry', code: 'Code', fullName: 'Full name', amka: 'National ID (AMKA)', department: 'Department', room: 'Room / Bed', status: 'Status', diagnosis: 'Primary diagnosis', isolation: 'Isolation', patient: 'Patient', noAmka: 'No AMKA recorded', noDiagnosis: 'No diagnosis recorded', departmentRoom: 'Department / Room', noRoom: 'No room / bed recorded', hospitalization: 'Hospital stay', days: 'days', flags: 'Flags', records: 'records', selected: 'selected',
      form: { description: 'Create a record in the patient registry', basic: 'Patient details', firstName: 'First name', lastName: 'Last name', fatherName: 'Father’s name', gender: 'Sex', age: 'Age', patientCode: 'Patient code', hospitalization: 'Hospital stay', admissionDate: 'Admission date', admissionTime: 'Admission time', daysInHospital: 'Length of stay (days)', clinicalInfo: 'Clinical information', validation: { firstName: 'Enter the first name.', lastName: 'Enter the last name.', patientCode: 'Enter the patient code.', age: 'Age must be between 0 and 130.' } },
    },
    nav: {
      dashboard: 'Overview', patients: 'Patients', employees: 'Staff', laboratory: 'Laboratory', surveillance: 'Surveillance', overview: 'Overview', water: 'Water', surfaces: 'Surfaces', indicators: 'Indicators', records: 'Records',
      notifiableDiseases: 'Notifiable Diseases', antiseptics: 'Antiseptics', waste: 'Waste', prevention: 'Prevention', vaccinations: 'Vaccinations', handHygiene: 'Hand Hygiene',
      promotedAntibiotics: 'Restricted Antibiotics', quality: 'Quality Hub', committees: 'Committees', training: 'Training', documents: 'Documents', lira: 'LIRA AI', studio: 'Administration Center',
    },
  },
}
