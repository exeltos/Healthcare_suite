import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BookOpen, ChevronRight, ExternalLink, Info, Maximize2, RefreshCcw, Search, ShieldCheck, Sparkles, UsersRound, X } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useNavigate } from 'react-router-dom'
import { APP_ROUTES } from '../../config/routes'
import { HELP_VERSION, helpSections, inferHelpSection } from './helpContent'
import Button from '../core/Button/Button'
import './HelpCenter.css'

const txt=(value,en)=>value?.[en?'en':'el']||''

const normalizeHelpText=(value='')=>String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'')
  .toLocaleLowerCase('el-GR')
  .replace(/ς/g,'σ')
  .replace(/[^a-z0-9α-ω\s]/gi,' ')
  .replace(/\s+/g,' ')
  .trim()

const HELP_SEARCH_ALIASES={
  dashboard:'dashboard αρχικη αρχική συνοψη σύνοψη γραφηματα γραφήματα analytics αναλυση ανάλυση δεδομενων δεδομένων',
  patients:'ασθενησ ασθενεις ασθενής ασθενείς patient patients λοιμωξη λοίμωξη επιτηρηση επιτήρηση καλλιεργεια καλλιέργεια',
  employees:'προσωπικο προσωπικό εργαζομενοι εργαζόμενοι εργαζομενος εργαζόμενος staff employee employees',
  environment:'περιβαλλον περιβάλλον επιφανειες επιφάνειες νερο νερό δειγματα δείγματα environmental',
  laboratory:'εργαστηριο εργαστήριο μικροβιολογια μικροβιολογία καλλιεργειες καλλιέργειες μικροβια μικρόβια cultures lab',
  'hand-hygiene':'υγιεινη υγιεινή χεριων χεριών who hand hygiene παρατηρηση παρατήρηση συμμορφωση συμμόρφωση',
  prevention:'προληψη πρόληψη εμβολιασμοι εμβολιασμοί αντιβιοτικα αντιβιοτικά bundles vaccination prevention',
  quality:'ποιοτητα ποιότητα συμβαντα συμβάντα audits audit δεικτες δείκτες capa quality incidents',
  organization:'επιτροπεσ επιτροπές εκπαιδευση εκπαίδευση εγγραφα έγγραφα committees training documents',
  management:'κεντρο κέντρο διαχειρισησ διαχείρισης βιβλιοθηκες βιβλιοθήκες ρυθμισεις ρυθμίσεις studio settings management',
  roles:'ρολοι ρόλοι δικαιωματα δικαιώματα χρηστες χρήστες permissions users access',
  lira:'lira ai τεχνητη τεχνητή νοημοσυνη νοημοσύνη βοηθοσ βοηθός assistant',
  profile:'προφιλ προφίλ λογαριασμοσ λογαριασμός account profile',
  demo:'demo δοκιμη δοκιμή δεδομενα δεδομένα επίδειξη επιδειξη',
  about:'σχετικα σχετικά εκδοση έκδοση version about',
  start:'βοηθεια βοήθεια εγχειριδιο εγχειρίδιο οδηγος οδηγός help manual guide'
}

const editDistance=(a,b)=>{
  if(a===b)return 0
  if(!a)return b.length
  if(!b)return a.length
  const prev=Array.from({length:b.length+1},(_,i)=>i)
  for(let i=1;i<=a.length;i++){
    let left=i,diag=i-1
    for(let j=1;j<=b.length;j++){
      const up=prev[j]
      const next=Math.min(up+1,left+1,diag+(a[i-1]===b[j-1]?0:1))
      prev[j]=next;diag=up;left=next
    }
  }
  return prev[b.length]
}

const fuzzyWordMatch=(needle,word)=>{
  if(word.includes(needle)||needle.includes(word))return true
  if(needle.length<4||word.length<4)return false
  const maxDistance=needle.length>=8?2:1
  return Math.abs(needle.length-word.length)<=maxDistance&&editDistance(needle,word)<=maxDistance
}

