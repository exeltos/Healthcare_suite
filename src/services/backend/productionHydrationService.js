import { IS_PRODUCTION } from '../../core/runtime'
import { hydrateMasterDataBackend, hydrateFormsBackend, hydrateStudioBackend, hydratePatientSourceConfigBackend } from './configurationBackendService'
import { loadDirectoryDepartments, loadDirectoryEmployees } from './directoryService'
import { loadClinicalPatients, loadClinicalSurveillanceCases, loadClinicalPatientSamples, loadClinicalInfections } from './clinicalDirectoryService'
import { loadClinicalSourceSamples, loadClinicalIsolations, loadClinicalNotifiableDiseases } from './clinicalSupportBackendService'
import { loadPreventionRecords } from './preventionBackendService'
import { loadQualityIncidents, loadQualityCapa, loadQualityAudits, loadQualityRisks } from './qualityBackendService'
import { loadOperationalTraining, loadOperationalCommittees, loadOperationalDocuments } from './organizationBackendService'
import { hydrateIndicatorBackend } from './indicatorBackendService'
import { loadSurveillanceControlPrograms, loadSurveillanceControlExecutions } from './surveillanceControlsBackendService'

const PREVENTION_TYPES=[
  'antiseptic','waste','prevention_audit','bundle',
  'promoted_antibiotic','staff_vaccination','hand_hygiene',
]

export async function hydrateProductionOperationalMirrors(){
  if(!IS_PRODUCTION)return {ok:true,failures:[]}
  const tasks=[
    ['master-data',hydrateMasterDataBackend],
    ['patient-source-config',hydratePatientSourceConfigBackend],
    ['forms',hydrateFormsBackend],
    ['studio',hydrateStudioBackend],
    ['departments',loadDirectoryDepartments],
    ['employees',loadDirectoryEmployees],
    ['patients',loadClinicalPatients],
    ['surveillance-cases',()=>loadClinicalSurveillanceCases()],
    ['patient-samples',()=>loadClinicalPatientSamples()],
    ['infections',()=>loadClinicalInfections()],
    ['laboratory-source-samples',()=>loadClinicalSourceSamples()],
    ['isolations',()=>loadClinicalIsolations()],
    ['notifiable-diseases',()=>loadClinicalNotifiableDiseases()],
    ['quality-incidents',loadQualityIncidents],
    ['quality-capa',loadQualityCapa],
    ['quality-audits',loadQualityAudits],
    ['quality-risks',loadQualityRisks],
    ['training',loadOperationalTraining],
    ['committees',loadOperationalCommittees],
    ['documents',loadOperationalDocuments],
    ['indicators',hydrateIndicatorBackend],
    ['surveillance-programs',loadSurveillanceControlPrograms],
    ['surveillance-executions',loadSurveillanceControlExecutions],
    ...PREVENTION_TYPES.map(type=>[`prevention:${type}`,()=>loadPreventionRecords(type)]),
  ]
  const results=await Promise.allSettled(tasks.map(([,run])=>run()))
  const failures=results.flatMap((result,index)=>result.status==='rejected'
    ?[{key:tasks[index][0],message:String(result.reason?.message||result.reason||'Unknown error')}]:[])
  if(failures.length)console.warn('Production hydration completed with scoped failures',failures)
  return {ok:failures.length===0,failures}
}
