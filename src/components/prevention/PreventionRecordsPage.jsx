import { confirmAction } from '../core/feedback/index'
import { useMemo, useState } from 'react'
import { useServiceCollection } from '../../core/hooks'
import { Plus, Search, Trash2, X } from 'lucide-react'
import LibraryField from '../core/LibraryField/LibraryField'
import { buildFieldValidationSchema, useCoreForm } from '../../core/forms'
import './PreventionRecordsPage.css'

export default function PreventionRecordsPage({ title, description, eyebrow='Πρόληψη', fields, columns, loadRecords, upsertRecord, deleteRecord, eventName, emptyRecord, idPrefix }) {
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
  function save(e){e.preventDefault(); const nextErrors=validate(formData); if(Object.keys(nextErrors).length)return; const saved=upsertRecord({...formData,id:selectedId||`${idPrefix}-${Date.now()}`}); refreshRecords(); setSelectedId(saved.id); close()}
  function remove(){if(!selectedId||!confirmAction('Να διαγραφεί η εγγραφή;'))return; deleteRecord(selectedId); refreshRecords(); close()}

  return <section className="prevention-records-page">
    <header className="prevention-records-header"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><button type="button" onClick={openNew}><Plus size={18}/>Νέα καταχώρηση</button></header>
    <label className="prevention-search"><Search size={18}/><input value={search} placeholder="Αναζήτηση..." onChange={e=>setSearch(e.target.value)}/></label>
    <div className="prevention-table-card"><table><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{filtered.map(r=><tr className="core-record-row" role="button" tabIndex={0} key={r.id} onClick={()=>openRecord(r)} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openRecord(r)}}}>{columns.map(c=><td key={c.key}>{c.render?c.render(r):r[c.key]||'—'}</td>)}</tr>)}</tbody></table>{filtered.length===0&&<div className="prevention-empty">Δεν υπάρχουν εγγραφές.</div>}</div>
    {drawerOpen&&<div className="prevention-drawer-backdrop" onMouseDown={close}><aside className="prevention-drawer" onMouseDown={e=>e.stopPropagation()}><header><div><span>{eyebrow}</span><h2>{selectedId||'Νέα καταχώρηση'}</h2></div><button type="button" onClick={close}><X size={20}/></button></header><form onSubmit={save}><div className="prevention-form-grid">{fields.map(field=><Field key={field.id} field={field} value={formData[field.id]} error={errors[field.id]} onChange={value=>setFormData(cur=>({...cur,[field.id]:value}))}/>)}</div><footer>{selectedId&&<button className="delete" type="button" onClick={remove}><Trash2 size={16}/>Διαγραφή</button>}<div><button type="button" onClick={close}>Ακύρωση</button><button className="primary" type="submit">Αποθήκευση</button></div></footer></form></aside></div>}
  </section>
}

function Field({field,value,onChange,error}){
  const errorNode=error?<small className="prevention-field-error">{error}</small>:null
  if(field.libraryKey)return <div><LibraryField label={field.label} libraryKey={field.libraryKey} category={field.category||''} value={value||''} onChange={onChange} allowEmpty={!field.required} allowManual={field.allowManual!==false}/>{errorNode}</div>
  if(field.type==='select')return <label><span>{field.label}</span><select value={value||''} onChange={e=>onChange(e.target.value)}>{!field.required&&<option value="">—</option>}{field.options.map(o=><option key={o} value={o}>{o}</option>)}</select>{errorNode}</label>
  if(field.type==='textarea')return <label className="full"><span>{field.label}</span><textarea value={value||''} onChange={e=>onChange(e.target.value)}/>{errorNode}</label>
  if(field.type==='date')return <label><span>{field.label}</span><div className="smart"><input type="date" value={greekToIso(value)} onChange={e=>onChange(isoToGreek(e.target.value))}/><button type="button" onClick={()=>onChange(todayGreek())}>Σήμερα</button></div>{errorNode}</label>
  if(field.type==='time')return <label><span>{field.label}</span><div className="smart"><input type="time" value={value||''} onChange={e=>onChange(e.target.value)}/><button type="button" onClick={()=>onChange(currentTime())}>Τώρα</button></div>{errorNode}</label>
  return <label><span>{field.label}</span><input type={field.type||'text'} value={value||''} onChange={e=>onChange(e.target.value)}/>{errorNode}</label>
}
function greekToIso(v){if(!v)return'';if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;const[d,m,y]=String(v).split('/');return y?`${y}-${m}-${d}`:''}
function isoToGreek(v){if(!v)return'';const[y,m,d]=String(v).split('-');return d?`${d}/${m}/${y}`:v}
function todayGreek(){return isoToGreek(new Date().toISOString().slice(0,10))}
function currentTime(){return new Date().toTimeString().slice(0,5)}
