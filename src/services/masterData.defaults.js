import { ANTIBIOTIC_OPTIONS, BASIC_MICROORGANISMS, DEVICE_OPTIONS, INFECTION_SITE_OPTIONS, ISOLATION_TYPE_OPTIONS, RISK_FACTOR_OPTIONS, SAMPLE_CATEGORY_OPTIONS, SAMPLE_REPEAT_PURPOSE_OPTIONS, SAMPLE_TYPE_OPTIONS, SURVEILLANCE_REASON_OPTIONS, SYMPTOM_OPTIONS } from '../core/constants/clinicalOptions'

const activeRows = (prefix, values, extra = () => ({})) => values
  .filter((name) => !['Άλλο','Κανένα','Κανένας','Χωρίς συμπτώματα'].includes(name))
  .map((name, index) => ({ id: `${prefix}-${index + 1}`, name, status: 'Ενεργό', ...extra(name, index) }))

const antibioticMeta = {
  'Αμοξικιλλίνη/Κλαβουλανικό': { category: 'Penicillins + inhibitor', atc: 'J01CR02' },
  'Αμπικιλλίνη/Σουλμπακτάμη': { category: 'Penicillins + inhibitor', atc: 'J01CR01' },
  'Πιπερακιλλίνη/Ταζομπακτάμη': { category: 'Penicillins + inhibitor', atc: 'J01CR05' },
  'Κεφτριαξόνη': { category: 'Cephalosporins', atc: 'J01DD04' },
  'Κεφοταξίμη': { category: 'Cephalosporins', atc: 'J01DD01' },
  'Κεφεπίμη': { category: 'Cephalosporins', atc: 'J01DE01' },
  'Κεφταζιδίμη': { category: 'Cephalosporins', atc: 'J01DD02' },
  'Μεροπενέμη': { category: 'Carbapenems', atc: 'J01DH02', restricted: true },
  'Ιμιπενέμη': { category: 'Carbapenems', atc: 'J01DH51', restricted: true },
  'Ερταπενέμη': { category: 'Carbapenems', atc: 'J01DH03', restricted: true },
  'Σιπροφλοξασίνη': { category: 'Fluoroquinolones', atc: 'J01MA02' },
  'Λεβοφλοξασίνη': { category: 'Fluoroquinolones', atc: 'J01MA12' },
  'Γενταμικίνη': { category: 'Aminoglycosides', atc: 'J01GB03' },
  'Αμικασίνη': { category: 'Aminoglycosides', atc: 'J01GB06' },
  'Βανκομυκίνη': { category: 'Glycopeptides', atc: 'J01XA01' },
  'Τεϊκοπλανίνη': { category: 'Glycopeptides', atc: 'J01XA02' },
  'Λινεζολίδη': { category: 'Oxazolidinones', atc: 'J01XX08' },
  'Δαπτομυκίνη': { category: 'Lipopeptides', atc: 'J01XX09' },
  'Κολιστίνη': { category: 'Polymyxins', atc: 'J01XB01', restricted: true },
  'Τιγεκυκλίνη': { category: 'Glycylcyclines', atc: 'J01AA12', restricted: true },
  'Μετρονιδαζόλη': { category: 'Nitroimidazoles', atc: 'J01XD01' },
}

const microorganismMeta = {
  'Escherichia coli': { group: 'Βακτήριο', gram: 'Αρνητικό' },
  'Proteus spp.': { group: 'Βακτήριο', gram: 'Αρνητικό' },
  'Acinetobacter spp.': { group: 'Βακτήριο', gram: 'Αρνητικό' },
  'Klebsiella spp.': { group: 'Βακτήριο', gram: 'Αρνητικό' },
  'Enterobacter spp.': { group: 'Βακτήριο', gram: 'Αρνητικό' },
  'Pseudomonas aeruginosa': { group: 'Βακτήριο', gram: 'Αρνητικό' },
  'Staphylococcus aureus': { group: 'Βακτήριο', gram: 'Θετικό' },
  'Enterococcus spp.': { group: 'Βακτήριο', gram: 'Θετικό' },
  'Clostridioides difficile': { group: 'Βακτήριο', gram: 'Θετικό' },
  'Candida spp.': { group: 'Μύκητας', gram: 'Δεν εφαρμόζεται' },
  'Candida auris': { group: 'Μύκητας', gram: 'Δεν εφαρμόζεται' },
}

