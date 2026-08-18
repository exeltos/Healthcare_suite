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


export function loadNotifiableDiseases(){return clinicalSupportRepository.loadNotifiableDiseases([])}
export function saveNotifiableDiseases(items=[]){const next=clinicalSupportRepository.saveNotifiableDiseases(items);emitAppEvent(NOTIFIABLE_DISEASES_EVENT,next);return next}
