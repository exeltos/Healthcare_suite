import { APP_EVENTS, emitAppEvent } from '../core/events'
import { IS_PRODUCTION } from '../core/runtime'
import { clinicalSupportRepository } from '../repositories/clinicalSupportRepository'
export const NOTIFIABLE_DISEASES_EVENT = APP_EVENTS.NOTIFIABLE_DISEASES_UPDATED

export const EODY_DISEASES = [
  ['Αιμορραγικοί ιογενείς πυρετοί', 'Αμέσως'],
  ['Αλλαντίαση', 'Αμέσως'],
  ['Άνθρακας', 'Αμέσως'],
  ['Ασυνήθιστο συμβάν / συρροή κρουσμάτων', 'Αμέσως'],
  ['Βρουκέλλωση', 'Εβδομάδα'],
  ['Γρίπη εργαστηριακά επιβεβαιωμένη', '24ωρο'],
  ['Δάγκειος πυρετός', 'Αμέσως'],
  ['Διφθερίτιδα', 'Αμέσως'],
  ['Λοίμωξη από ιό Δυτικού Νείλου', '24ωρο'],
  ['Ελονοσία', '24ωρο'],
  ['Ερυθρά', '24ωρο'],
  ['Ηπατίτιδα Α, οξεία', '24ωρο'],
  ['Ηπατίτιδα Β', 'Εβδομάδα'],
  ['Ηπατίτιδα C', 'Εβδομάδα'],
  ['Ιλαρά', '24ωρο'],
  ['Καμπυλοβακτηρίδιο', '24ωρο'],
  ['Κοκκύτης', '24ωρο'],
  ['Λεγιονέλλωση / Πυρετός Pontiac', '24ωρο'],
  ['Λιστερίωση', 'Εβδομάδα'],
  ['Μηνιγγίτιδα', '24ωρο'],
  ['Μηνιγγιτιδοκοκκική νόσος', '24ωρο'],
  ['Παρωτίτιδα', '24ωρο'],
  ['Πολιομυελίτιδα / οξεία χαλαρή παράλυση', 'Αμέσως'],
  ['Σαλμονέλλωση', '24ωρο'],
  ['Σιγκέλλωση', '24ωρο'],
  ['Συρροή τροφιμογενούς / υδατογενούς νοσήματος', '24ωρο'],
  ['Φυματίωση', 'Εβδομάδα'],
  ['Χολέρα', 'Αμέσως'],
].map(([name, deadline]) => ({ name, deadline }))

const seed = [
  { id:'YDN-2026-0003', disease:'Λεγιονέλλωση / Πυρετός Pontiac', deadline:'24ωρο', patientName:'Ιωάννης Παπαδόπουλος', patientCode:'ΑΣΘ-1042', department:'Παθολογική', diagnosisDate:'2026-08-04', declarationDate:'', status:'Προς δήλωση', caseClassification:'Πιθανό', physician:'Δρ. Ε. Νικολάου', notes:'Αναμένεται επιβεβαίωση εργαστηρίου.', attachments:[], history:[{id:'h1',at:'2026-08-04T10:25:00',text:'Δημιουργία πρόχειρης δήλωσης'}]},
  { id:'YDN-2026-0002', disease:'Σαλμονέλλωση', deadline:'24ωρο', patientName:'Μαρία Κωνσταντίνου', patientCode:'ΑΣΘ-1019', department:'Παιδιατρική', diagnosisDate:'2026-08-02', declarationDate:'2026-08-02', status:'Δηλώθηκε', caseClassification:'Επιβεβαιωμένο', physician:'Δρ. Κ. Δημητρίου', notes:'Η δήλωση ολοκληρώθηκε.', attachments:[], history:[{id:'h2',at:'2026-08-02T15:10:00',text:'Η δήλωση σημειώθηκε ως απεσταλμένη'}]},
]


export function loadNotifiableDiseases(){return clinicalSupportRepository.loadNotifiableDiseases(IS_PRODUCTION?[]:seed)}
export function saveNotifiableDiseases(items=[]){const next=clinicalSupportRepository.saveNotifiableDiseases(items);emitAppEvent(NOTIFIABLE_DISEASES_EVENT,next);return next}
