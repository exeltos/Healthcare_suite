import { readJsonArray, writeJson } from '../core/storage'
import { emitAppEvent } from '../core/events'

const KEY='healthcare-suite.user-accounts'
export const USER_ACCOUNTS_EVENT='limoxis:user-accounts-updated'

export const ROLE_DEFINITIONS = Object.freeze([
  {
    id:'admin',
    label:'Διαχειριστής',
    labelEn:'Administrator',
    description:'Πλήρης λειτουργική και διοικητική πρόσβαση στην εγκατάσταση του Healthcare Suite.',
    descriptionEn:'Full functional and administrative access to the Healthcare Suite installation.',
    permissions:['Πλήρης πρόσβαση','Κέντρο Διαχείρισης','Χρήστες & Ρόλοι','Όλα τα τμήματα','Διαγραφή όπου επιτρέπεται'],
    permissionsEn:['Full access','Management Center','Users & Roles','All departments','Deletion where allowed'],
  },
  {
    id:'infection_lead',
    label:'Προϊστάμενος Λοιμώξεων',
    labelEn:'Infection Control Lead',
    description:'Διευρυμένη λειτουργική πρόσβαση στην επιτήρηση, πρόληψη, εργαστήριο, δείκτες και συντονισμό λοιμώξεων.',
    descriptionEn:'Extended functional access to surveillance, prevention, laboratory, indicators and infection-control coordination.',
    permissions:['Επιτήρηση & Ασθενείς','Εργαστήριο','Πρόληψη','Δείκτες','Εκπαίδευση','Επιτροπές'],
    permissionsEn:['Surveillance & Patients','Laboratory','Prevention','Indicators','Training','Committees'],
  },
  {
    id:'infection_liaison',
    label:'Σύνδεσμος Λοιμώξεων',
    labelEn:'Infection Control Liaison',
    description:'Επιτήρηση και πρόληψη στα τμήματα ευθύνης του, χωρίς πρόσβαση στη διαχείριση της πλατφόρμας.',
    descriptionEn:'Surveillance and prevention in assigned departments, without platform administration access.',
    permissions:['Επιτήρηση','Ασθενείς','Εργαστήριο','Νερό','Επιφάνειες','Πρόληψη','Δείκτες'],
    permissionsEn:['Surveillance','Patients','Laboratory','Water','Surfaces','Prevention','Indicators'],
  },
  {
    id:'medical_reviewer',
    label:'Ιατρός Ελεγκτής',
    labelEn:'Medical Reviewer',
    description:'Κλινική αξιολόγηση, έλεγχος αντιμικροβιακής αγωγής και πρόσβαση σε σχετικά εργαστηριακά και ποιοτικά δεδομένα.',
    descriptionEn:'Clinical review, antimicrobial-therapy oversight and access to related laboratory and quality data.',
    permissions:['Ασθενείς','Εργαστήριο','Προωθημένα Αντιβιοτικά','Δείκτες','Κέντρο Ποιότητας'],
    permissionsEn:['Patients','Laboratory','Restricted Antibiotics','Indicators','Quality Center'],
  },
  {
    id:'department_user',
    label:'Χρήστης Τμήματος',
    labelEn:'Department User',
    description:'Περιορισμένη πρόσβαση στις επιτρεπόμενες λειτουργίες και στα δεδομένα των τμημάτων που του έχουν δοθεί.',
    descriptionEn:'Limited access to permitted functions and data from assigned departments.',
    permissions:['Προβολή στα επιτρεπόμενα τμήματα','Καταχώρηση στα επιτρεπόμενα τμήματα','Χωρίς Κέντρο Διαχείρισης'],
    permissionsEn:['View assigned departments','Entry in assigned departments','No Management Center'],
  },
  {
    id:'laboratory',
    label:'Εργαστήριο',
    labelEn:'Laboratory',
    description:'Πλήρης λειτουργική πρόσβαση στις εργαστηριακές εγγραφές και περιορισμένη προβολή των σχετικών κλινικών στοιχείων.',
    descriptionEn:'Full functional access to laboratory records and limited view of related clinical data.',
    permissions:['Εργαστήριο','Σχετικά στοιχεία ασθενών','Επιτήρηση αποτελεσμάτων','Χωρίς Κέντρο Διαχείρισης'],
    permissionsEn:['Laboratory','Related patient details','Result surveillance','No Management Center'],
  },
  {
    id:'demo',
    label:'Demo',
    labelEn:'Demo',
    description:'Περιβάλλον επίδειξης χωρίς διοικητικές αλλαγές και χωρίς πρόσβαση σε πραγματικά δεδομένα.',
    descriptionEn:'Demonstration environment without administrative changes or access to real data.',
    permissions:['Προβολή demo δεδομένων','Δοκιμαστικές καταχωρήσεις όπου επιτρέπεται','Χωρίς διαχείριση'],
    permissionsEn:['View demo data','Demo entries where allowed','No administration'],
  },
])

