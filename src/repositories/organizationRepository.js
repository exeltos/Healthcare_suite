import { hasStoredValue, readJsonArray, writeJson } from '../core/storage'

export const ORGANIZATION_STORAGE_KEYS=Object.freeze({training:'limoxis:organization:training:v2',trainingLegacy:'limoxis:organization:training:v1',committees:'limoxis:organization:committees:v2',committeesLegacy:'limoxis:organization:committees:v1',documents:'limoxis:organization:documents:v1'})

function findCollection(key, seed=[], legacyKey=''){
  if(hasStoredValue(key)) return readJsonArray(key,seed)
  if(legacyKey && hasStoredValue(legacyKey)){const legacy=readJsonArray(legacyKey,[]); if(legacy.length){writeJson(key,legacy); return legacy}}
  writeJson(key,seed); return seed
}
export const organizationRepository=Object.freeze({
  findTraining:(seed=[])=>findCollection(ORGANIZATION_STORAGE_KEYS.training,seed,ORGANIZATION_STORAGE_KEYS.trainingLegacy),
  replaceTraining:(rows=[])=>writeJson(ORGANIZATION_STORAGE_KEYS.training,Array.isArray(rows)?rows:[]),
  findCommittees:(seed=[])=>findCollection(ORGANIZATION_STORAGE_KEYS.committees,seed,ORGANIZATION_STORAGE_KEYS.committeesLegacy),
  replaceCommittees:(rows=[])=>writeJson(ORGANIZATION_STORAGE_KEYS.committees,Array.isArray(rows)?rows:[]),
  findDocuments:(seed=[])=>findCollection(ORGANIZATION_STORAGE_KEYS.documents,seed),
  replaceDocuments:(rows=[])=>writeJson(ORGANIZATION_STORAGE_KEYS.documents,Array.isArray(rows)?rows:[]),
})
