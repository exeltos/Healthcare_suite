import { readJsonArray, writeJson } from '../core/storage'

const KEYS = Object.freeze({ templates: 'limoxis.form-templates.v1', responses: 'limoxis.form-responses.v1' })
export const formsRepository = Object.freeze({
  findTemplates: () => readJsonArray(KEYS.templates, []),
  replaceTemplates: (rows = []) => writeJson(KEYS.templates, Array.isArray(rows) ? rows : []),
  findResponses: () => readJsonArray(KEYS.responses, []),
  replaceResponses: (rows = []) => writeJson(KEYS.responses, Array.isArray(rows) ? rows : []),
})
