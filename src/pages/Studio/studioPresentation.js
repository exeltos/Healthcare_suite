const VALUE_EN = {
  'Αίμα':'Blood','Ούρα':'Urine','Πτύελα':'Sputum','Επίχρισμα επιφάνειας':'Surface swab',
  'Αναπνευστικό':'Respiratory','Ουροποιητικό':'Urinary tract','Δέρμα':'Skin',
  'Λοίμωξη ουροποιητικού σχετιζόμενη με καθετήρα':'Catheter-associated urinary tract infection',
  'Λοίμωξη αιματικής ροής σχετιζόμενη με κεντρική γραμμή':'Central line-associated bloodstream infection',
  'Πνευμονία σχετιζόμενη με αναπνευστήρα':'Ventilator-associated pneumonia',
  'Λοίμωξη χειρουργικού πεδίου':'Surgical site infection',
  'ΜΕΘ':'ICU','Χειρουργείο':'Operating Theatre','Παθολογική':'Internal Medicine','Αποστείρωση':'Sterile Services','Αιμοκάθαρση':'Hemodialysis',
  'Εργαστήριο':'Laboratory','Καρδιολογική':'Cardiology','Μικροβιολογικό Εργαστήριο':'Microbiology Laboratory','Παιδιατρική':'Pediatrics','ΤΕΠ':'Emergency Department','Τεχνική Υπηρεσία':'Technical Services','Τμήμα':'Department','Χειρουργική':'Surgery','Χειρουργική Κλινική':'Surgical Ward',
  'Καθετήρας':'Catheter','Εξοπλισμός':'Equipment','Αναπνευστική υποστήριξη':'Respiratory support',
  'Κεντρικός φλεβικός καθετήρας':'Central venous catheter','Ουροκαθετήρας':'Urinary catheter','Αναπνευστήρας':'Ventilator',
  'Κάγκελο κλίνης':'Bed rail','Πόμολο':'Door handle','Πληκτρολόγιο':'Keyboard','Νιπτήρας':'Sink','Ντους':'Shower',
  'Βρύση':'Tap','Δίκτυο':'Network','Δεξαμενή':'Tank','Αντίστροφη όσμωση':'Reverse osmosis',
  'Ιατρός':'Physician','Νοσηλευτής / Νοσηλεύτρια':'Nurse','Βοηθός Νοσηλευτή':'Nursing assistant','Βοηθητικό προσωπικό':'Support staff',
  'Καθαριότητα περιβάλλοντος':'Environmental cleaning','Υγιεινή χεριών':'Hand hygiene','Χρήση ΜΑΠ':'PPE use',
  'Αλκοολούχο αντισηπτικό χεριών':'Alcohol-based handrub',
  'Μολυσματικά απόβλητα':'Infectious waste','Αιχμηρά':'Sharps','Φαρμακευτικά':'Pharmaceutical waste','Αστικού τύπου':'Municipal-type waste',
  'Ενεργό':'Active','Ανενεργό':'Inactive','Ναι':'Yes','Όχι':'No',
  'Θετικό':'Positive','Αρνητικό':'Negative','Δεν εφαρμόζεται':'Not applicable',
  'Βακτήριο':'Bacterium','Ιός':'Virus','Μύκητας':'Fungus','Παράσιτο':'Parasite',
  'Ασθενής':'Patient','Προσωπικό':'Staff','Περιβάλλον':'Environment','Νερό':'Water',
  'Επαφής':'Contact','Σταγονιδίων':'Droplet','Αερογενής':'Airborne','Προστατευτική':'Protective',
  'Μηνιαία':'Monthly','Διμηνιαία':'Every two months','Τριμηνιαία':'Quarterly','Εξαμηνιαία':'Every six months','Ετήσια':'Annual','Έκτακτη':'Ad hoc',
  'Χαμηλή':'Low','Κανονική':'Normal','Υψηλή':'High','Κρίσιμη':'Critical',
  'Ενημέρωση':'Information','Προσοχή':'Attention',
  'Κεντρικό Dashboard':'Main Dashboard','Κέντρο Ποιότητας':'Quality Center','Δείκτες':'Indicators',
  'KPI':'KPI','Λίστα':'List','Trend':'Trend','Donut':'Donut','Bar':'Bar',
  'Γενική βοήθεια':'General assistance','Ποιότητα':'Quality','Λοιμώξεις':'Infections','Εργαστήριο':'Laboratory','Έγγραφα':'Documents',
  'Δημιουργία CAPA':'Create CAPA','Δημιουργία ειδοποίησης':'Create notification','Ανάθεση εργασίας':'Assign task','Αίτημα έγκρισης':'Approval request','Δημιουργία Audit':'Create Audit',
  'Νέο συμβάν':'New incident','Νέο εύρημα Audit':'New Audit finding','Δείκτης εκτός στόχου':'Indicator outside target','Έλεγχος εκπρόθεσμος':'Overdue control','Έγγραφο προς αναθεώρηση':'Document due for review','Νέα εργαστηριακή εγγραφή':'New laboratory record',
  'Ασθενείς':'Patients','Έλεγχοι':'Controls','Εκπαίδευση':'Training',
  'Ανοικτό':'Open','Σε εξέλιξη':'In progress','Ολοκληρωμένο':'Completed',
  'Υβριδική':'Hybrid','Βιβλιοθήκη Ρυθμίσεων':'Settings library','Χειροκίνητη Καταχώρηση':'Manual entry','Προσωρινή Demo Λίστα':'Temporary demo list',
}

