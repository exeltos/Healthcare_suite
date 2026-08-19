import fs from 'node:fs'
const r=p=>fs.readFileSync(p,'utf8')
const incidents=r('src/pages/Quality/IncidentsPage.jsx'),audits=r('src/pages/Quality/AuditsPage.jsx'),backend=r('src/services/backend/qualityBackendService.js'),migration=r('supabase/migrations/20260813_000012_quality_workflow_integrity.sql')
const failures=[]
if(!/createCapaFromSourceAsync/.test(incidents)||!/getRelatedQualityRecordsAsync/.test(incidents))failures.push('Incident quality workflow bypasses Production-aware relationship services.')
if(/createCapaFromSource, getRelatedQualityRecords/.test(incidents))failures.push('Incident page still imports local-only workflow helpers.')
if(!/existing=related\.capa/.test(incidents))failures.push('Incident can create duplicate active CAPA.')
if(!/createCapaFromSourceAsync/.test(audits)||!/parentId:finding\.id/.test(audits))failures.push('Audit finding CAPA is not centrally linked to the finding.')
if(!/Linked incident was not found/.test(backend)||!/Linked audit was not found/.test(backend))failures.push('CAPA source ownership is not validated in Production.')
if(!/quality_capa_source_guard/.test(migration)||!/quality_audit_source_guard/.test(migration)||!/quality_audits_compliance_range/.test(migration))failures.push('Database quality workflow guards are incomplete.')
if(failures.length){console.error('Quality integrity audit failed:');failures.forEach(x=>console.error('- '+x));process.exitCode=1}else console.log('Quality integrity audit OK: incident, audit and CAPA relationships are Production-aware and guarded.')
