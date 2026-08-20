import { APP_ROUTES } from '../../config/routes'
import { useEffect, useMemo, useState } from 'react'
import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { Download, Plus, Printer, RotateCcw, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BackLink, Badge, Button, Drawer, EntityCell, EntitySummary, FormActions, FormField, FormGrid, FormSection, ListWorkspace, PageChrome, PageHeader, StatCard } from '../../components/core'
import { loadStudioRows, resetStudioRows, studioModules } from '../../services/studioConfigService'
import { hydrateStudioBackend, saveStudioRowsBackend } from '../../services/backend/configurationBackendService'
import { normalizeText, selectedRows, sortRows } from '../../core/utils/entityList'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { useI18n } from '../../i18n'
import { studioDisplayValue, studioFieldLabel, studioModulePresentation, studioOptionLabel } from './studioPresentation'

function emptyForm(config){
  return Object.fromEntries((config?.fields||[]).map(field=>[field.key, field.type==='checkbox' ? false : (field.options?.[0] || '')]))
}

export default function StudioConfigPage({ moduleKey }){
  const { language }=useI18n()
  const L=(el,en)=>language==='en'?en:el
  const navigate=useNavigate()
  const config=studioModules[moduleKey]
  const presentation=studioModulePresentation(moduleKey,config,language)
  const [rows,setRows]=useState(()=>loadStudioRows(moduleKey))
  useEffect(()=>{hydrateStudioBackend().then(all=>setRows(all[moduleKey]||loadStudioRows(moduleKey))).catch(()=>{})},[moduleKey])
  const [search,setSearch]=useState('')
  const [sort,setSort]=useState({key:'name',direction:'asc'})
  const [selectedKeys,setSelectedKeys]=useState([])
  const [editing,setEditing]=useState(undefined)
  const [form,setForm]=useState(()=>emptyForm(config))

  const filtered=useMemo(()=>sortRows(rows.filter(row=>!normalizeText(search)||normalizeText(Object.values(row).join(' ')).includes(normalizeText(search))),sort),[rows,search,sort])
  const selected=useMemo(()=>selectedRows(filtered,selectedKeys),[filtered,selectedKeys])
  const activeCount=rows.filter(row=>row.active!==false).length
  const exportColumns=[
    {label:L('Όνομα','Name'),value:r=>r.name},
    {label:L('Κατάσταση','Status'),value:r=>r.active===false?L('Ανενεργό','Inactive'):L('Ενεργό','Active')},
  ]

  if(!config)return null

  function openNew(){setEditing(null);setForm(emptyForm(config))}
  function openRow(row){setEditing(row);setForm({...emptyForm(config),...row})}
  function close(){setEditing(undefined)}
  async function persist(next){setRows(next);await saveStudioRowsBackend(moduleKey,next)}

  async function save(event){
    event.preventDefault()
    const required=config.fields.filter(field=>field.required)
    if(required.some(field=>!String(form[field.key]??'').trim())){
      notifyAction(L('Συμπληρώστε τα υποχρεωτικά πεδία.','Complete the required fields.'))
      return
    }
    const duplicate=rows.find(row=>row.id!==editing?.id && normalizeText(row.name)===normalizeText(form.name))
    if(duplicate){
      notifyAction(L('Υπάρχει ήδη εγγραφή με το ίδιο όνομα.','A record with the same name already exists.'))
      return
    }
    const row={...form,id:editing?.id||`${moduleKey.toUpperCase()}-${Date.now()}`}
    await persist(editing ? rows.map(item=>item.id===editing.id?row:item) : [row,...rows])
    close()
  }

  async function remove(){
    if(!editing||!confirmAction(language==='en'?`Delete this ${presentation.singular}?`:`Να διαγραφεί το ${presentation.singular};`))return
    await persist(rows.filter(row=>row.id!==editing.id))
    close()
  }

  async function reset(){
    if(!confirmAction(L('Να γίνει επαναφορά των αρχικών ρυθμίσεων;','Restore the initial settings?')))return
    const next=resetStudioRows(moduleKey)
    await saveStudioRowsBackend(moduleKey,next)
    setRows(next)
    setSelectedKeys([])
  }

  return <PageChrome
    className="studio-config-page"
    back={<BackLink onClick={()=>navigate(APP_ROUTES.STUDIO)}>{L('Πίσω στο Κέντρο Διαχείρισης','Back to Management Center')}</BackLink>}
    header={<PageHeader title={presentation.title} description={presentation.description} actions={<Button icon={<Plus size={16}/>} onClick={openNew}>{L('Νέα καταχώρηση','New record')}</Button>} />}
  >
    <div className="studio-admin-note">
      {L(
        'Η συγκεκριμένη περιοχή αποθηκεύει παραμετροποίηση, αλλά δεν επηρεάζει ακόμη το runtime της εφαρμογής. Για αυτό δεν εμφανίζεται ως κύριο λειτουργικό εργαλείο στο Κέντρο Διαχείρισης.',
        'This area stores configuration but does not yet affect the application runtime. It is therefore not shown as a primary operational tool in the Management Center.'
      )}
    </div>

    <ListWorkspace
      stats={<EntitySummary columns={3} ariaLabel={`${L('Σύνοψη','Summary')} ${presentation.title}`}><StatCard label={L('Σύνολο','Total')} value={rows.length}/><StatCard label={L('Ενεργά','Active')} value={activeCount}/><StatCard label={L('Ανενεργά','Inactive')} value={rows.length-activeCount}/></EntitySummary>}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={language==='en'?`Search ${presentation.title}…`:`Αναζήτηση στο ${presentation.title}…`}
      selectedCount={selected.length}
      selectedLabel={L('εγγραφές','records')}
      onClearSelection={()=>setSelectedKeys([])}
      bulkActions={<>
        <Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={()=>printRows({title:presentation.title,columns:exportColumns,rows:selected})}>{L('Εκτύπωση / PDF','Print / PDF')}</Button>
        <Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={()=>downloadCsv({filename:`studio-${moduleKey}.csv`,columns:exportColumns,rows:selected})}>{L('Εξαγωγή CSV','Export CSV')}</Button>
      </>}
      columns={[
        {key:'name',label:L('Όνομα','Name'),sortable:true,render:r=><EntityCell primary={r.name} secondary={config.fields.find(f=>f.key==='source')?studioDisplayValue(r.source,language):(config.fields.find(f=>f.key==='scope')?studioDisplayValue(r.scope,language):'')}/>},
        {key:'status',label:L('Κατάσταση','Status'),render:r=><Badge tone={r.active===false?'neutral':'success'}>{r.active===false?L('Ανενεργό','Inactive'):L('Ενεργό','Active')}</Badge>},
      ]}
      rows={filtered}
      getRowKey={row=>row.id}
      onRowClick={openRow}
      selectedKeys={selectedKeys}
      onSelectionChange={setSelectedKeys}
      sort={sort}
      onSortChange={setSort}
      ariaLabel={presentation.title}
      emptyTitle={language==='en'?`No ${presentation.singular} records`:`Δεν υπάρχουν ${presentation.singular}`}
    />

    <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
      <Button variant="ghost" size="sm" icon={<RotateCcw size={15}/>} onClick={reset}>{L('Επαναφορά αρχικών','Restore defaults')}</Button>
    </div>

    <Drawer
      open={editing!==undefined}
      onClose={close}
      title={editing?`${L('Επεξεργασία','Edit')} – ${editing.name}`:`${L('Νέο','New')} ${presentation.singular}`}
      description={presentation.description}
      width={1040}
      position="center"
      footer={<FormActions form={`studio-${moduleKey}-form`} onCancel={close} destructive={editing?<Button variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>{L('Διαγραφή','Delete')}</Button>:null}/>}
    >
      <form id={`studio-${moduleKey}-form`} onSubmit={save}>
        <FormSection title={L('Ρύθμιση','Configuration')}>
          <FormGrid columns={2}>
            {config.fields.map(field=><ConfigField key={field.key} field={field} language={language} value={form[field.key]} onChange={value=>setForm(current=>({...current,[field.key]:value}))}/>)}
          </FormGrid>
        </FormSection>
      </form>
    </Drawer>
  </PageChrome>
}

function ConfigField({field,value,onChange,language}){
  const label=studioFieldLabel(field,language)
  if(field.type==='checkbox')return <FormField label={label}><label style={{display:'flex',alignItems:'center',gap:10,minHeight:48}}><input type="checkbox" checked={Boolean(value)} onChange={event=>onChange(event.target.checked)}/><span>{value?(language==='en'?'Yes':'Ναι'):(language==='en'?'No':'Όχι')}</span></label></FormField>
  if(field.type==='select')return <FormField label={label} required={field.required}><select required={field.required} value={value??''} onChange={event=>onChange(event.target.value)}>{field.options.map(option=><option key={option} value={option}>{studioOptionLabel(option,language)}</option>)}</select></FormField>
  if(field.type==='textarea')return <FormField label={label} required={field.required}><textarea rows="4" required={field.required} value={value??''} onChange={event=>onChange(event.target.value)}/></FormField>
  return <FormField label={label} required={field.required}><input required={field.required} value={value??''} onChange={event=>onChange(event.target.value)}/></FormField>
}