export const DEFAULT_MASTER_DATA = {
  microorganisms: activeRows('micro', [...BASIC_MICROORGANISMS.filter(x => x !== 'Άλλο'), 'Candida auris'], (name) => microorganismMeta[name] || {}),
  antibiotics: activeRows('ab', ANTIBIOTIC_OPTIONS, (name) => antibioticMeta[name] || {}),
  'sample-types': [
    ...activeRows('sample', SAMPLE_TYPE_OPTIONS.filter(x => x !== 'Άλλο'), (name) => ({ category: 'Ασθενής', categories: ['Ρινικό επίχρισμα','Φαρυγγικό επίχρισμα','Ορθικό επίχρισμα'].includes(name) ? ['Ασθενής','Προσωπικό'] : ['Ασθενής'] })),
    { id: 'sample-env-1', name: 'Επίχρισμα επιφάνειας', category: 'Περιβάλλον', categories: ['Περιβάλλον'], status: 'Ενεργό' },
    { id: 'sample-env-2', name: 'Δείγμα εξοπλισμού', category: 'Περιβάλλον', categories: ['Περιβάλλον'], status: 'Ενεργό' },
    { id: 'sample-water-1', name: 'Νερό δικτύου', category: 'Νερό', categories: ['Νερό'], status: 'Ενεργό' },
    { id: 'sample-water-2', name: 'Νερό αιμοκάθαρσης', category: 'Νερό', categories: ['Νερό'], status: 'Ενεργό' },
  ],
  'surveillance-reasons': activeRows('surv-reason', SURVEILLANCE_REASON_OPTIONS),
  symptoms: activeRows('symptom', SYMPTOM_OPTIONS),
  devices: activeRows('device', DEVICE_OPTIONS, (name) => ({ category: name.includes('καθετήρ') ? 'Καθετήρας' : 'Συσκευή' })),
  'risk-factors': activeRows('risk', RISK_FACTOR_OPTIONS),
  'infection-sites': activeRows('site', INFECTION_SITE_OPTIONS),
  'isolation-types': activeRows('isolation', ISOLATION_TYPE_OPTIONS),
  'sample-categories': activeRows('sample-category', SAMPLE_CATEGORY_OPTIONS),
  'sample-repeat-purposes': activeRows('sample-repeat', SAMPLE_REPEAT_PURPOSE_OPTIONS),
  departments: [
    { id: 'dep-1', name: 'ΜΕΘ', code: 'ICU', status: 'Ενεργό' },
    { id: 'dep-2', name: 'Χειρουργείο', code: 'OR', status: 'Ενεργό' },
    { id: 'dep-3', name: 'Παθολογική', code: 'PATH', status: 'Ενεργό' },
    { id: 'dep-4', name: 'Αποστείρωση', code: 'CSSD', status: 'Ενεργό' },
    { id: 'dep-5', name: 'Αιμοκάθαρση', code: 'HD', status: 'Ενεργό' },
    { id: 'dep-6', name: 'ΤΕΠ', code: 'ED', status: 'Ενεργό' },
    { id: 'dep-7', name: 'Παιδιατρική', code: 'PED', status: 'Ενεργό' },
    { id: 'dep-8', name: 'Μικροβιολογικό Εργαστήριο', code: 'LAB', status: 'Ενεργό' },
    { id: 'dep-9', name: 'Χειρουργική Κλινική', code: 'SURG', status: 'Ενεργό' },
    { id: 'dep-10', name: 'Τεχνική Υπηρεσία', code: 'TECH', status: 'Ενεργό' },
  ],
  'professional-categories': activeRows('pro', ['Ιατρός','Νοσηλευτής / Νοσηλεύτρια','Βοηθός Νοσηλευτή','Τεχνολόγος Εργαστηρίου','Παρασκευαστής','Μαία / Μαιευτής','Φυσικοθεραπευτής','Τεχνικός','Διοικητικό προσωπικό','Βοηθητικό προσωπικό']),
  'waste-types': [
    { id: 'waste-1', name: 'ΕΑΑΜ – Επικίνδυνα Απόβλητα Αμιγώς Μολυσματικά', category: 'Επικίνδυνα', status: 'Ενεργό' },
    { id: 'waste-2', name: 'ΜΕΑ – Μικτά Επικίνδυνα Απόβλητα', category: 'Επικίνδυνα', status: 'Ενεργό' },
    { id: 'waste-3', name: 'ΑΕΑ – Άλλα Επικίνδυνα Απόβλητα', category: 'Επικίνδυνα', status: 'Ενεργό' },
    { id: 'waste-4', name: 'Αιχμηρά αντικείμενα', category: 'Επικίνδυνα', status: 'Ενεργό' },
  ],
  'antiseptic-products': [{ id: 'ant-prod-1', name: 'Αλκοολούχο αντισηπτικό χεριών 500 ml', volumeMl: '500', status: 'Ενεργό' }],
  'control-types': [
    { id: 'ctrl-type-1', name: 'Legionella', category: 'Νερό', status: 'Ενεργό' },
    { id: 'ctrl-type-2', name: 'Μικροβιολογικός έλεγχος νερού', category: 'Νερό', status: 'Ενεργό' },
    { id: 'ctrl-type-3', name: 'Νερό αιμοκάθαρσης', category: 'Νερό', status: 'Ενεργό' },
    { id: 'ctrl-type-4', name: 'Επιφάνειες', category: 'Περιβάλλον', status: 'Ενεργό' },
    { id: 'ctrl-type-5', name: 'HVAC / αέρας', category: 'Περιβάλλον', status: 'Ενεργό' },
    { id: 'ctrl-type-6', name: 'Ιατροτεχνολογικός εξοπλισμός', category: 'Περιβάλλον', status: 'Ενεργό' },
  ],
}

