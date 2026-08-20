import { useEffect, useRef } from 'react'
import { APP_EVENTS, subscribeAppEvents } from '../../../core/events'
import { feedbackSaved, feedbackSuccess } from '../../../core/feedback'

const MUTATION_EVENTS = [
  APP_EVENTS.MASTER_DATA_UPDATED,
  APP_EVENTS.PATIENT_REGISTRY_UPDATED,
  APP_EVENTS.PATIENT_CONFIG_UPDATED,
  APP_EVENTS.PATIENT_SAMPLES_UPDATED,
  APP_EVENTS.PATIENT_ATTACHMENTS_UPDATED,
  APP_EVENTS.INFECTIONS_UPDATED,
  APP_EVENTS.INFECTION_SAVED,
  APP_EVENTS.ISOLATIONS_UPDATED,
  APP_EVENTS.ISOLATION_SAVED,
  APP_EVENTS.EMPLOYEES_UPDATED,
  APP_EVENTS.STAFF_SAMPLES_UPDATED,
  APP_EVENTS.HAND_HYGIENE_UPDATED,
  APP_EVENTS.STAFF_VACCINATIONS_UPDATED,
  APP_EVENTS.ENVIRONMENTAL_SAMPLES_UPDATED,
  APP_EVENTS.WATER_RECORDS_UPDATED,
  APP_EVENTS.ANTISEPTIC_CONSUMPTION_UPDATED,
  APP_EVENTS.WASTE_MEASUREMENTS_UPDATED,
  APP_EVENTS.PREVENTION_AUDITS_UPDATED,
  APP_EVENTS.BUNDLES_UPDATED,
  APP_EVENTS.PROMOTED_ANTIBIOTICS_UPDATED,
  APP_EVENTS.NOTIFIABLE_DISEASES_UPDATED,
  APP_EVENTS.SURVEILLANCE_CASES_UPDATED,
  APP_EVENTS.SURVEILLANCE_PROGRAMS_UPDATED,
  APP_EVENTS.SURVEILLANCE_EXECUTIONS_UPDATED,
  APP_EVENTS.FORM_TEMPLATES_UPDATED,
  APP_EVENTS.FORM_RESPONSES_UPDATED,
  APP_EVENTS.QUALITY_UPDATED,
  APP_EVENTS.QUALITY_AUDITS_UPDATED,
  APP_EVENTS.INDICATORS_UPDATED,
  APP_EVENTS.ORGANIZATION_UPDATED,
  APP_EVENTS.NEW_ENTRY_CREATED,
]

/**
 * Global UX feedback without coupling every page to a toast hook.
 * A persistence/domain event only produces a success message when it follows
 * an explicit user save intent. Internal reconciliation/background updates stay silent.
 */
export default function AppFeedbackBridge() {
  const lastIntentAt = useRef(0)
  const lastIntentType = useRef('save')
  const lastToastAt = useRef(0)

  useEffect(() => {
    const markIntent = (type = 'save') => {
      lastIntentAt.current = Date.now()
      lastIntentType.current = type
    }
    const markSaveIntent = () => markIntent('save')
    const onSubmit = () => markSaveIntent()
    const onClick = (event) => {
      const actionTarget = event.target?.closest?.('[data-feedback-action], button, [role="button"]')
      if (!actionTarget) return
      const explicitAction = actionTarget.getAttribute?.('data-feedback-action')
      const label = [
        actionTarget.getAttribute?.('aria-label'),
        actionTarget.getAttribute?.('title'),
        actionTarget.textContent,
      ].filter(Boolean).join(' ').trim().toLocaleLowerCase('el-GR')

      if (explicitAction === 'save' || /(^|\s)(αποθήκευση|αποθηκευση|αποθήκευσε|αποθηκευσε|save)(\s|$|…|&)/i.test(label)) {
        markIntent('save')
      } else if (explicitAction === 'delete' || /(^|\s)(διαγραφή|διαγραφη|delete)(\s|$)/i.test(label)) {
        markIntent('delete')
      }
    }

    document.addEventListener('submit', onSubmit, true)
    document.addEventListener('click', onClick, true)

    const unsubscribe = subscribeAppEvents(MUTATION_EVENTS, () => {
      const now = Date.now()
      if (now - lastIntentAt.current > 3500) return
      // Complex saves may emit several domain events. Show one confirmation only.
      if (now - lastToastAt.current < 900) return
      lastToastAt.current = now
      const intentType = lastIntentType.current
      lastIntentAt.current = 0
      lastIntentType.current = 'save'
      if (intentType === 'delete') {
        feedbackSuccess('Η διαγραφή ολοκληρώθηκε επιτυχώς.', { title: 'Διαγράφηκε' })
      } else {
        feedbackSaved()
      }
    })

    return () => {
      document.removeEventListener('submit', onSubmit, true)
      document.removeEventListener('click', onClick, true)
      unsubscribe()
    }
  }, [])

  return null
}
