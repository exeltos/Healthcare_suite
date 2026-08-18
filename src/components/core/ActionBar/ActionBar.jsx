import Button from '../Button/Button'
import IconButton from '../IconButton/IconButton'
import './ActionBar.css'

const DEFAULT_LABELS = {
  create: 'Νέα εγγραφή',
  edit: 'Επεξεργασία',
  duplicate: 'Αντιγραφή',
  delete: 'Διαγραφή',
  export: 'Εξαγωγή',
  print: 'Εκτύπωση',
  more: 'Περισσότερα',
}

function normalizeAction(action, fallbackKey) {
  if (!action) return null
  if (typeof action === 'function') return { key: fallbackKey, onClick: action }
  return { key: fallbackKey, ...action }
}

export default function ActionBar({
  create,
  edit,
  duplicate,
  remove,
  exportAction,
  print,
  more,
  start,
  end,
  children,
  compact = false,
  className = '',
  ariaLabel = 'Ενέργειες σελίδας',
}) {
  const primary = normalizeAction(create, 'create')
  const secondaryActions = [
    normalizeAction(edit, 'edit'),
    normalizeAction(duplicate, 'duplicate'),
    normalizeAction(exportAction, 'export'),
    normalizeAction(print, 'print'),
    normalizeAction(remove, 'delete'),
  ].filter(Boolean)
  const moreAction = normalizeAction(more, 'more')

  const renderAction = (action) => {
    const {
      key,
      label = DEFAULT_LABELS[key],
      icon,
      variant = key === 'delete' ? 'danger' : 'secondary',
      size = compact ? 'sm' : 'md',
      hidden,
      ...buttonProps
    } = action

    if (hidden) return null
    return (
      <Button key={key} variant={variant} size={size} icon={icon} {...buttonProps}>
        {label}
      </Button>
    )
  }

  return (
    <div className={`core-action-bar ${compact ? 'core-action-bar--compact' : ''} ${className}`.trim()} role="toolbar" aria-label={ariaLabel}>
      <div className="core-action-bar__start">
        {start}
        {primary ? renderAction({ variant: 'primary', icon: '+', ...primary }) : null}
      </div>
      <div className="core-action-bar__end">
        {children}
        {secondaryActions.map(renderAction)}
        {moreAction ? (
          <IconButton
            label={moreAction.label || DEFAULT_LABELS.more}
            size={compact ? 'sm' : 'md'}
            {...moreAction}
          >
            {moreAction.icon || '⋮'}
          </IconButton>
        ) : null}
        {end}
      </div>
    </div>
  )
}