const sectionSearchParts=(section,en)=>[
  {kind:'title',label:en?'Title':'Τίτλος',text:txt(section.title,en)},
  {kind:'summary',label:en?'Summary':'Περιγραφή',text:txt(section.summary,en)},
  {kind:'purpose',label:en?'Purpose':'Σκοπός',text:txt(section.purpose,en)},
  {kind:'audience',label:en?'Users':'Χρήστες',text:txt(section.audience,en)},
  ...(en?(section.steps?.en||[]):(section.steps?.el||[])).map(text=>({kind:'step',label:en?'Step':'Βήμα',text})),
  ...(en?(section.important?.en||[]):(section.important?.el||[])).map(text=>({kind:'important',label:en?'Important':'Σημαντικό',text})),
  {kind:'related',label:en?'Related':'Σχετικό',text:txt(section.related,en)},
  {kind:'aliases',label:en?'Related term':'Σχετικός όρος',text:HELP_SEARCH_ALIASES[section.id]||''}
].filter(part=>part.text)

const scoreWordMatch=(needle,word)=>{
  if(!needle||!word)return 0
  if(word===needle)return 12
  if(word.startsWith(needle))return 9
  if(word.includes(needle))return 7
  if(needle.includes(word)&&word.length>=4)return 4
  if(fuzzyWordMatch(needle,word))return 3
  return 0
}

const scorePart=(text,needles)=>{
  const normalized=normalizeHelpText(text)
  const words=normalized.split(' ').filter(Boolean)
  let score=0
  for(const needle of needles){
    let best=0
    for(const word of words)best=Math.max(best,scoreWordMatch(needle,word))
    if(!best)return 0
    score+=best
  }
  return score
}

const findHelpResults=(sections,query,en)=>{
  const q=normalizeHelpText(query)
  if(!q)return sections.map(section=>({section,score:0,hitLabel:'',snippet:''}))
  const needles=q.split(' ').filter(Boolean)
  return sections.map(section=>{
    let best=null
    let total=0
    for(const part of sectionSearchParts(section,en)){
      const partScore=scorePart(part.text,needles)
      if(partScore){
        const weighted=partScore+(part.kind==='title'?18:part.kind==='summary'?8:part.kind==='aliases'?2:0)
        total+=weighted
        if(!best||weighted>best.score)best={score:weighted,label:part.label,snippet:part.text}
      }
    }
    return best?{section,score:total,hitLabel:best.label,snippet:best.snippet}:null
  }).filter(Boolean).sort((a,b)=>b.score-a.score||txt(a.section.title,en).localeCompare(txt(b.section.title,en),en?'en':'el'))
}

const Highlight=({text,query})=>{
  const needles=normalizeHelpText(query).split(' ').filter(Boolean)
  if(!needles.length)return text
  const chunks=String(text||'').split(/(\s+)/)
  return chunks.map((chunk,index)=>{
    if(!chunk.trim())return chunk
    const word=normalizeHelpText(chunk)
    const hit=needles.some(needle=>scoreWordMatch(needle,word)>0)
    return hit?<mark className="help-search-mark" key={`${chunk}-${index}`}>{chunk}</mark>:chunk
  })
}

const HELP_PREVIEW_ROUTES={
  start:APP_ROUTES.DASHBOARD,
  dashboard:APP_ROUTES.DASHBOARD,
  patients:APP_ROUTES.PATIENTS,
  employees:APP_ROUTES.EMPLOYEES,
  environment:APP_ROUTES.LABORATORY_ENVIRONMENT,
  laboratory:APP_ROUTES.LABORATORY,
  'hand-hygiene':APP_ROUTES.HAND_HYGIENE,
  prevention:APP_ROUTES.PREVENTION,
  quality:APP_ROUTES.QUALITY,
  organization:APP_ROUTES.ORGANIZATION,
  management:APP_ROUTES.STUDIO,
  roles:APP_ROUTES.STUDIO_ROLES,
  lira:APP_ROUTES.LIRA,
  profile:APP_ROUTES.DASHBOARD,
  demo:APP_ROUTES.DASHBOARD,
  about:APP_ROUTES.DASHBOARD,
}

