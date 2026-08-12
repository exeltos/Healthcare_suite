import { ArrowLeft } from 'lucide-react'
import IconButton from '../IconButton/IconButton'
import Tabs from '../Tabs/Tabs'
import './Workspace.css'

export function WorkspaceShell({ className = '', shellClassName = '', children }) {
  return <div className={`core-workspace-page ${className}`.trim()}><section className={`core-workspace-shell ${shellClassName}`.trim()}>{children}</section></div>
}

export function WorkspaceHeader({ backLabel = 'Επιστροφή', onBack, avatar, eyebrow, title, badges, meta, actions }) {
  return <header className="core-workspace-header">
    <div className="core-workspace-header-main">
      {onBack ? <IconButton label={backLabel} size="sm" onClick={onBack}><ArrowLeft size={18} /></IconButton> : null}
      {avatar ? <div className="core-workspace-avatar">{avatar}</div> : null}
      <div className="core-workspace-identity">
        {eyebrow ? <small>{eyebrow}</small> : null}
        <div className="core-workspace-title-line"><h1>{title}</h1>{badges ? <div className="core-workspace-badges">{badges}</div> : null}</div>
        {meta ? <p>{meta}</p> : null}
      </div>
    </div>
    {actions ? <div className="core-workspace-actions">{actions}</div> : null}
  </header>
}

export function WorkspaceTabs({ items, value, onChange, ariaLabel }) {
  return <div className="core-workspace-tabs"><Tabs variant="clinical" items={items} value={value} onChange={onChange} ariaLabel={ariaLabel} /></div>
}

export function WorkspaceBody({ className = '', children }) {
  return <main className={`core-workspace-body ${className}`.trim()}>{children}</main>
}

export function WorkspaceSectionHeader({ icon, eyebrow, title, text, actions }) {
  return <header className="core-workspace-section-header">
    <div className="core-workspace-section-main">
      {icon ? <span className="core-workspace-section-icon">{icon}</span> : null}
      <div className="core-workspace-section-copy">
        {eyebrow ? <small>{eyebrow}</small> : null}
        <h2>{title}</h2>
        {text ? <p>{text}</p> : null}
      </div>
    </div>
    {actions ? <div className="core-workspace-section-actions">{actions}</div> : null}
  </header>
}
