import { readJsonArray, writeJson } from '../core/storage'
import { emitAppEvent } from '../core/events'

const KEY='healthcare-suite.user-accounts'
export const USER_ACCOUNTS_EVENT='limoxis:user-accounts-updated'

export const ROLE_DEFINITIONS = Object.freeze([
  {
    id:'admin',
    label:'Διαχειριστής',
    description:'Πλήρης λειτουργική και διοικητική πρόσβαση στην εγκατάσταση του Healthcare Suite.',
    permissions:['Πλήρης πρόσβαση','Κέντρο Διαχείρισης','Χρήστες & Ρόλοι','Όλα τα τμήματα','Διαγραφή όπου επιτρέπεται'],
  },
  {
    id:'infection_liaison',
    label:'Σύνδεσμος Λοιμώξεων',
    description:'Επιτήρηση και πρόληψη στα τμήματα ευθύνης του, χωρίς πρόσβαση στη διαχείριση της πλατφόρμας.',
    permissions:['Επιτήρηση','Ασθενείς','Εργαστήριο','Νερό','Επιφάνειες','Πρόληψη','Δείκτες'],
  },
  {
    id:'department_user',
    label:'Χρήστης Τμήματος',
    description:'Περιορισμένη πρόσβαση στις επιτρεπόμενες λειτουργίες και στα δεδομένα των τμημάτων που του έχουν δοθεί.',
    permissions:['Προβολή στα επιτρεπόμενα τμήματα','Καταχώρηση στα επιτρεπόμενα τμήματα','Χωρίς Κέντρο Διαχείρισης'],
  },
])

export const EXTRA_CAPABILITIES = Object.freeze([
  {id:'hand_hygiene_observer',label:'Παρατηρητής Υγιεινής Χεριών'},
  {id:'quality',label:'Κέντρο Ποιότητας'},
  {id:'committees',label:'Επιτροπές'},
  {id:'training',label:'Εκπαίδευση'},
  {id:'laboratory',label:'Εργαστήριο'},
  {id:'lira',label:'LIRA AI'},
])

export const ROLE_PERMISSION_MATRIX = Object.freeze([
  {module:'Κεντρική εικόνα',admin:'Πλήρης',infection_liaison:'Προβολή στα επιτρεπόμενα τμήματα',department_user:'Προβολή στα επιτρεπόμενα τμήματα'},
  {module:'Εργαστήριο',admin:'Πλήρης',infection_liaison:'Προβολή · Καταχώρηση · Επεξεργασία',department_user:'Προβολή · Καταχώρηση στα επιτρεπόμενα τμήματα'},
  {module:'Ασθενείς',admin:'Πλήρης',infection_liaison:'Προβολή · Καταχώρηση · Επεξεργασία',department_user:'Προβολή · Καταχώρηση στα επιτρεπόμενα τμήματα'},
  {module:'Προσωπικό',admin:'Πλήρης',infection_liaison:'Προβολή · Επεξεργασία στα επιτρεπόμενα τμήματα',department_user:'Μόνο με ειδική αρμοδιότητα'},
  {module:'Νερό',admin:'Πλήρης',infection_liaison:'Προβολή · Καταχώρηση · Επεξεργασία',department_user:'Προβολή · Καταχώρηση στα επιτρεπόμενα τμήματα'},
  {module:'Επιφάνειες',admin:'Πλήρης',infection_liaison:'Προβολή · Καταχώρηση · Επεξεργασία',department_user:'Προβολή · Καταχώρηση στα επιτρεπόμενα τμήματα'},
  {module:'Δηλούμενα Νοσήματα',admin:'Πλήρης',infection_liaison:'Πλήρης λειτουργική',department_user:'Χωρίς πρόσβαση'},
  {module:'Υγιεινή Χεριών',admin:'Πλήρης',infection_liaison:'Προβολή',department_user:'Με αρμοδιότητα WHO'},
  {module:'Εμβολιασμοί',admin:'Πλήρης',infection_liaison:'Προβολή · Επεξεργασία στα επιτρεπόμενα τμήματα',department_user:'Χωρίς πρόσβαση'},
  {module:'Προωθημένα Αντιβιοτικά',admin:'Πλήρης',infection_liaison:'Προβολή · Διαχείριση',department_user:'Περιορισμένη προβολή'},
  {module:'Αντισηπτικά / Απόβλητα',admin:'Πλήρης',infection_liaison:'Προβολή · Καταχώρηση',department_user:'Καταχώρηση στα επιτρεπόμενα τμήματα'},
  {module:'Κέντρο Ποιότητας',admin:'Πλήρης',infection_liaison:'Προβολή',department_user:'Με αρμοδιότητα Quality'},
  {module:'Επιτροπές',admin:'Πλήρης',infection_liaison:'Με αρμοδιότητα',department_user:'Με αρμοδιότητα'},
  {module:'Εκπαίδευση',admin:'Πλήρης',infection_liaison:'Προβολή · Διαχείριση στα επιτρεπόμενα τμήματα',department_user:'Προβολή τμήματος'},
  {module:'Έγγραφα',admin:'Πλήρης',infection_liaison:'Προβολή στα επιτρεπόμενα τμήματα',department_user:'Προβολή επιτρεπόμενων'},
  {module:'LIRA AI',admin:'Πλήρης',infection_liaison:'Με αρμοδιότητα LIRA',department_user:'Με αρμοδιότητα LIRA'},
  {module:'Κέντρο Διαχείρισης',admin:'Πλήρης',infection_liaison:'Χωρίς πρόσβαση',department_user:'Χωρίς πρόσβαση'},
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
export function roleLabel(role){ return ROLE_DEFINITIONS.find(x=>x.id===role)?.label||role||'—' }
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