export const EXTRA_CAPABILITIES = Object.freeze([
  {id:'hand_hygiene_observer',label:'Παρατηρητής Υγιεινής Χεριών',labelEn:'Hand Hygiene Observer'},
  {id:'staff_directory',label:'Διαχείριση Προσωπικού',labelEn:'Staff Directory Management'},
  {id:'quality',label:'Κέντρο Ποιότητας',labelEn:'Quality Center'},
  {id:'committees',label:'Επιτροπές',labelEn:'Committees'},
  {id:'training',label:'Εκπαίδευση',labelEn:'Training'},
  {id:'documents',label:'Έγγραφα',labelEn:'Documents'},
  {id:'laboratory',label:'Εργαστήριο',labelEn:'Laboratory'},
  {id:'lira',label:'LIRA AI',labelEn:'LIRA AI'},
])

export const ROLE_PERMISSION_MATRIX = Object.freeze([
  {module:'Κεντρική εικόνα',admin:'Πλήρης',infection_lead:'Πλήρης',infection_liaison:'Προβολή στα επιτρεπόμενα τμήματα',medical_reviewer:'Προβολή',department_user:'Προβολή στα επιτρεπόμενα τμήματα',laboratory:'Προβολή',demo:'Προβολή'},
  {module:'Εργαστήριο',admin:'Πλήρης',infection_lead:'Πλήρης λειτουργική',infection_liaison:'Προβολή · Καταχώρηση · Επεξεργασία',medical_reviewer:'Προβολή · Καταχώρηση · Επεξεργασία',department_user:'Προβολή · Καταχώρηση στα επιτρεπόμενα τμήματα',laboratory:'Πλήρης λειτουργική',demo:'Προβολή · Καταχώρηση'},
  {module:'Ασθενείς',admin:'Πλήρης',infection_lead:'Πλήρης λειτουργική',infection_liaison:'Προβολή · Καταχώρηση · Επεξεργασία',medical_reviewer:'Προβολή · Καταχώρηση · Επεξεργασία',department_user:'Προβολή · Καταχώρηση στα επιτρεπόμενα τμήματα',laboratory:'Προβολή',demo:'Προβολή · Καταχώρηση'},
  {module:'Προσωπικό',admin:'Πλήρης',infection_lead:'Πλήρης λειτουργική',infection_liaison:'Προβολή · Επεξεργασία στα επιτρεπόμενα τμήματα',medical_reviewer:'Προβολή',department_user:'Με πρόσθετη αρμοδιότητα',laboratory:'Προβολή',demo:'Προβολή'},
  {module:'Νερό',admin:'Πλήρης',infection_lead:'Πλήρης λειτουργική',infection_liaison:'Προβολή · Καταχώρηση · Επεξεργασία',medical_reviewer:'Προβολή',department_user:'Προβολή · Καταχώρηση στα επιτρεπόμενα τμήματα',laboratory:'Προβολή · Καταχώρηση · Επεξεργασία',demo:'Προβολή · Καταχώρηση'},
  {module:'Επιφάνειες',admin:'Πλήρης',infection_lead:'Πλήρης λειτουργική',infection_liaison:'Προβολή · Καταχώρηση · Επεξεργασία',medical_reviewer:'Προβολή',department_user:'Προβολή · Καταχώρηση στα επιτρεπόμενα τμήματα',laboratory:'Προβολή · Καταχώρηση · Επεξεργασία',demo:'Προβολή · Καταχώρηση'},
  {module:'Δηλούμενα Νοσήματα',admin:'Πλήρης',infection_lead:'Πλήρης λειτουργική',infection_liaison:'Πλήρης λειτουργική',medical_reviewer:'Προβολή',department_user:'Χωρίς πρόσβαση',laboratory:'Χωρίς πρόσβαση',demo:'Προβολή'},
  {module:'Υγιεινή Χεριών',admin:'Πλήρης',infection_lead:'Πλήρης λειτουργική',infection_liaison:'Πλήρης λειτουργική',medical_reviewer:'Προβολή',department_user:'Με πρόσθετη αρμοδιότητα',laboratory:'Χωρίς πρόσβαση',demo:'Προβολή · Καταχώρηση'},
  {module:'Εμβολιασμοί',admin:'Πλήρης',infection_lead:'Πλήρης λειτουργική',infection_liaison:'Προβολή · Επεξεργασία στα επιτρεπόμενα τμήματα',medical_reviewer:'Προβολή',department_user:'Χωρίς πρόσβαση',laboratory:'Χωρίς πρόσβαση',demo:'Προβολή'},
  {module:'Προωθημένα Αντιβιοτικά',admin:'Πλήρης',infection_lead:'Πλήρης λειτουργική',infection_liaison:'Προβολή · Διαχείριση',medical_reviewer:'Πλήρης λειτουργική',department_user:'Προβολή',laboratory:'Προβολή',demo:'Προβολή'},
  {module:'Αντισηπτικά / Απόβλητα',admin:'Πλήρης',infection_lead:'Πλήρης λειτουργική',infection_liaison:'Προβολή · Καταχώρηση',medical_reviewer:'Προβολή',department_user:'Καταχώρηση στο επιτρεπόμενο τμήμα',laboratory:'Χωρίς πρόσβαση',demo:'Προβολή · Καταχώρηση'},
  {module:'Κέντρο Ποιότητας',admin:'Πλήρης',infection_lead:'Προβολή · Καταχώρηση · Επεξεργασία',infection_liaison:'Προβολή',medical_reviewer:'Προβολή · Καταχώρηση',department_user:'Με πρόσθετη αρμοδιότητα',laboratory:'Χωρίς πρόσβαση',demo:'Προβολή'},
  {module:'Επιτροπές',admin:'Πλήρης',infection_lead:'Πλήρης λειτουργική',infection_liaison:'Με πρόσθετη αρμοδιότητα',medical_reviewer:'Με πρόσθετη αρμοδιότητα',department_user:'Με πρόσθετη αρμοδιότητα',laboratory:'Με πρόσθετη αρμοδιότητα',demo:'Προβολή'},
  {module:'Εκπαίδευση',admin:'Πλήρης',infection_lead:'Πλήρης λειτουργική',infection_liaison:'Προβολή · Διαχείριση',medical_reviewer:'Προβολή',department_user:'Προβολή στο επιτρεπόμενο τμήμα',laboratory:'Προβολή',demo:'Προβολή'},
  {module:'Έγγραφα',admin:'Πλήρης',infection_lead:'Πλήρης λειτουργική',infection_liaison:'Προβολή στα επιτρεπόμενα τμήματα',medical_reviewer:'Προβολή',department_user:'Προβολή στα επιτρεπόμενα τμήματα',laboratory:'Προβολή',demo:'Προβολή'},
  {module:'LIRA AI',admin:'Πλήρης',infection_lead:'Με πρόσθετη αρμοδιότητα',infection_liaison:'Με πρόσθετη αρμοδιότητα',medical_reviewer:'Με πρόσθετη αρμοδιότητα',department_user:'Με πρόσθετη αρμοδιότητα',laboratory:'Με πρόσθετη αρμοδιότητα',demo:'Προβολή'},
  {module:'Κέντρο Διαχείρισης',admin:'Πλήρης',infection_lead:'Χωρίς πρόσβαση',infection_liaison:'Χωρίς πρόσβαση',medical_reviewer:'Χωρίς πρόσβαση',department_user:'Χωρίς πρόσβαση',laboratory:'Χωρίς πρόσβαση',demo:'Χωρίς πρόσβαση'},
])


