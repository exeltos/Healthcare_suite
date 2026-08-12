import { numberRange, required } from './validation'

export function buildQuestionValidationSchema(questions = [], requiredMessage = 'Το πεδίο είναι υποχρεωτικό.') {
  return questions.reduce((schema, question) => {
    if (question?.required && question.id) schema[question.id] = required(requiredMessage)
    return schema
  }, {})
}

export function buildFieldValidationSchema(fields = []) {
  return fields.reduce((schema, field) => {
    if (!field?.id) return schema
    const validators = []
    if (field.required) validators.push(required(field.requiredMessage || 'Υποχρεωτικό πεδίο'))
    if (field.type === 'number' && (field.min !== undefined || field.max !== undefined)) {
      validators.push(numberRange({ min: field.min ?? -Infinity, max: field.max ?? Infinity, message: field.rangeMessage }))
    }
    if (validators.length) schema[field.id] = validators
    return schema
  }, {})
}
