import { feedbackInfo } from '../../../core/feedback'

/**
 * Central compatibility boundary for legacy synchronous browser dialogs.
 * New UI should prefer the Core Dialog + Toast components. Keeping browser
 * dialogs behind this adapter removes direct window.* coupling from pages and
 * gives i18n / a future async dialog provider one migration point.
 */
export function confirmAction(message) {
  return window.confirm(message)
}

export function notifyAction(message) {
  feedbackInfo(message)
}

export function promptAction(message, defaultValue = '') {
  return window.prompt(message, defaultValue)
}
