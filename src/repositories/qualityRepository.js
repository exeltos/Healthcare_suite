import { readJsonArray, writeJson } from '../core/storage'
const KEYS=Object.freeze({incidents:'limoxis_quality_incidents_v1',capa:'limoxis_quality_capa_v1',audits:'limoxis.quality-audits.v1'})
export const qualityRepository=Object.freeze({
  findIncidents:(fallback=[])=>readJsonArray(KEYS.incidents,fallback), replaceIncidents:(rows=[])=>writeJson(KEYS.incidents,Array.isArray(rows)?rows:[]),
  findCapa:(fallback=[])=>readJsonArray(KEYS.capa,fallback), replaceCapa:(rows=[])=>writeJson(KEYS.capa,Array.isArray(rows)?rows:[]),
  findAudits:()=>readJsonArray(KEYS.audits,[]), replaceAudits:(rows=[])=>writeJson(KEYS.audits,Array.isArray(rows)?rows:[]),
})
