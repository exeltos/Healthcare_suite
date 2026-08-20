import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { navigation } from '../../data/navigation'
import './Sidebar.css'
import { useI18n } from '../../i18n'
import { canViewModule } from '../../services/accessControlService'

function containsPath(item, pathname) {
  const paths=[item.path,...(item.matchPaths||[])].filter(Boolean)
  if (paths.length) return paths.some(path=>pathname===path||pathname.startsWith(`${path}/`))
  return (item.children || []).some((child) => containsPath(child, pathname))
}

export default function Sidebar({ collapsed, mobileOpen, onNavigate, user }) {
  const location = useLocation()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [openGroup, setOpenGroup] = useState(null)
  const returnPath = location.state?.returnContext?.path || ''
  const navigationPath = returnPath || location.pathname

  const visibleNavigation = user?.demo===true
    ? navigation
    : navigation.map(section=>({
        ...section,
        items:section.items.map(item=>filterAccessibleItem(item,user)).filter(Boolean),
      })).filter(section=>section.items.length)

  useEffect(() => {
    let activeGroup = null
    visibleNavigation.forEach((section) => section.items.forEach((item) => {
      if (item.children?.length && containsPath(item, navigationPath)) activeGroup = item.id
    }))
    // Keep the major section expanded through descendant/detail workspaces.
    // Laboratory records opened from Water/Surfaces carry their source route in
    // returnContext, so Surveillance remains visibly open until another major
    // category is selected.
    setOpenGroup(activeGroup)
  }, [location.pathname, location.state?.returnContext?.path])

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
    const active = containsPath(item, navigationPath)

    if (!hasChildren) return <NavLink key={item.id} to={item.path} end={item.id==='laboratory'||item.id==='dashboard'} onClick={() => closeGroupsAndNavigate(item, depth)} title={collapsed ? label : undefined} className={({isActive}) => `${depth ? 'sidebar-submenu-link' : 'nav-link'} ${(isActive || active) ? 'active' : ''} ${item.emphasis ? 'emphasis' : ''}`}><span className={depth ? '' : 'nav-icon'}><Icon size={depth ? 16 : 19} strokeWidth={2.1}/></span>{!collapsed && <span className={depth ? '' : 'nav-label'}>{label}</span>}</NavLink>

    if (collapsed) return <button key={item.id} type="button" className={`nav-link sidebar-group-button ${active ? 'active' : ''}`} title={label} onClick={() => { const first=item.children?.[0]; if(first?.path){navigate(first.path);onNavigate?.()} }}><span className="nav-icon"><Icon size={19} strokeWidth={2.1}/></span></button>

    return <div className={`sidebar-group depth-${depth} ${active ? 'active' : ''}`} key={item.id}><button type="button" className={`${depth ? 'sidebar-subgroup-button' : 'nav-link sidebar-group-button'} ${active ? 'active' : ''}`} onClick={() => toggleGroup(item.id)} aria-expanded={expanded}><span className={depth ? '' : 'nav-icon'}><Icon size={depth ? 16 : 19} strokeWidth={2.1}/></span><span className={depth ? '' : 'nav-label'}>{label}</span><ChevronDown className={`sidebar-chevron ${expanded ? 'open' : ''}`} size={16}/></button>{expanded && <div className={`sidebar-submenu depth-${depth+1}`}>{item.children.map(child=>renderItem(child,depth+1))}</div>}</div>
  }

  return <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}><nav className="sidebar-nav">{visibleNavigation.map(section=><div className="nav-section" key={section.id}>{section.items.map(item=>renderItem(item))}</div>)}</nav></aside>
}

function filterAccessibleItem(item,user){
  const children=(item.children||[]).map(child=>filterAccessibleItem(child,user)).filter(Boolean)
  if(children.length) return {...item,children}
  if(item.moduleKey && !canViewModule(user,item.moduleKey)) return null
  if(item.children?.length) return null
  return item
}