const SECTION_EN = {
  departments:['Departments','Hospital departments, units and areas.'],
  microorganisms:['Microorganisms','Central microorganism dictionary and classifications.'],
  antibiotics:['Antibiotics / Medicines','Antimicrobials, groups and codes.'],
  'sample-types':['Sample Types','Clinical, environmental and laboratory sample types.'],
  'body-sites':['Body Sites','Anatomical sites and systems.'],
  'infection-types':['Infection Types','Infection categories and surveillance codes.'],
  'isolation-types':['Isolation Types','Isolation and precaution measures.'],
  devices:['Devices / Equipment','Catheters, devices and medical equipment.'],
  'environment-points':['Environmental Points','Sampling points for rooms and surfaces.'],
  'water-points':['Water Points','Sampling points for networks and special installations.'],
  'professional-categories':['Professional Categories','Professional categories used in WHO and other observations.'],
  'surveillance-reasons':['Surveillance Reasons','Central options for starting patient surveillance.'],
  symptoms:['Symptoms','Symptoms used in patient clinical assessment.'],
  'risk-factors':['Risk Factors','Risk factors used in clinical assessment.'],
  'infection-sites':['Infection Sites / Types','Infection sites used in surveillance.'],
  'sample-categories':['Sample Categories','Initial, screening, carriage and follow-up categories.'],
  'sample-repeat-purposes':['Follow-up Reasons','Clearance, persistence, recurrence, reinfection and treatment.'],
  'antiseptic-products':['Antiseptic Products','Alcohol-based antiseptics and pack sizes for consumption monitoring.'],
  'waste-types':['Waste Categories','Healthcare waste categories used in measurements.'],
  'audit-types':['Prevention Audit Types','Audit and checklist templates.'],
  'bundle-types':['Bundle Types','Infection-prevention bundles.'],
}

const FIELD_EN = {
  name:'Name', code:'Code', status:'Status', group:'Group', gram:'Gram', resistance:'Classification',
  category:'Category', atc:'ATC code', volumeMl:'Pack size (ml)',
  title:'Title', trigger:'When this happens', action:'Then', owner:'Owner / role',
  description:'Description', active:'Active', scope:'Area', condition:'IF', result:'THEN',
  priority:'Priority', source:'Source', daysBefore:'Days before', recipient:'Recipient / role',
  severity:'Severity', area:'Area', visual:'View type', position:'Order',
  instruction:'System instruction', knowledge:'Allowed knowledge sources',
  approval:'Human confirmation required', canEdit:'Edit', canExport:'Export / Print',
  canStudio:'Management Center access',
}

export function studioDisplayValue(value, language='el') {
  if (value == null || value === '') return value
  return language === 'en' ? (VALUE_EN[String(value)] || value) : value
}

export function masterSectionPresentation(section, language='el') {
  if (language !== 'en') return { label: section?.label || '', description: section?.description || '' }
  const pair=SECTION_EN[section?.id]
  return { label: pair?.[0] || section?.label || '', description: pair?.[1] || section?.description || '' }
}

