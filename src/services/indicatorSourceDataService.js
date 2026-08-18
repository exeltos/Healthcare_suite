import { APP_EVENTS, emitAppEvent } from '../core/events'
import { indicatorRepository } from '../repositories/indicatorRepository'
export const INDICATOR_SOURCE_EVENT = APP_EVENTS.INDICATOR_SOURCE_UPDATED
function save(loader, writer, key, rows){const normalized=Array.isArray(rows)?rows:[];writer(normalized);emitAppEvent(INDICATOR_SOURCE_EVENT,{key,rows:normalized});return normalized}
export const loadDailyCensus=()=>indicatorRepository.loadDailyCensus()
export const saveDailyCensus=(rows)=>save(loadDailyCensus,indicatorRepository.saveDailyCensus,'dailyCensus',rows)
export const loadAntibioticDDD=()=>indicatorRepository.loadAntibioticDDD()
export const saveAntibioticDDD=(rows)=>save(loadAntibioticDDD,indicatorRepository.saveAntibioticDDD,'antibioticDDD',rows)
export const loadStructuralSnapshots=()=>indicatorRepository.loadStructuralSnapshots()
export const saveStructuralSnapshots=(rows)=>save(loadStructuralSnapshots,indicatorRepository.saveStructuralSnapshots,'structuralSnapshots',rows)
export const loadPrevalenceSnapshots=()=>indicatorRepository.loadPrevalenceSnapshots()
export const savePrevalenceSnapshots=(rows)=>save(loadPrevalenceSnapshots,indicatorRepository.savePrevalenceSnapshots,'prevalenceSnapshots',rows)
export function clearIndicatorSourceDemoData(){saveDailyCensus(loadDailyCensus().filter((row)=>!row._demo));saveAntibioticDDD(loadAntibioticDDD().filter((row)=>!row._demo));saveStructuralSnapshots(loadStructuralSnapshots().filter((row)=>!row._demo));savePrevalenceSnapshots(loadPrevalenceSnapshots().filter((row)=>!row._demo))}
