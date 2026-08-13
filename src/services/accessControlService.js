import { ROLE_PERMISSION_MATRIX } from './userAccountsService'

const NO_ACCESS = new Set(['Χωρίς πρόσβαση'])
const VIEW_ONLY = new Set([
  'Προβολή',
  'Προβολή στο επιτρεπόμενο τμήμα',
  'Προβολή στα επιτρεπόμενα τμήματα',
  'Περιορισμένη προβολή',
])

export const MODULES = Object.freeze({
  DASHBOARD:'Κεντρική εικόνα',
  LABORATORY:'Εργαστήριο',
  PATIENTS:'Ασθενείς',
  EMPLOYEES:'Προσωπικό',
  WATER:'Νερό',
  SURFACES:'Επιφάνειες',
  NOTIFIABLE:'Δηλούμενα Νοσήματα',
  HAND_HYGIENE:'Υγιεινή Χεριών',
  VACCINATIONS:'Εμβολιασμοί',
  PROMOTED_ANTIBIOTICS:'Προωθημένα Αντιβιοτικά',
  ANTISEPTICS_WASTE:'Αντισηπτικά / Απόβλητα',
  QUALITY:'Κέντρο Ποιότητας',
  COMMITTEES:'Επιτροπές',
  TRAINING:'Εκπαίδευση',
  DOCUMENTS:'Έγγραφα',
  LIRA:'LIRA AI',
  STUDIO:'Κέντρο Διαχείρισης',
})

const CAPABILITY_BY_MODULE = Object.freeze({
  [MODULES.EMPLOYEES]:'staff_directory',
  [MODULES.HAND_HYGIENE]:'hand_hygiene_observer',
  [MODULES.QUALITY]:'quality',
  [MODULES.COMMITTEES]:'committees',
  [MODULES.TRAINING]:'training',
  [MODULES.DOCUMENTS]:'documents',
  [MODULES.LABORATORY]:'laboratory',
  [MODULES.LIRA]:'lira',
})

export function defaultModuleAccess(role='department_user'){
  return Object.fromEntries(ROLE_PERMISSION_MATRIX.map(row=>[row.module,row[role]||'Χωρίς πρόσβαση']))
}

export function moduleAccessForUser(user){
  if(user?.demo===true) return Object.fromEntries(ROLE_PERMISSION_MATRIX.map(row=>[row.module,row.demo||'Προβολή']))
  if(user?.moduleAccess && typeof user.moduleAccess==='object') return user.moduleAccess
  return defaultModuleAccess(user?.role||'department_user')
}

export function accessLevelFor(user,module){
  return moduleAccessForUser(user)?.[module]||'Χωρίς πρόσβαση'
}

export function canViewModule(user,module){
  if(user?.demo===true) return true
  const level=accessLevelFor(user,module)
  if(NO_ACCESS.has(level)) return false
  if(level==='Με πρόσθετη αρμοδιότητα'){
    const capability=CAPABILITY_BY_MODULE[module]
    return Boolean(capability && (user?.capabilities||[]).includes(capability))
  }
  return true
}

function capabilityAllows(user,module,level){
  if(level!=='Με πρόσθετη αρμοδιότητα') return true
  const capability=CAPABILITY_BY_MODULE[module]
  return Boolean(capability && (user?.capabilities||[]).includes(capability))
}

export function canPerformModuleAction(user,module,action='view'){
  if(user?.demo===true) return action!=='delete'
  const level=accessLevelFor(user,module)
  if(NO_ACCESS.has(level)||!capabilityAllows(user,module,level)) return false
  if(action==='view') return true
  if(VIEW_ONLY.has(level)) return false
  if(level==='Με πρόσθετη αρμοδιότητα') return true

  const full=level==='Πλήρης'||level==='Πλήρης λειτουργική'||level.includes('Διαχείριση')
  if(action==='create') return full||level.includes('Καταχώρηση')
  if(action==='edit') return full||level.includes('Επεξεργασία')
  if(action==='delete') return full
  return false
}

export function canWriteModule(user,module){
  return canPerformModuleAction(user,module,'create')||canPerformModuleAction(user,module,'edit')
}

export function moduleForPath(pathname=''){
  const p=String(pathname||'')
  if(p.startsWith('/studio')||p.startsWith('/forms/designer')) return MODULES.STUDIO
  if(p.startsWith('/quality')||p.startsWith('/reports')||p.startsWith('/indicators')) return MODULES.QUALITY
  if(p.startsWith('/committees')) return MODULES.COMMITTEES
  if(p.startsWith('/training')) return MODULES.TRAINING
  if(p.startsWith('/documents')) return MODULES.DOCUMENTS
  if(p.startsWith('/employees')) return MODULES.EMPLOYEES
  if(p.startsWith('/patients')||p.startsWith('/surveillance/infections')||p.startsWith('/surveillance/isolations')||p.startsWith('/surveillance/patient-samples')||p==='/surveillance') return MODULES.PATIENTS
  if(p.startsWith('/laboratory/water')||p==='/water') return MODULES.WATER
  if(p.startsWith('/laboratory/environment')) return MODULES.SURFACES
  if(p.startsWith('/laboratory')) return MODULES.LABORATORY
  if(p.startsWith('/records/notifiable-diseases')) return MODULES.NOTIFIABLE
  if(p.startsWith('/prevention/hand-hygiene')) return MODULES.HAND_HYGIENE
  if(p.startsWith('/prevention/vaccinations')) return MODULES.VACCINATIONS
  if(p.startsWith('/prevention/promoted-antibiotics')) return MODULES.PROMOTED_ANTIBIOTICS
  if(p.startsWith('/prevention/antiseptic-consumption')||p.startsWith('/prevention/waste')) return MODULES.ANTISEPTICS_WASTE
  if(p.startsWith('/prevention')) return MODULES.HAND_HYGIENE
  if(p.startsWith('/lira')) return MODULES.LIRA
  return MODULES.DASHBOARD
}
