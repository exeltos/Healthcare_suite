import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BookOpen, ChevronRight, ExternalLink, Info, Maximize2, RefreshCcw, Search, ShieldCheck, Sparkles, UsersRound, X } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useNavigate } from 'react-router-dom'
import { APP_ROUTES } from '../../config/routes'
import { HELP_VERSION, helpSections, inferHelpSection } from './helpContent'
import Button from '../core/Button/Button'
import './HelpCenter.css'

const txt=(value,en)=>value?.[en?'en':'el']||''

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
  const params=new URLSearchParams({helpPreview:'1'})
  if(refreshKey)params.set('r',String(refreshKey))
  return `${route}?${params.toString()}`
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

  const visible=useMemo(()=>{
    const q=query.trim().toLowerCase()
    if(!q)return helpSections
    return helpSections.filter(section=>{
      const content=[section.title.el,section.title.en,section.summary.el,section.summary.en,section.purpose?.el,section.purpose?.en,section.audience?.el,section.audience?.en,...(section.steps?.el||[]),...(section.steps?.en||[]),...(section.important?.el||[]),...(section.important?.en||[])].join(' ').toLowerCase()
      return content.includes(q)
    })
  },[query])

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
          <label className="help-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={en?'Search instructions…':'Αναζήτηση οδηγιών…'}/></label>
          <div className="help-nav-scroll">
            {visible.length?visible.map(s=><Button key={s.id} variant="ghost" size="sm" className={`help-nav-button ${active===s.id?'active':''}`} onClick={()=>setActive(s.id)}><span>{txt(s.title,en)}</span><ChevronRight size={15}/></Button>):<p className="help-empty">{en?'No matching help topic.':'Δεν βρέθηκε σχετικό θέμα.'}</p>}
          </div>
          <Button variant="ghost" size="sm" className={`help-about-link ${active==='about'?'active':''}`} onClick={()=>setActive('about')} icon={<Info size={16}/>}>{en?'About / Version':'Σχετικά / Έκδοση'}</Button>
        </aside>

        <article className="help-article">
          <div className="help-article-heading">
            <span className="help-section-kicker">{en?'USER GUIDE':'ΟΔΗΓΟΣ ΧΡΗΣΗΣ'}</span>
            <h3>{txt(current.title,en)}</h3>
            <p className="help-lead">{txt(current.summary,en)}</p>
          </div>

          <div className="help-overview-grid">
            <section><span className="help-card-icon"><Sparkles size={17}/></span><div><small>{en?'PURPOSE':'ΣΚΟΠΟΣ'}</small><p>{txt(current.purpose,en)}</p></div></section>
            <section><span className="help-card-icon"><UsersRound size={17}/></span><div><small>{en?'WHO USES IT':'ΠΟΙΟΙ ΤΟ ΧΡΗΣΙΜΟΠΟΙΟΥΝ'}</small><p>{txt(current.audience,en)}</p></div></section>
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
                <Button variant="ghost" size="sm" className="help-live-icon-button" onClick={()=>{onClose?.();navigate(HELP_PREVIEW_ROUTES[current.id]||APP_ROUTES.DASHBOARD)}} title={en?'Open section':'Άνοιγμα ενότητας'} aria-label={en?'Open section':'Άνοιγμα ενότητας'} icon={<ExternalLink size={15}/>}/>
              </div>
            </div>
            <div className="help-live-frame-wrap">
              <iframe key={`${current.id}-${previewRefresh}`} className="help-live-frame" src={previewUrl(current.id,previewRefresh)} title={en?`Live preview: ${txt(current.title,en)}`:`Ζωντανή προεπισκόπηση: ${txt(current.title,en)}`} tabIndex="-1" />
              <Button variant="ghost" size="sm" className="help-live-glass" onClick={()=>setVisualOpen(true)} aria-label={en?'Enlarge live preview':'Μεγέθυνση ζωντανής προεπισκόπησης'}>{en?'Select to enlarge':'Πατήστε για μεγέθυνση'}</Button>
            </div>
            <p>{en?'This is not an illustration or a stored screenshot. It is the actual application page rendered live in read-only mode, so the guide stays aligned with the interface as it evolves.':'Δεν είναι εικονογράφηση ή αποθηκευμένο screenshot. Είναι η πραγματική σελίδα της εφαρμογής που αποδίδεται ζωντανά σε λειτουργία μόνο για ανάγνωση, ώστε το εγχειρίδιο να παραμένει συγχρονισμένο με την εφαρμογή.'}</p>
          </section>

          {steps?.length>0&&<section className="help-content-section">
            <h4>{en?'Step by step':'Βήμα προς βήμα'}</h4>
            <ol className="help-steps">{steps.map((step,index)=><li key={step}><span>{index+1}</span><p>{step}</p></li>)}</ol>
          </section>}

          {important?.length>0&&<section className="help-content-section">
            <h4>{en?'Important checks':'Σημαντικοί έλεγχοι'}</h4>
            <div className="help-warning"><AlertTriangle size={19}/><div>{important.map(item=><p key={item}>{item}</p>)}</div></div>
          </section>}

          <section className="help-content-section">
            <h4>{en?'Related areas':'Σχετικές ενότητες'}</h4>
            <div className="help-related"><ShieldCheck size={17}/><span>{txt(current.related,en)}</span></div>
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
          <div className="help-lightbox-footer"><span>{en?'Read-only live application view':'Ζωντανή προβολή εφαρμογής μόνο για ανάγνωση'}</span><Button variant="secondary" size="sm" onClick={()=>{setVisualOpen(false);onClose?.();navigate(HELP_PREVIEW_ROUTES[current.id]||APP_ROUTES.DASHBOARD)}} icon={<ExternalLink size={15}/>}>{en?'Open this section':'Άνοιγμα αυτής της ενότητας'}</Button></div>
        </div>
      </div>}
    </section>
  </div>
}

function CircleDot(){return <span className="help-tip-dot">?</span>}
