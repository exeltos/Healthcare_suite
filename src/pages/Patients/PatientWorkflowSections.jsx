// Compatibility facade for the patient workflow feature.
// Implementation is split by responsibility to keep the feature maintainable.
export { PatientHome, PatientNotifiableDiseases } from './PatientHomeSections'
export { CaseWorkspace, AssessmentPanel, SamplesPanel, CarePanel } from './PatientCaseSections'
export {
  SampleEditor, IsolationEditor, FileLibrary, AttachmentTools, ActionCard, PanelHeader,
  SectionHeader, Tab, IconButton, EmptyState, Field, Input, Select,
} from './PatientWorkflowEditors'
export { buildPatientTimeline } from './patientWorkflowTimeline'
export {
  attachmentSectionLabel, buildPatientSampleRows, buildSampleChainRows, calculateHospitalDays, deriveOverallResistance,
  eventDateTimeKey, formatDate, formatDateTime, formatFileSize, getDeviceRecords,
  getPatientSignals, getSampleDescendants, getTherapies, highestResistance, isRepeatSample,
  normalizeDate, normalizeOrganismResults, sampleMicroorganismLabel, sampleResistanceLabel, today,
} from './patientWorkflowUtils'
