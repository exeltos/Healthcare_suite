import { confirmAction } from '../core/feedback/index'
import { useMemo, useState } from 'react'
import { useServiceCollection } from '../../core/hooks'
import { Plus, Search, Trash2, X } from 'lucide-react'
import LibraryField from '../core/LibraryField/LibraryField'
import { buildFieldValidationSchema, useCoreForm } from '../../core/forms'
import { useI18n } from '../../i18n'
import './PreventionRecordsPage.css'

export default function PreventionRecordsPage({ title, titleEn, description, descriptionEn, eyebrow='Πρόληψη', eyebrowEn='Prevention', fields, columns, loadRecords, upsertRecord, deleteRecord, eventName, emptyRecord, idPrefix }) {
  const { language } = useI18n()
  const L = (el,en) => language === 'en' ? (en || el) : el
  const [records, refreshRecords] = useServiceCollection(loadRecords, eventName)
  const [search,setSearch]=useState('')
  const [drawerOpen,setDrawerOpen]=useState(false)
  const [selectedId,setSelectedId]=useState(null)
  const validationSchema=useMemo(()=>buildFieldValidationSchema(fields),[fields])
  const {values:formData,setValues:setFormData,errors,reset,validate}=useCoreForm({initialValues:emptyRecord,validationSchema})


  const filtered=useMemo(()=>{ const q=search.trim().toLocaleLowerCase('el-GR'); if(!q)return records; return records.filter(r=>Object.values(r).some(v=>String(v||'').toLocaleLowerCase('el-GR').includes(q))) },[records,search])

  function openNew(){ setSelectedId(null); reset({...emptyRecord,date:todayGreek(),time:currentTime()}); setDrawerOpen(true) }
  function openRecord(record){ setSelectedId(record.id); reset({...emptyRecord,...record}); setDrawerOpen(true) }
  function close(){setDrawerOpen(false);setSelectedId(null);reset(emptyRecord)}
  async function save(e){e.preventDefault(); const nextErrors=validate(formData); if(Object.keys(nextErrors).length)return; const saved=await upsertRecord({...formData,id:selectedId||`${idPrefix}-${Date.now()}`}); refreshRecords(); setSelectedId(saved.id); close()}
  async function remove(){if(!selectedId||!confirmAction(L('Να διαγραφεί η εγγραφή;','Delete this record?')))return; await deleteRecord(selectedId); refreshRecords(); close()}

  return <section className="prevention-records-page">
    <header className="prevention-records-header"><div><span>{L(eyebrow,eyebrowEn)}</span><h1>{L(title,titleEn)}</h1><p>{L(description,descriptionEn)}</p></div><button type="button" onClick={openNew}><Plus size={18}/>{L('Νέα καταχώρηση','New record')}</button></header>
    <label className="prevention-search"><Search size={18}/><input value={search} placeholder={L('Αναζήτηση...','Search...')} onChange={e=>setSearch(e.target.value)}/></label>
    <div className="prevention-table-card"><table><thead><tr>{columns.map(c=><th key={c.key}>{L(c.label,c.labelEn)}</th>)}</tr></thead><tbody>{filtered.map(r=><tr className="core-record-row" role="button" tabIndex={0} key={r.id} onClick={()=>openRecord(r)} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openRecord(r)}}}>{columns.map(c=><td key={c.key}>{c.render?c.render(r):r[c.key]||'—'}</td>)}</tr>)}</tbody></table>{filtered.length===0&&<div className="prevention-empty">{L("Δεν υπάρχουν εγγραφές.","No records.")}</div>}</div>
    {drawerOpen&&<div className="prevention-drawer-backdrop" onMouseDown={close}><aside className="prevention-drawer" onMouseDown={e=>e.stopPropagation()}><header><div><span>{L(eyebrow,eyebrowEn)}</span><h2>{selectedId||L('Νέα καταχώρηση','New record')}</h2></div><button type="button" onClick={close}><X size={20}/></button></header><form onSubmit={save}><div className="prevention-form-grid">{fields.map(field=><Field key={field.id} language={language} field={field} value={formData[field.id]} error={errors[field.id]} onChange={value=>setFormData(cur=>({...cur,[field.id]:value}))}/>)}</div><footer>{selectedId&&<button className="delete" type="button" onClick={remove}><Trash2 size={16}/>{L('Διαγραφή','Delete')}</button>}<div><button type="button" onClick={close}>{L('Ακύρωση','Cancel')}</button><button className="primary" type="submit">{L('Αποθήκευση','Save')}</button></div></footer></form></aside></div>}
  </section>
}

function Field({field,value,onChange,error,language='el'}){
  const L=(el,en)=>language==='en'?(en||el):el
  const errorNode=error?<small className="prevention-field-error">{error}</small>:null
  if(field.libraryKey)return <div><LibraryField label={L(field.label,field.labelEn)} libraryKey={field.libraryKey} category={field.category||''} value={value||''} onChange={onChange} allowEmpty={!field.required} allowManual={field.allowManual!==false}/>{errorNode}</div>
  if(field.type==='select')return <label><span>{L(field.label,field.labelEn)}</span><select value={value||''} onChange={e=>onChange(e.target.value)}>{!field.required&&<option value="">—</option>}{field.options.map(o=>{const value=typeof o==='string'?o:o.value; const label=typeof o==='string'?o:L(o.label,o.labelEn); return <option key={value} value={value}>{label}</option>})}</select>{errorNode}</label>
  if(field.type==='textarea')return <label className="full"><span>{L(field.label,field.labelEn)}</span><textarea value={value||''} onChange={e=>onChange(e.target.value)}/>{errorNode}</label>
  if(field.type==='date')return <label><span>{L(field.label,field.labelEn)}</span><div className="smart"><input type="date" value={greekToIso(value)} onChange={e=>onChange(isoToGreek(e.target.value))}/><button type="button" onClick={()=>onChange(todayGreek())}>{L('Σήμερα','Today')}</button></div>{errorNode}</label>
  if(field.type==='time')return <label><span>{L(field.label,field.labelEn)}</span><div className="smart"><input type="time" value={value||''} onChange={e=>onChange(e.target.value)}/><button type="button" onClick={()=>onChange(currentTime())}>{L('Τώρα','Now')}</button></div>{errorNode}</label>
  return <label><span>{L(field.label,field.labelEn)}</span><input type={field.type||'text'} value={value||''} onChange={e=>onChange(e.target.value)}/>{errorNode}</label>
}
function greekToIso(v){if(!v)return'';if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;const[d,m,y]=String(v).split('/');return y?`${y}-${m}-${d}`:''}
function isoToGreek(v){if(!v)return'';const[y,m,d]=String(v).split('-');return d?`${d}/${m}/${y}`:v}
function todayGreek(){return isoToGreek(new Date().toISOString().slice(0,10))}
function currentTime(){return new Date().toTimeString().slice(0,5)}
