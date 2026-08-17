import { UserPlus, Users } from 'lucide-react'
import { Button, SelectField } from '../core'

export default function PersonLinkSelector({
  ariaLabel,
  existingLabel,
  newLabel,
  fieldLabel,
  createLabel,
  mode,
  onModeChange,
  selectedId,
  options,
  onSelect,
  summary,
  children,
  onCreate,
  showCreateAction = true,
}) {
  return <div className="lw-patient-selector">
    <div className="lw-mode-switch" role="group" aria-label={ariaLabel}>
      <button type="button" className={mode === 'existing' ? 'is-active' : ''} onClick={() => onModeChange('existing')}><Users size={16} /> {existingLabel}</button>
      <button type="button" className={mode === 'new' ? 'is-active' : ''} onClick={() => onModeChange('new')}><UserPlus size={16} /> {newLabel}</button>
    </div>
    {mode === 'existing' ? <div className="lw-grid lw-grid--two">
      <SelectField label={fieldLabel} value={selectedId} options={options} onChange={(event) => onSelect(event.target.value)} />
      <div className="lw-patient-summary">{summary.map((item) => <span key={item.label}><strong>{item.label}</strong>{item.value || '—'}</span>)}</div>
    </div> : <div className="lw-new-patient">
      {children}
      {showCreateAction && onCreate ? <div className="lw-inline-actions"><Button variant="secondary" icon={<UserPlus size={16} />} onClick={onCreate}>{createLabel}</Button></div> : null}
    </div>}
  </div>
}