export function studioFieldLabel(field, language='el') {
  if (language !== 'en') return field?.label || ''
  return FIELD_EN[field?.key || field?.id] || field?.label || ''
}

export function studioOptionLabel(value, language='el') {
  return studioDisplayValue(value, language)
}

export function roleDefinitionPresentation(role, language='el') {
  return {
    label: language === 'en' ? (role?.labelEn || role?.label) : role?.label,
    description: language === 'en' ? (role?.descriptionEn || role?.description) : role?.description,
    permissions: language === 'en' ? (role?.permissionsEn || role?.permissions || []) : (role?.permissions || []),
  }
}

export function capabilityLabel(capability, language='el') {
  return language === 'en' ? (capability?.labelEn || capability?.label) : capability?.label
}

const ACCESS_LEVEL_EN = {
  'Χωρίς πρόσβαση':'No access',
  'Προβολή':'View',
  'Προβολή · Καταχώρηση':'View · Create',
  'Προβολή · Καταχώρηση · Επεξεργασία':'View · Create · Edit',
  'Πλήρης λειτουργική':'Full functional',
  'Πλήρης':'Full',
  'Με πρόσθετη αρμοδιότητα':'With additional capability',
  'Προβολή στο επιτρεπόμενο τμήμα':'View assigned department',
  'Προβολή στα επιτρεπόμενα τμήματα':'View assigned departments',
  'Καταχώρηση στο επιτρεπόμενο τμήμα':'Create in assigned department',
  'Καταχώρηση στα επιτρεπόμενα τμήματα':'Create in assigned departments',
  'Προβολή · Διαχείριση':'View · Manage',
  'Προβολή · Επεξεργασία στα επιτρεπόμενα τμήματα':'View · Edit assigned departments',
  'Προβολή · Διαχείριση στα επιτρεπόμενα τμήματα':'View · Manage assigned departments',
  'Περιορισμένη προβολή':'Limited view',
}

export function accessLevelLabel(value, language='el') {
  if (language !== 'en') return value
  return ACCESS_LEVEL_EN[value] || value
}

const MODULE_EN = {
  'Κεντρική εικόνα':'Dashboard','Εργαστήριο':'Laboratory','Ασθενείς':'Patients','Προσωπικό':'Staff',
  'Νερό':'Water','Επιφάνειες':'Surfaces','Δηλούμενα Νοσήματα':'Notifiable Diseases',
  'Υγιεινή Χεριών':'Hand Hygiene','Εμβολιασμοί':'Vaccinations','Προωθημένα Αντιβιοτικά':'Restricted Antibiotics',
  'Αντισηπτικά / Απόβλητα':'Antiseptics / Waste','Κέντρο Ποιότητας':'Quality Center',
  'Επιτροπές':'Committees','Εκπαίδευση':'Training','Έγγραφα':'Documents','LIRA AI':'LIRA AI',
  'Κέντρο Διαχείρισης':'Management Center',
}

export function moduleLabel(value, language='el') {
  return language === 'en' ? (MODULE_EN[value] || value) : value
}

const STUDIO_MODULE_EN = {
  workflows:['Smart Workflows','Automation configuration that links application events to tasks, approvals and next actions.'],
  rules:['Smart Rules','IF / THEN business-rule configuration for Healthcare Suite data and workflows.'],
  notifications:['Notifications & Rules','Notification rules, warning times and recipients for operational items.'],
  dashboards:['Dashboard Studio','Configuration of blocks available for application dashboards.'],
  ai:['AI Studio','Configuration profiles, instructions and guardrails intended for LIRA AI.'],
  security:['Security & Access','Access roles and basic security policies.'],
}
export function studioModulePresentation(moduleKey,config,language='el'){
  if(language!=='en') return {title:config?.title||'',description:config?.description||'',singular:config?.singular||''}
  const pair=STUDIO_MODULE_EN[moduleKey]
  const singular={workflows:'workflow',rules:'rule',notifications:'notification rule',dashboards:'dashboard block',ai:'AI profile',security:'role'}[moduleKey]
  return {title:pair?.[0]||config?.title||'',description:pair?.[1]||config?.description||'',singular:singular||config?.singular||''}
}
