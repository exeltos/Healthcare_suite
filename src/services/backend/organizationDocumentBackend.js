function date(v){const s=String(v||'').trim();if(!s)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:null}
const DOCUMENT_BUCKET='operationalattachments'

function safeObjectName(name='file'){
  return String(name||'file').normalize('NFKD').replace(/[^\w.\-]+/g,'_').replace(/_+/g,'_').slice(0,140)||'file'
}
function dataUrlToBlob(dataUrl){
  const match=String(dataUrl||'').match(/^data:([^;,]+)?(?:;base64)?,(.*)$/s)
  if(!match)throw new Error('Invalid attachment data.')
  const mime=match[1]||'application/octet-stream'
  const encoded=match[2]||''
  const isBase64=String(dataUrl).includes(';base64,')
  const binary=isBase64?atob(encoded):decodeURIComponent(encoded)
  const bytes=new Uint8Array(binary.length)
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i)
  return new Blob([bytes],{type:mime})
}
export function stripDocumentAttachmentForJson(file){
  return {
    id:file.id||file.relationalId||'',
    name:file.name||file.file_name||'',
    size:Number(file.size||file.size_bytes||0),
    type:file.type||file.mime_type||'application/octet-stream',
    bucket:file.bucket||DOCUMENT_BUCKET,
    objectPath:file.objectPath||file.object_path||'',
    uploadedAt:file.uploadedAt||file.created_at||new Date().toISOString(),
  }
}
async function signDocumentAttachment(c,row){
  if(!row?.object_path)return null
  const bucket=row.bucket||DOCUMENT_BUCKET
  const {data,error}=await c.storage.from(bucket).createSignedUrl(row.object_path,3600)
  if(error)return null
  return {
    id:row.id,relationalId:row.id,name:row.file_name||'',size:Number(row.size_bytes||0),type:row.mime_type||'application/octet-stream',
    bucket,objectPath:row.object_path,uploadedAt:row.created_at||'',uploadedBy:row.uploaded_by||'',url:data?.signedUrl||''
  }
}
export async function syncDocumentAttachments(c,{org,actor,documentId,attachments}){
  const {data:existing,error:readError}=await c.from('attachments').select('*').eq('organization_id',org).eq('entity_type','controlled_document').eq('entity_id',documentId)
  if(readError)throw readError
  const existingById=new Map((existing||[]).map(x=>[String(x.id),x]))
  const existingByPath=new Map((existing||[]).map(x=>[String(x.object_path),x]))
  const kept=new Set()
  const normalized=[]
  for(const file of attachments||[]){
    let meta=null
    const knownId=String(file.relationalId||file.id||'')
    const knownPath=String(file.objectPath||file.object_path||'')
    if(knownId&&existingById.has(knownId))meta=existingById.get(knownId)
    else if(knownPath&&existingByPath.has(knownPath))meta=existingByPath.get(knownPath)
    if(!meta&&file.data){
      const blob=dataUrlToBlob(file.data)
      const path=`${org}/documents/${documentId}/${crypto.randomUUID()}-${safeObjectName(file.name)}`
      const {error:uploadError}=await c.storage.from(DOCUMENT_BUCKET).upload(path,blob,{contentType:file.type||blob.type||'application/octet-stream',upsert:false})
      if(uploadError)throw uploadError
      const insertPayload={organization_id:org,entity_type:'controlled_document',entity_id:documentId,bucket:DOCUMENT_BUCKET,object_path:path,file_name:String(file.name||'file'),mime_type:String(file.type||blob.type||'application/octet-stream'),size_bytes:Number(file.size||blob.size||0),uploaded_by:actor}
      const {data:inserted,error:metaError}=await c.from('attachments').insert(insertPayload).select().single()
      if(metaError){
        await c.storage.from(DOCUMENT_BUCKET).remove([path])
        throw metaError
      }
      meta=inserted
    }
    if(!meta&&knownPath){
      const insertPayload={organization_id:org,entity_type:'controlled_document',entity_id:documentId,bucket:file.bucket||DOCUMENT_BUCKET,object_path:knownPath,file_name:String(file.name||'file'),mime_type:String(file.type||'application/octet-stream'),size_bytes:Number(file.size||0),uploaded_by:actor}
      const {data:inserted,error:metaError}=await c.from('attachments').insert(insertPayload).select().single()
      if(metaError)throw metaError
      meta=inserted
    }
    if(meta){
      kept.add(String(meta.id))
      const signed=await signDocumentAttachment(c,meta)
      normalized.push(signed||{...stripDocumentAttachmentForJson(meta),id:meta.id,relationalId:meta.id})
    }
  }
  const stale=(existing||[]).filter(x=>!kept.has(String(x.id)))
  for(const old of stale){
    const {data:versionRefs,error:refError}=await c.from('attachments').select('id').eq('bucket',old.bucket).eq('object_path',old.object_path).eq('entity_type','controlled_document_version').limit(1)
    if(refError)throw refError
    const {error:deleteMetaError}=await c.from('attachments').delete().eq('id',old.id)
    if(deleteMetaError)throw deleteMetaError
    if(!(versionRefs||[]).length&&old.bucket===DOCUMENT_BUCKET){
      const {error:removeError}=await c.storage.from(DOCUMENT_BUCKET).remove([old.object_path])
      if(removeError)throw removeError
    }
  }
  return normalized
}
export async function ensureControlledDocumentVersion(c,{org,actor,row}){
  const version=String(row.version||'').trim()
  if(!version)return null
  const {data:existing,error:existingError}=await c.from('controlled_document_versions').select('*').eq('document_id',String(row.id)).eq('version',version).maybeSingle()
  if(existingError)throw existingError
  if(existing)return existing
  const snapshot={
    documentId:String(row.id),title:String(row.title||''),code:String(row.code||''),category:String(row.category||''),version,
    owner:String(row.owner||''),status:String(row.status||''),reviewDate:date(row.reviewDate),description:row.description||'',scope:row.scope||'',keywords:row.keywords||'',
    attachments:(row.attachments||[]).map(stripDocumentAttachmentForJson)
  }
  const payload={
    organization_id:org,document_id:String(row.id),version,title:String(row.title||''),code:String(row.code||''),category:String(row.category||''),
    status:'Σε ισχύ',change_summary:String(row.changeSummary||''),effective_date:date(row.effectiveDate),review_date:date(row.reviewDate),
    prepared_by_name:String(row.preparedBy||''),prepared_at:row.submittedAt||null,
    reviewed_by_name:String(row.reviewedBy||''),reviewed_at:row.reviewedAt||null,
    approved_by_name:String(row.approvedBy||''),approved_at:row.approvedAt||null,
    snapshot,created_by:actor
  }
  const {data:created,error}=await c.from('controlled_document_versions').insert(payload).select().single()
  if(error)throw error
  for(const file of row.attachments||[]){
    const objectPath=file.objectPath||file.object_path
    if(!objectPath)continue
    const meta={organization_id:org,entity_type:'controlled_document_version',entity_id:String(created.id),bucket:file.bucket||DOCUMENT_BUCKET,object_path:objectPath,file_name:String(file.name||''),mime_type:String(file.type||'application/octet-stream'),size_bytes:Number(file.size||0),uploaded_by:actor}
    const {error:fileError}=await c.from('attachments').insert(meta)
    if(fileError)throw fileError
  }
  return created
}
export async function hydrateRelationalDocuments(c,rows){
  if(!rows.length)return rows
  const documentIds=rows.map(r=>String(r.id))
  const [currentRes,versionsRes]=await Promise.all([
    c.from('attachments').select('*').eq('entity_type','controlled_document').in('entity_id',documentIds).order('created_at'),
    c.from('controlled_document_versions').select('*').in('document_id',documentIds).order('created_at',{ascending:false}),
  ])
  if(currentRes.error)throw currentRes.error
  if(versionsRes.error)throw versionsRes.error
  const versionIds=(versionsRes.data||[]).map(v=>String(v.id))
  let versionFiles=[]
  if(versionIds.length){
    const res=await c.from('attachments').select('*').eq('entity_type','controlled_document_version').in('entity_id',versionIds).order('created_at')
    if(res.error)throw res.error
    versionFiles=res.data||[]
  }
  const group=(arr,key)=>arr.reduce((m,x)=>{const k=String(x[key]||'');if(!m.has(k))m.set(k,[]);m.get(k).push(x);return m},new Map())
  const currentGroups=group(currentRes.data||[],'entity_id')
  const versionGroups=group(versionsRes.data||[],'document_id')
  const fileGroups=group(versionFiles,'entity_id')
  const signList=async list=>Promise.all((list||[]).map(async item=>(await signDocumentAttachment(c,item))||{id:item.id,relationalId:item.id,name:item.file_name,size:Number(item.size_bytes||0),type:item.mime_type,bucket:item.bucket,objectPath:item.object_path,uploadedAt:item.created_at}))
  const hydrated=[]
  for(const row of rows){
    const currentMeta=currentGroups.get(String(row.id))||[]
    const attachments=currentMeta.length?await signList(currentMeta):(row.attachments||[])
    const relVersions=versionGroups.get(String(row.id))||[]
    const versions=[]
    for(const v of relVersions){
      const files=await signList(fileGroups.get(String(v.id))||[])
      versions.push({
        id:String(v.id),relationalId:v.id,version:v.version,date:v.effective_date||String(v.created_at||'').slice(0,10),status:v.status,
        note:v.change_summary||'Εγκεκριμένη έκδοση',attachments:files,approvedBy:v.approved_by_name||'',approvedAt:v.approved_at||'',
        effectiveDate:v.effective_date||'',reviewDate:v.review_date||'',preparedBy:v.prepared_by_name||'',reviewedBy:v.reviewed_by_name||''
      })
    }
    hydrated.push({...row,attachments,versions:relVersions.length?versions:(row.versions||[])})
  }
  return hydrated
}
