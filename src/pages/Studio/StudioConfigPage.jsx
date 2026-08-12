import { useMemo, useState } from 'react'
import { confirmAction } from '../../components/core/feedback/index'
import { Download, Plus, Printer, RotateCcw, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BackLink, Badge, Button, Drawer, EntityCell, EntitySummary, FormActions, FormField, FormGrid, FormSection, ListWorkspace, PageChrome, PageHeader, StatCard } from '../../components/core'
import { loadStudioRows, resetStudioRows, saveStudioRows, studioModules } from '../../services/studioConfigService'
import { normalizeText, selectedRows, sortRows } from '../../core/utils/entityList'
import { downloadCsv, printRows } from '../../core/utils/listExport'

function emptyForm(config){
  return Object.fromEntries(config.fields.map(field=>[field.key, field.type==='checkbox' ? false : (field.options?.[0] || '')]))
}

export default function StudioConfigPage({ moduleKey }){
  const navigate=useNavigate()
  const config=studioModules[moduleKey]
  const [rows,setRows]=useState(()=>loadStudioRows(moduleKey))
  const [search,setSearch]=useState('')
  const [sort,setSort]=useState({key:'name',direction:'asc'})
  const [selectedKeys,setSelectedKeys]=useState([])
  const [editing,setEditing]=useState(undefined)
  const [form,setForm]=useState(()=>emptyForm(config))
  const filtered=useMemo(()=>sortRows(rows.filter(row=>!normalizeText(search)||normalizeText(Object.values(row).join(' ')).includes(normalizeText(search))),sort),[rows,search,sort])
  const selected=useMemo(()=>selectedRows(filtered,selectedKeys),[filtered,selectedKeys])
  const activeCount=rows.filter(row=>row.active!==false).length
  const exportColumns=[{label:'Όνομα',value:r=>r.name},{label:'Κατάσταση',value:r=>r.active===false?'Ανενεργό':'Ενεργό'}]

  if(!config)return null
  function openNew(){setEditing(null);setForm(emptyForm(config))}
  function openRow(row){setEditing(row);setForm({...emptyForm(config),...row})}
  function close(){setEditing(undefined)}
  function persist(next){setRows(next);saveStudioRows(moduleKey,next)}
  function save(event){
    event.preventDefault()
    const required=config.fields.filter(field=>field.required)
    if(required.some(field=>!String(form[field.key]??'').trim()))return
    const row={...form,id:editing?.id||`${moduleKey.toUpperCase()}-${Date.now()}`}
    persist(editing ? rows.map(item=>item.id===editing.id?row:item) : [row,...rows])
    close()
  }
  function remove(){if(!editing||!confirmAction(`Να διαγραφεί το ${config.singular};`))return;persist(rows.filter(row=>row.id!==editing.id));close()}
  function reset(){const next=resetStudioRows(moduleKey);setRows(next);setSelectedKeys([])}

  return <PageChrome
    className="studio-config-page"
    back={<BackLink onClick={()=>navigate('/studio')}>Πίσω στο Κέντρο Διαχείρισης</BackLink>}
    header={<PageHeader title={config.title} description={config.description} actions={<Button icon={<Plus size={16}/>} onClick={openNew}>Νέα καταχώρηση</Button>} />}
  >
    <ListWorkspace
      stats={<EntitySummary columns={3} ariaLabel={`Σύνοψη ${config.title}`}><StatCard label="Σύνολο" value={rows.length}/><StatCard label="Ενεργά" value={activeCount}/><StatCard label="Ανενεργά" value={rows.length-activeCount}/></EntitySummary>}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={`Αναζήτηση στο ${config.title}…`}
      selectedCount={selected.length}
      onClearSelection={()=>setSelectedKeys([])}
      bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={()=>printRows({title:config.title,columns:exportColumns,rows:selected})}>Εκτύπωση / PDF</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={()=>downloadCsv({filename:`studio-${moduleKey}.csv`,columns:exportColumns,rows:selected})}>Εξαγωγή CSV</Button></>}
      columns={[
        {key:'name',label:'Όνομα',sortable:true,render:r=><EntityCell primary={r.name} secondary={config.fields.find(f=>f.key==='source')?r.source:(config.fields.find(f=>f.key==='scope')?r.scope:'')}/>},
        {key:'status',label:'Κατάσταση',render:r=><Badge tone={r.active===false?'neutral':'success'}>{r.active===false?'Ανενεργό':'Ενεργό'}</Badge>},
      ]}
      rows={filtered}
      getRowKey={row=>row.id}
      onRowClick={openRow}
      selectedKeys={selectedKeys}
      onSelectionChange={setSelectedKeys}
      sort={sort}
      onSortChange={setSort}
      ariaLabel={config.title}
      emptyTitle={`Δεν υπάρχουν ${config.singular}`}
    />
    <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}><Button variant="ghost" size="sm" icon={<RotateCcw size={15}/>} onClick={reset}>Επαναφορά αρχικών</Button></div>

    <Drawer open={editing!==undefined} onClose={close} title={editing?`Επεξεργασία – ${editing.name}`:`Νέο ${config.singular}`} description={config.description} width={1040} position="center" footer={<FormActions form={`studio-${moduleKey}-form`} onCancel={close} extraActions={editing?<Button variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>Διαγραφή</Button>:null}/> }>
      <form id={`studio-${moduleKey}-form`} onSubmit={save}>
        <FormSection title="Ρύθμιση">
          <FormGrid columns={2}>
            {config.fields.map(field=><ConfigField key={field.key} field={field} value={form[field.key]} onChange={value=>setForm(current=>({...current,[field.key]:value}))}/>) }
          </FormGrid>
        </FormSection>
      </form>
    </Drawer>
  </PageChrome>
}

function ConfigField({field,value,onChange}){
  if(field.type==='checkbox')return <FormField label={field.label}><label style={{display:'flex',alignItems:'center',gap:10,minHeight:48}}><input type="checkbox" checked={Boolean(value)} onChange={event=>onChange(event.target.checked)}/><span>{value?'Ναι':'Όχι'}</span></label></FormField>
  if(field.type==='select')return <FormField label={field.label} required={field.required}><select required={field.required} value={value??''} onChange={event=>onChange(event.target.value)}>{field.options.map(option=><option key={option}>{option}</option>)}</select></FormField>
  if(field.type==='textarea')return <FormField label={field.label} required={field.required}><textarea rows="4" required={field.required} value={value??''} onChange={event=>onChange(event.target.value)}/></FormField>
  return <FormField label={field.label} required={field.required}><input required={field.required} value={value??''} onChange={event=>onChange(event.target.value)}/></FormField>
}
