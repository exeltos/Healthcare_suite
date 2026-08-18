import { clinicalHelpSections } from './helpContentClinical'
import { adminHelpSections } from './helpContentAdmin'

export const HELP_VERSION = '0.12.0-rc.104'
export const helpSections=[...clinicalHelpSections,...adminHelpSections]

export function inferHelpSection(){
  const route=`${window.location.pathname} ${window.location.hash}`.toLowerCase()
  if(/governance|retention|continuity|privacy/.test(route))return'governance'
  if(/indicator/.test(route))return'indicators'
  if(/notification/.test(route))return'notifications'
  if(/lab|laboratory|εργαστ/.test(route))return'laboratory'
  if(/patient|ασθεν/.test(route))return'patients'
  if(/employee|staff|προσωπ|εργαζ/.test(route))return'employees'
  if(/hand|who|hygiene/.test(route))return'hand-hygiene'
  if(/promoted|restricted|antimicrobial/.test(route))return'prevention'
  if(/prevention|vaccin|bundle/.test(route))return'prevention'
  if(/quality|audit|incident|capa|risk/.test(route))return'quality'
  if(/committee|training|document|organization/.test(route))return'organization'
  if(/management|studio|settings|role|library/.test(route))return'management'
  if(/lira|ai/.test(route))return'lira'
  if(/dashboard|^\s*$/.test(route))return'dashboard'
  return'start'
}
