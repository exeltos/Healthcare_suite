import { useNavigate } from 'react-router-dom'
import { Blocks, LayoutTemplate, Palette, Ruler, ShieldCheck } from 'lucide-react'
import { BackLink, Card, PageChrome } from '../../components/core'
import PageHeader from '../../components/core/PageHeader/PageHeader'
import { componentRegistry, designTokens, pageAudit } from '../../design-system/registry'
import './DeveloperCenterPage.css'

export default function DeveloperCenterPage(){
  const navigate=useNavigate()
  const componentCount=componentRegistry.reduce((sum,group)=>sum+group.items.length,0)
  return <PageChrome
    className="developer-center"
    back={<BackLink onClick={()=>navigate('/studio')}>Πίσω στο Κέντρο Διαχείρισης</BackLink>}
    header={<PageHeader eyebrow="HEALTHCARE SUITE DESIGN SYSTEM" title="Design & Developer Center" description="Εσωτερικός έλεγχος του κοινού design system, των reusable components και της συνέπειας των σελίδων." />}
  >
    <div className="developer-center__grid">
      <Card><SectionTitle icon={<Palette/>} title="Design System" subtitle={`${designTokens.length} ενεργά design tokens`}/><div className="token-grid">{designTokens.map(([label,token])=><div className="token" key={token}><i style={{background:`var(${token})`}}/><div><strong>{label}</strong><code>{token}</code></div></div>)}</div><div className="scale-list"><span><Ruler size={15}/> Spacing: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64</span><span><Ruler size={15}/> Radius: 8 · 12 · 20</span><span><Ruler size={15}/> Control height: 48px</span><span><Ruler size={15}/> Page gap: 24px</span></div></Card>
      <Card><SectionTitle icon={<Blocks/>} title="Κοινά Components" subtitle={`${componentCount} καταχωρημένα reusable components`}/><div className="component-groups">{componentRegistry.map(group=><div key={group.group}><h3>{group.group}</h3><div>{group.items.map(item=><span key={item}>{item}</span>)}</div></div>)}</div></Card>
      <Card className="developer-center__wide"><SectionTitle icon={<LayoutTemplate/>} title="Page Patterns" subtitle="Τα templates που πρέπει να ακολουθούν οι λειτουργικές ενότητες"/><div className="pattern-list">{[...new Map(pageAudit.map(row=>[row[1],row])).values()].map(row=><div className="pattern-item" key={row[1]}><LayoutTemplate size={16}/><div><strong>{row[1]}</strong><span>{row[2]}</span></div></div>)}</div></Card>
      <Card className="developer-center__wide"><SectionTitle icon={<ShieldCheck/>} title="Consistency Audit" subtitle="Έλεγχος ότι κάθε περιοχή χρησιμοποιεί το συμφωνημένο κοινό pattern"/><div className="audit-table"><div className="audit-table__head"><span>Περιοχή</span><span>Template</span><span>Πρότυπο</span></div>{pageAudit.map(row=><div className="audit-table__row" key={row[0]}>{row.map(cell=><span key={cell}>{cell}</span>)}</div>)}</div></Card>
    </div>
  </PageChrome>
}

function SectionTitle({icon,title,subtitle}){return <div className="developer-section-title"><div>{icon}</div><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div></div>}
