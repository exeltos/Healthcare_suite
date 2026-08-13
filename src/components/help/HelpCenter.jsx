import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BookOpen, ChevronRight, Info, Search, ShieldCheck, Sparkles, UsersRound, X } from 'lucide-react'
import { useI18n } from '../../i18n'
import { HELP_VERSION, helpSections, inferHelpSection } from './helpContent'
import Button from '../core/Button/Button'
import './HelpCenter.css'

const txt=(value,en)=>value?.[en?'en':'el']||''

export default function HelpCenter({open,onClose,initialSection}){
  const {language}=useI18n(),en=language==='en'
  const [query,setQuery]=useState('')
  const [active,setActive]=useState(initialSection||'start')
  const [visualOpen,setVisualOpen]=useState(false)

  useEffect(()=>{
    if(open){
      setActive(initialSection||inferHelpSection())
      setQuery('')
      setVisualOpen(false)
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
    <section className="help-center" role="dialog" aria-modal="true" aria-label={en?'Limoxis User Guide':'Εγχειρίδιο Χρήσης Limoxis'}>
      <header className="help-header">
        <div>
          <span className="help-eyebrow"><BookOpen size={15}/>{en?'IN-APP USER GUIDE':'ΕΝΣΩΜΑΤΩΜΕΝΟ ΕΓΧΕΙΡΙΔΙΟ'}</span>
          <h2>{en?'Limoxis Help Center':'Κέντρο Βοήθειας Limoxis'}</h2>
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

          <section className="help-visual" aria-label={en?'Illustrated screen guide':'Εικονογραφημένος οδηγός οθόνης'}>
            <button type="button" className="help-visual-button" onClick={()=>setVisualOpen(true)}>
              <img src={`/help/${current.id}.svg`} alt={en?`Illustrated guide for ${txt(current.title,en)}`:`Εικονογραφημένος οδηγός: ${txt(current.title,en)}`}/>
              <span className="help-visual-zoom">{en?'Open larger view':'Άνοιγμα μεγαλύτερης προβολής'}</span>
            </button>
            <p>{en?'Select the image to enlarge it. The illustration follows the Limoxis interface and highlights the structure of this workflow.':'Πατήστε την εικόνα για μεγέθυνση. Η απεικόνιση ακολουθεί το περιβάλλον του Limoxis και δείχνει τη δομή της συγκεκριμένης ροής.'}</p>
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
            <div><strong>{en?'Contextual help':'Βοήθεια ανά οθόνη'}</strong><span>{en?'When you open Help from the ? button, Limoxis tries to open the topic related to your current screen.':'Όταν ανοίγετε τη Βοήθεια από το ?, το Limoxis προσπαθεί να σας μεταφέρει απευθείας στο θέμα της οθόνης που χρησιμοποιείτε.'}</span></div>
          </div>

          <footer className="help-article-footer">Healthcare Suite · Limoxis Observer · {en?'Version':'Έκδοση'} {HELP_VERSION}</footer>
        </article>
      </div>
      {visualOpen&&<div className="help-lightbox" role="dialog" aria-modal="true" aria-label={en?'Enlarged help image':'Μεγεθυμένη εικόνα βοήθειας'} onMouseDown={e=>e.target===e.currentTarget&&setVisualOpen(false)}>
        <div className="help-lightbox-card">
          <button type="button" className="help-lightbox-close" onClick={()=>setVisualOpen(false)} aria-label={en?'Close image':'Κλείσιμο εικόνας'}><X size={20}/></button>
          <img src={`/help/${current.id}.svg`} alt={txt(current.title,en)}/>
          <strong>{txt(current.title,en)}</strong>
        </div>
      </div>}
    </section>
  </div>
}

function CircleDot(){return <span className="help-tip-dot">?</span>}
