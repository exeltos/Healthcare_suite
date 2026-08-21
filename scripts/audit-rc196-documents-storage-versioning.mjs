import fs from 'node:fs'
const b=fs.readFileSync('src/services/backend/organizationBackendService.js','utf8')
const a=fs.readFileSync('src/components/core/AttachmentManager/AttachmentManager.jsx','utf8')
const d=fs.readFileSync('src/pages/Organization/DocumentsPage.jsx','utf8')
const checks=[
 ['documents hydrate relational attachments/versions',b.includes('hydrateRelationalDocuments(c,base)')],
 ['new files upload to operationalattachments',b.includes("storage.from(DOCUMENT_BUCKET).upload")&&b.includes("DOCUMENT_BUCKET='operationalattachments'")],
 ['file metadata stored in attachments table',b.includes("entity_type:'controlled_document'")&&b.includes("c.from('attachments').insert")],
 ['document JSON strips base64 data',b.includes('attachments:normalizedAttachments.map(stripDocumentAttachmentForJson)')],
 ['publish creates immutable relational version',b.includes('ensureControlledDocumentVersion')&&b.includes("c.from('controlled_document_versions').insert")],
 ['version files linked through attachment metadata',b.includes("entity_type:'controlled_document_version'")],
 ['preview no longer uses popup',!a.includes("window.open(")&&a.includes('attachment-preview')],
 ['preview supports storage signed URL',a.includes("file?.url || file?.data")],
 ['revision no longer creates duplicate JSON snapshot',!d.includes("const snapshot={id:`ver-")]
]
for(const [name,ok] of checks)console.log(ok?'PASS':'FAIL',name)
const n=checks.filter(([,ok])=>ok).length
console.log(`Documents storage/versioning rc.196: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)
