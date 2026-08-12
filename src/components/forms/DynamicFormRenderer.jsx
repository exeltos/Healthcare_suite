import './DynamicFormRenderer.css'

function isVisible(question, answers) {
  if (!question.condition) return true
  const current = answers?.[question.condition.questionId]
  if (question.condition.operator === 'equals') return current === question.condition.value
  if (question.condition.operator === 'not-equals') return current !== question.condition.value
  return true
}

export default function DynamicFormRenderer({ template, answers, onChange, errors = {} }) {
  if (!template) return null
  const update = (questionId, value) => onChange({ ...answers, [questionId]: value })

  return (
    <div className="dynamic-form-renderer">
      {template.questions.filter((question) => isVisible(question, answers)).map((question) => {
        const value = answers?.[question.id] ?? (question.type === 'multi-select' ? [] : '')
        return (
          <div className={`dynamic-question ${errors[question.id] ? 'has-error' : ''}`} key={question.id}>
            <label>{question.label}{question.required ? ' *' : ''}</label>
            {question.type === 'textarea' && <textarea value={value} onChange={(event) => update(question.id, event.target.value)} />}
            {['text', 'number', 'date', 'time'].includes(question.type) && <input type={question.type} value={value} onChange={(event) => update(question.id, event.target.value)} />}
            {question.type === 'select' && (
              <select value={value} onChange={(event) => update(question.id, event.target.value)}>
                <option value="">Επιλέξτε</option>
                {(question.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            )}
            {(question.type === 'yes-no' || question.type === 'yes-no-na') && (
              <div className="dynamic-choice-row">
                {[['yes', 'Ναι'], ['no', 'Όχι'], ...(question.type === 'yes-no-na' ? [['na', 'N/A']] : [])].map(([optionValue, label]) => (
                  <button type="button" className={value === optionValue ? 'selected' : ''} onClick={() => update(question.id, optionValue)} key={optionValue}>{label}</button>
                ))}
              </div>
            )}
            {question.type === 'multi-select' && (
              <div className="dynamic-checkbox-list">
                {(question.options || []).map((option) => {
                  const checked = value.includes(option)
                  return <label key={option}><input type="checkbox" checked={checked} onChange={() => update(question.id, checked ? value.filter((item) => item !== option) : [...value, option])} /> {option}</label>
                })}
              </div>
            )}
            {errors[question.id] && <small>{errors[question.id]}</small>}
          </div>
        )
      })}
    </div>
  )
}
