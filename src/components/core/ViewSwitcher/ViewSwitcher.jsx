import './ViewSwitcher.css'

export default function ViewSwitcher({ value = 'table', onChange, options = [{ value: 'table', label: 'Πίνακας' }, { value: 'cards', label: 'Κάρτες' }] }) {
  return (
    <div className="core-view-switcher" role="group" aria-label="Τρόπος προβολής">
      {options.map((option) => (
        <button key={option.value} type="button" className={value === option.value ? 'is-active' : ''} onClick={() => onChange?.(option.value)} aria-pressed={value === option.value}>
          {option.icon ? <span aria-hidden="true">{option.icon}</span> : null}{option.label}
        </button>
      ))}
    </div>
  )
}
