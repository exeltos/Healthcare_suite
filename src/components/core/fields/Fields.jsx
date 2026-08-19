import { useEffect, useState } from 'react'
import FormField from '../FormField/FormField'
import './Fields.css'

function normalizeOptions(options = []) {
  return options.map((option) => typeof option === 'object' ? option : ({ value: option, label: option }))
}

export function TextField({ label, error, helpText, required, fullWidth, ...inputProps }) {
  return <FormField label={label} error={error} helpText={helpText} required={required} fullWidth={fullWidth} disabled={inputProps.disabled}><input className="core-control" type="text" required={required} {...inputProps} /></FormField>
}

export function TextAreaField({ label, error, helpText, required, fullWidth, rows = 4, ...props }) {
  return <FormField label={label} error={error} helpText={helpText} required={required} fullWidth={fullWidth} disabled={props.disabled}><textarea className="core-control" rows={rows} required={required} {...props} /></FormField>
}

export function NumberField({ label, error, helpText, required, fullWidth, ...props }) {
  return <FormField label={label} error={error} helpText={helpText} required={required} fullWidth={fullWidth} disabled={props.disabled}><input className="core-control" type="number" required={required} {...props} /></FormField>
}

function dateToGreek(value='') {
  const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value||'')
}
function greekToDate(value='') {
  const match=String(value||'').trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/)
  if(!match)return value ? null : ''
  const d=match[1].padStart(2,'0'),m=match[2].padStart(2,'0'),y=match[3],iso=`${y}-${m}-${d}`
  const probe=new Date(`${iso}T12:00:00`)
  return Number.isNaN(probe.getTime()) || probe.getDate()!==Number(d) || probe.getMonth()+1!==Number(m) ? null : iso
}
function LocalDateControl({value='',onChange,...props}){
  const [text,setText]=useState(()=>dateToGreek(value))
  useEffect(()=>setText(dateToGreek(value)),[value])
  return <input className="core-control" type="text" inputMode="numeric" placeholder="ηη/μμ/εεεε" value={text} {...props} onChange={(event)=>{const next=event.target.value.replace(/[^0-9\/.-]/g,'').slice(0,10);setText(next);const iso=greekToDate(next);if(iso!==null)onChange?.({target:{value:iso}})}} onBlur={()=>{const iso=greekToDate(text);setText(iso===null?dateToGreek(value):dateToGreek(iso))}} />
}
export function DateField({ label, error, helpText, required, fullWidth, ...props }) {
  return <FormField label={label} error={error} helpText={helpText} required={required} fullWidth={fullWidth} disabled={props.disabled}><LocalDateControl required={required} {...props} /></FormField>
}

export function TimeField({ label, error, helpText, required, fullWidth, ...props }) {
  return <FormField label={label} error={error} helpText={helpText} required={required} fullWidth={fullWidth} disabled={props.disabled}><input className="core-control" type="time" required={required} {...props} /></FormField>
}

export function SelectField({ label, error, helpText, required, fullWidth, options = [], placeholder = 'Επιλέξτε', ...props }) {
  return (
    <FormField label={label} error={error} helpText={helpText} required={required} fullWidth={fullWidth} disabled={props.disabled}>
      <select className="core-control" required={required} {...props}>
        {placeholder !== null && <option value="">{placeholder}</option>}
        {normalizeOptions(options).map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
    </FormField>
  )
}

export function CheckboxField({ label, description, error, className = '', ...props }) {
  return (
    <div className={`core-check-field ${error ? 'core-check-field--error' : ''} ${className}`.trim()}>
      <label>
        <input type="checkbox" {...props} />
        <span className="core-check-field__box" aria-hidden="true" />
        <span><strong>{label}</strong>{description && <small>{description}</small>}</span>
      </label>
      {error && <span className="core-field__error" role="alert">{error}</span>}
    </div>
  )
}

export function SwitchField({ label, description, error, ...props }) {
  return (
    <div className={`core-switch-field ${error ? 'core-switch-field--error' : ''}`}>
      <label>
        <input type="checkbox" role="switch" {...props} />
        <span className="core-switch-field__track"><span /></span>
        <span><strong>{label}</strong>{description && <small>{description}</small>}</span>
      </label>
      {error && <span className="core-field__error" role="alert">{error}</span>}
    </div>
  )
}

export function RadioGroup({ label, name, value, options = [], onChange, error, helpText, required = false, inline = true, fullWidth = false, disabled = false }) {
  return (
    <fieldset className={`core-radio-group ${error ? 'core-radio-group--error' : ''} ${fullWidth ? 'core-field--full' : ''}`} disabled={disabled}>
      <legend>{label}{required && <span className="core-field__required">*</span>}</legend>
      <div className={inline ? 'core-radio-group__options core-radio-group__options--inline' : 'core-radio-group__options'}>
        {normalizeOptions(options).map((option) => (
          <label key={option.value}>
            <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={onChange} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {helpText && <span className="core-field__help">{helpText}</span>}
      {error && <span className="core-field__error" role="alert">{error}</span>}
    </fieldset>
  )
}