const ROLE_CONFIG_KEY='healthcare-suite.role-config'
export function loadRoleConfig(){
  const stored=readJsonArray(ROLE_CONFIG_KEY,[])
  if(!stored.length) return ROLE_PERMISSION_MATRIX.map(row=>({...row}))
  return ROLE_PERMISSION_MATRIX.map(row=>({...row,...(stored.find(x=>x.module===row.module)||{})}))
}
export function saveRoleConfig(rows=[]){
  writeJson(ROLE_CONFIG_KEY,Array.isArray(rows)?rows:[])
  emitAppEvent(USER_ACCOUNTS_EVENT,{entityType:'role-config'})
  return rows
}

export function loadUserAccounts(){ return readJsonArray(KEY,[]) }
export function roleLabel(role, language='el'){
  const definition=ROLE_DEFINITIONS.find(x=>x.id===role)
  return (language==='en'?definition?.labelEn:definition?.label)||definition?.label||role||'—'
}
function persist(rows){
  writeJson(KEY,rows)
  const verified=readJsonArray(KEY,[])
  if(JSON.stringify(verified)!==JSON.stringify(rows)) throw new Error('Δεν ήταν δυνατή η μόνιμη αποθήκευση του μητρώου Χρηστών.')
  emitAppEvent(USER_ACCOUNTS_EVENT,{entityType:'user-account'})
  return verified
}