function previewUrl(sectionId,refreshKey=''){
  const route=HELP_PREVIEW_ROUTES[sectionId]||APP_ROUTES.DASHBOARD
  // Always bootstrap the preview from the SPA root. This prevents Netlify from
  // treating internal BrowserRouter paths (e.g. /dashboard) as physical files.
  const params=new URLSearchParams({helpPreview:'1',helpRoute:route})
  if(refreshKey)params.set('r',String(refreshKey))
  return `/?${params.toString()}`
}


export default function HelpCenter({open,onClose,initialSection}){
  const {language}=useI18n(),en=language==='en'
  const navigate=useNavigate()
  const [query,setQuery]=useState('')
  const [active,setActive]=useState(initialSection||'start')
  const [visualOpen,setVisualOpen]=useState(false)
  const [previewRefresh,setPreviewRefresh]=useState(0)

  useEffect(()=>{
    if(open){
      setActive(initialSection||inferHelpSection())
      setQuery('')
      setVisualOpen(false)
      setPreviewRefresh(0)
    }
  },[open,initialSection])

  const searchResults=useMemo(()=>findHelpResults(helpSections,query,en),[query,en])
  const visible=query.trim()?searchResults.map(result=>result.section):helpSections

  useEffect(()=>{
    if(!query.trim()||!searchResults.length)return
    if(!searchResults.some(result=>result.section.id===active))setActive(searchResults[0].section.id)
  },[query,searchResults,active])

  if(!open)return null
  const current=helpSections.find(s=>s.id===active)||helpSections[0]
  const steps=en?current.steps?.en:current.steps?.el
  const important=en?current.important?.en:current.important?.el

  return <div className="help-overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose?.()}>
    <section className="help-center" role="dialog" aria-modal="true" aria-label={en?'Healthcare Suite User Guide':'Εγχειρίδιο Χρήσης Healthcare Suite'}>
      <header className="help-header">
        <div>
          <span className="help-eyebrow"><BookOpen size={15}/>{en?'IN-APP USER GUIDE':'ΕΝΣΩΜΑΤΩΜΕΝΟ ΕΓΧΕΙΡΙΔΙΟ'}</span>
          <h2>{en?'Help Center':'Κέντρο Βοήθειας'}</h2>
          <p>{en?'Detailed, searchable guidance for every main workflow. Read-only inside the application.':'Αναλυτικές, αναζητήσιμες οδηγίες για τις βασικές ροές. Διαβάζεται μόνο μέσα στην εφαρμογή.'}</p>
        </div>
        <Button variant="ghost" size="sm" className="help-close-button" onClick={onClose} aria-label={en?'Close':'Κλείσιμο'} icon={<X size={19}/>}/>
      </header>

      <div className="help-layout">
        <aside className="help-nav">
          <div className="help-search-wrap">
            <label className="help-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={en?'Search anything…':'Αναζήτηση σε όλο το εγχειρίδιο…'}/>{query&&<button type="button" className="help-search-clear" onClick={()=>setQuery('')} aria-label={en?'Clear search':'Καθαρισμός αναζήτησης'}><X size={14}/></button>}</label>
            {query.trim()&&<div className="help-search-status"><strong>{searchResults.length}</strong> {en?'matching topics':'σχετικά θέματα'}<span>·</span>{en?'searches titles, steps and checks':'τίτλοι, βήματα και έλεγχοι'}</div>}
          </div>
          <div className="help-nav-scroll">
            {query.trim()?searchResults.length?searchResults.map(result=><button type="button" key={result.section.id} className={`help-search-result ${active===result.section.id?'active':''}`} onClick={()=>setActive(result.section.id)}>
              <span className="help-search-result-top"><strong>{txt(result.section.title,en)}</strong><ChevronRight size={15}/></span>
              <small>{result.hitLabel}</small>
              <p><Highlight text={result.snippet} query={query}/></p>
            </button>):<div className="help-empty help-empty-search"><Search size={20}/><strong>{en?'No matching topic':'Δεν βρέθηκε σχετικό θέμα'}</strong><span>{en?'Try a shorter word or a related term.':'Δοκιμάστε μικρότερη λέξη ή σχετικό όρο.'}</span></div>
            :visible.map(s=><Button key={s.id} variant="ghost" size="sm" className={`help-nav-button ${active===s.id?'active':''}`} onClick={()=>setActive(s.id)}><span>{txt(s.title,en)}</span><ChevronRight size={15}/></Button>)}
          </div>
        </aside>

        <article className="help-article">
          <div className="help-article-heading">
            <span className="help-section-kicker">{en?'USER GUIDE':'ΟΔΗΓΟΣ ΧΡΗΣΗΣ'}</span>
            <h3><Highlight text={txt(current.title,en)} query={query}/></h3>
            <p className="help-lead"><Highlight text={txt(current.summary,en)} query={query}/></p>
          </div>

          <div className="help-overview-grid">
            <section><span className="help-card-icon"><Sparkles size={17}/></span><div><small>{en?'PURPOSE':'ΣΚΟΠΟΣ'}</small><p><Highlight text={txt(current.purpose,en)} query={query}/></p></div></section>
            <section><span className="help-card-icon"><UsersRound size={17}/></span><div><small>{en?'WHO USES IT':'ΠΟΙΟΙ ΤΟ ΧΡΗΣΙΜΟΠΟΙΟΥΝ'}</small><p><Highlight text={txt(current.audience,en)} query={query}/></p></div></section>
          </div>

          <section className="help-live-preview" aria-label={en?'Live application preview':'Ζωντανή προεπισκόπηση εφαρμογής'}>
            <div className="help-live-preview-head">
              <div>
                <span className="help-live-badge">{en?'LIVE UI':'ΖΩΝΤΑΝΟ UI'}</span>
                <strong>{en?'Actual application screen':'Πραγματική οθόνη εφαρμογής'}</strong>
                <small>{en?'Read-only preview rendered by the application itself.':'Προεπισκόπηση μόνο για ανάγνωση, από την ίδια την εφαρμογή.'}</small>
              </div>
              <div className="help-live-actions">
                <Button variant="ghost" size="sm" className="help-live-icon-button" onClick={()=>setPreviewRefresh(v=>v+1)} title={en?'Refresh preview':'Ανανέωση προεπισκόπησης'} aria-label={en?'Refresh preview':'Ανανέωση προεπισκόπησης'} icon={<RefreshCcw size={15}/>}/>
                <Button variant="ghost" size="sm" className="help-live-icon-button" onClick={()=>setVisualOpen(true)} title={en?'Enlarge':'Μεγέθυνση'} aria-label={en?'Enlarge':'Μεγέθυνση'} icon={<Maximize2 size={15}/>}/>
                <Button variant="secondary" size="sm" className="help-open-section-button" onClick={()=>{onClose?.();navigate(HELP_PREVIEW_ROUTES[current.id]||APP_ROUTES.DASHBOARD)}} icon={<ExternalLink size={15}/>}>{en?'Open section':'Άνοιγμα ενότητας'}</Button>
              </div>
            </div>
            <div className="help-live-frame-wrap">
              <iframe key={`${current.id}-${previewRefresh}`} className="help-live-frame" src={previewUrl(current.id,previewRefresh)} title={en?`Live preview: ${txt(current.title,en)}`:`Ζωντανή προεπισκόπηση: ${txt(current.title,en)}`} tabIndex="-1" />
              <div className="help-live-readonly-overlay" aria-hidden="true" />
            </div>
            <p>{en?'This is not an illustration or a stored screenshot. It is the actual application page rendered live in read-only mode, so the guide stays aligned with the interface as it evolves.':'Δεν είναι εικονογράφηση ή αποθηκευμένο screenshot. Είναι η πραγματική σελίδα της εφαρμογής που αποδίδεται ζωντανά σε λειτουργία μόνο για ανάγνωση, ώστε το εγχειρίδιο να παραμένει συγχρονισμένο με την εφαρμογή.'}</p>
          </section>

          {steps?.length>0&&<section className="help-content-section">
            <h4>{en?'Step by step':'Βήμα προς βήμα'}</h4>
            <ol className="help-steps">{steps.map((step,index)=><li key={step}><span>{index+1}</span><p><Highlight text={step} query={query}/></p></li>)}</ol>
          </section>}

          {important?.length>0&&<section className="help-content-section">
            <h4>{en?'Important checks':'Σημαντικοί έλεγχοι'}</h4>
            <div className="help-warning"><AlertTriangle size={19}/><div>{important.map(item=><p key={item}><Highlight text={item} query={query}/></p>)}</div></div>
          </section>}

          <section className="help-content-section">
            <h4>{en?'Related areas':'Σχετικές ενότητες'}</h4>
            <div className="help-related"><ShieldCheck size={17}/><span><Highlight text={txt(current.related,en)} query={query}/></span></div>
          </section>

          <div className="help-context-tip"><CircleDot/>
            <div><strong>{en?'Contextual help':'Βοήθεια ανά οθόνη'}</strong><span>{en?'When you open Help from the ? button, the guide opens the topic related to your current screen.':'Όταν ανοίγετε τη Βοήθεια από το ?, το εγχειρίδιο προσπαθεί να σας μεταφέρει απευθείας στο θέμα της οθόνης που χρησιμοποιείτε.'}</span></div>
          </div>

          <footer className="help-article-footer">Healthcare Suite · {en?'Version':'Έκδοση'} {HELP_VERSION}</footer>
        </article>
      </div>
      {visualOpen&&<div className="help-lightbox" role="dialog" aria-modal="true" aria-label={en?'Enlarged live preview':'Μεγεθυμένη ζωντανή προεπισκόπηση'} onMouseDown={e=>e.target===e.currentTarget&&setVisualOpen(false)}>
        <div className="help-lightbox-card help-live-lightbox-card">
          <Button variant="ghost" size="sm" className="help-lightbox-close" onClick={()=>setVisualOpen(false)} aria-label={en?'Close preview':'Κλείσιμο προεπισκόπησης'} icon={<X size={20}/>}/>
          <div className="help-lightbox-title"><span className="help-live-badge">{en?'LIVE UI':'ΖΩΝΤΑΝΟ UI'}</span><strong>{txt(current.title,en)}</strong></div>
          <div className="help-live-lightbox-frame-wrap">
            <iframe key={`large-${current.id}-${previewRefresh}`} className="help-live-lightbox-frame" src={previewUrl(current.id,previewRefresh)} title={en?`Enlarged live preview: ${txt(current.title,en)}`:`Μεγεθυμένη ζωντανή προεπισκόπηση: ${txt(current.title,en)}`} tabIndex="-1" />
            <div className="help-live-readonly-shield" aria-hidden="true" />
          </div>
          <div className="help-lightbox-footer"><span>{en?'Read-only live application view. Close the preview to continue reading the guide.':'Ζωντανή προβολή εφαρμογής μόνο για ανάγνωση. Κλείστε την προεπισκόπηση για να συνεχίσετε το εγχειρίδιο.'}</span></div>
        </div>
      </div>}
    </section>
  </div>
}

function CircleDot(){return <span className="help-tip-dot">?</span>}
