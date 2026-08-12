import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { navigation } from '../../data/navigation'
import './Sidebar.css'
import { useI18n } from '../../i18n'

function containsPath(item, pathname) {
  if (item.path) return pathname === item.path || pathname.startsWith(`${item.path}/`)
  return (item.children || []).some((child) => containsPath(child, pathname))
}

export default function Sidebar({ collapsed, mobileOpen, onNavigate }) {
  const location = useLocation()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [openGroup, setOpenGroup] = useState(null)

  useEffect(() => {
    let active = null
    navigation.forEach((section) => section.items.forEach((item) => {
      if (item.children?.length && containsPath(item, location.pathname)) active = item.id
    }))
    setOpenGroup((current) => active || (current && !navigation.some((section) => section.items.some((item) => item.id === current && containsPath(item, location.pathname))) ? null : current))
  }, [location.pathname])

  function toggleGroup(id) { setOpenGroup((current) => current === id ? null : id) }
  function closeGroupsAndNavigate(item, depth) {
    if (depth > 0) { onNavigate?.(); return }
    setOpenGroup(null)
    onNavigate?.()
  }

  function renderItem(item, depth = 0) {
    const Icon = item.icon
    const label = item.labelKey ? t(item.labelKey) : item.label
    const hasChildren = Boolean(item.children?.length)
    const expanded = openGroup === item.id
    const active = containsPath(item, location.pathname)

    if (!hasChildren) return <NavLink key={item.id} to={item.path} end={item.id==='laboratory'||item.id==='dashboard'} onClick={() => closeGroupsAndNavigate(item, depth)} title={collapsed ? label : undefined} className={({isActive}) => `${depth ? 'sidebar-submenu-link' : 'nav-link'} ${isActive ? 'active' : ''} ${item.emphasis ? 'emphasis' : ''}`}><span className={depth ? '' : 'nav-icon'}><Icon size={depth ? 16 : 19} strokeWidth={2.1}/></span>{!collapsed && <span className={depth ? '' : 'nav-label'}>{label}</span>}</NavLink>

    if (collapsed) return <button key={item.id} type="button" className={`nav-link sidebar-group-button ${active ? 'active' : ''}`} title={label} onClick={() => { const first=item.children?.[0]; if(first?.path){navigate(first.path);onNavigate?.()} }}><span className="nav-icon"><Icon size={19} strokeWidth={2.1}/></span></button>

    return <div className={`sidebar-group depth-${depth} ${active ? 'active' : ''}`} key={item.id}><button type="button" className={`${depth ? 'sidebar-subgroup-button' : 'nav-link sidebar-group-button'} ${active ? 'active' : ''}`} onClick={() => toggleGroup(item.id)} aria-expanded={expanded}><span className={depth ? '' : 'nav-icon'}><Icon size={depth ? 16 : 19} strokeWidth={2.1}/></span><span className={depth ? '' : 'nav-label'}>{label}</span><ChevronDown className={`sidebar-chevron ${expanded ? 'open' : ''}`} size={16}/></button>{expanded && <div className={`sidebar-submenu depth-${depth+1}`}>{item.children.map(child=>renderItem(child,depth+1))}</div>}</div>
  }

  return <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}><nav className="sidebar-nav">{navigation.map(section=><div className="nav-section" key={section.id}>{section.items.map(item=>renderItem(item))}</div>)}</nav></aside>
}
