import { APP_EVENTS, emitAppEvent } from '../events'
import { readJsonArray, writeJson } from '../storage'

export const NOTIFICATION_READ_KEY = 'limoxis:notifications:read:v1'
export const NOTIFICATION_READ_EVENT = APP_EVENTS.NOTIFICATION_READ_CHANGED

export function loadReadNotificationIds() {
  return new Set(readJsonArray(NOTIFICATION_READ_KEY))
}

export function saveReadNotificationIds(ids) {
  writeJson(NOTIFICATION_READ_KEY, [...ids])
  emitAppEvent(NOTIFICATION_READ_EVENT)
}

export function dismissNotification(id) {
  if (!id) return
  const ids = loadReadNotificationIds()
  ids.add(id)
  saveReadNotificationIds(ids)
}

export function dismissNotifications(ids = []) {
  const next = loadReadNotificationIds()
  ids.filter(Boolean).forEach((id) => next.add(id))
  saveReadNotificationIds(next)
}
