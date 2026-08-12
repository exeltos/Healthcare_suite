import { readJsonArray, readJsonObject, writeJson } from '../core/storage'
const KEYS=Object.freeze({settings:'limoxis_indicators_settings_v1',custom:'limoxis_custom_indicators_v1',census:'limoxisIndicatorDailyCensus',ddd:'limoxisIndicatorAntibioticDDD',structural:'limoxisIndicatorStructuralSnapshots',prevalence:'limoxisIndicatorPrevalenceSnapshots'})
export const indicatorRepository=Object.freeze({
  loadSettings:()=>readJsonObject(KEYS.settings,{}), saveSettings:(value={})=>writeJson(KEYS.settings,value&&typeof value==='object'&&!Array.isArray(value)?value:{}),
  loadCustom:()=>readJsonArray(KEYS.custom,[]), saveCustom:(rows=[])=>writeJson(KEYS.custom,Array.isArray(rows)?rows:[]),
  loadDailyCensus:()=>readJsonArray(KEYS.census,[]), saveDailyCensus:(rows=[])=>writeJson(KEYS.census,Array.isArray(rows)?rows:[]),
  loadAntibioticDDD:()=>readJsonArray(KEYS.ddd,[]), saveAntibioticDDD:(rows=[])=>writeJson(KEYS.ddd,Array.isArray(rows)?rows:[]),
  loadStructuralSnapshots:()=>readJsonArray(KEYS.structural,[]), saveStructuralSnapshots:(rows=[])=>writeJson(KEYS.structural,Array.isArray(rows)?rows:[]),
  loadPrevalenceSnapshots:()=>readJsonArray(KEYS.prevalence,[]), savePrevalenceSnapshots:(rows=[])=>writeJson(KEYS.prevalence,Array.isArray(rows)?rows:[]),
})
