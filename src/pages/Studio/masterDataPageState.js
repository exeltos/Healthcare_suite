import { loadMasterData } from '../../services/masterDataService'
import { masterDataSections } from '../../config/masterDataSections'
export function buildInitialMasterData(){
 const loaded=loadMasterData()
 return Object.fromEntries(masterDataSections.map(section=>[section.id,Array.isArray(loaded[section.id])?loaded[section.id]:section.initialItems]))
}