export function saveUserAccount(input={}){
  const rows=loadUserAccounts()
  const now=new Date().toISOString()
  const row={
    id:input.id||`USR-${Date.now()}`,
    employeeId:input.employeeId||'',
    displayName:input.displayName||'',
    username:String(input.username||'').trim(),
    email:String(input.email||'').trim(),
    department:input.department||'',
    role:input.role||'department_user',
    status:input.status||'pending',
    capabilities:Array.isArray(input.capabilities)?input.capabilities:[],
    scopeMode:['own','selected','all'].includes(input.scopeMode)?input.scopeMode:'own',
    scopeDepartments:Array.isArray(input.scopeDepartments)?input.scopeDepartments:[],
    createdAt:input.createdAt||now,
    updatedAt:now,
    lastLogin:input.lastLogin||null,
    inviteSentAt:input.inviteSentAt||null,
    resetRequestedAt:input.resetRequestedAt||null,
  }
  if(!row.username) throw new Error('Το username είναι υποχρεωτικό.')
  if(rows.some(x=>x.id!==row.id&&String(x.username).toLowerCase()===row.username.toLowerCase())) throw new Error('Το username χρησιμοποιείται ήδη.')
  if(row.employeeId && rows.some(x=>x.id!==row.id&&String(x.employeeId)===String(row.employeeId))) throw new Error('Ο εργαζόμενος έχει ήδη λογαριασμό πρόσβασης.')
  if(row.scopeMode==='selected' && !row.scopeDepartments.length) throw new Error('Επιλέξτε τουλάχιστον ένα τμήμα στην «Πρόσβαση σε τμήματα».')
  const next=rows.some(x=>x.id===row.id)?rows.map(x=>x.id===row.id?row:x):[row,...rows]
  persist(next)
  return row
}

export function sendAccountInvite(id){
  const row=loadUserAccounts().find(x=>x.id===id)
  return row?saveUserAccount({...row,status:'invited',inviteSentAt:new Date().toISOString()}):null
}
export function requestPasswordReset(id){
  const row=loadUserAccounts().find(x=>x.id===id)
  if(!row)return null
  const next={...row,resetRequestedAt:new Date().toISOString()}
  persist(loadUserAccounts().map(x=>x.id===id?next:x))
  return next
}
export function deleteUserAccount(id){ persist(loadUserAccounts().filter(x=>x.id!==id)) }
