import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { dismissNotification } from '../notifications/notificationState'

/**
 * Notification navigation intentionally targets ONLY the owning list.
 * It never uses the generic `record` deep-link parameter, because that
 * parameter may be interpreted by pages as a request to open a drawer.
 */
export function buildNotificationReviewLink(path, recordId, notificationId = '') {
  const params = new URLSearchParams()
  if (recordId) params.set('highlight', recordId)
  if (notificationId) params.set('reviewNotification', notificationId)
  if (![...params.keys()].length) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}${params.toString()}`
}

/** Backwards-compatible generic record deep link for non-notification use. */
export function buildRecordLink(path, recordId) {
  if (!recordId) return path
  const params = new URLSearchParams({ record: String(recordId) })
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}${params.toString()}`
}

/**
 * Review flow:
 * 1. Notification click -> list only + highlighted row.
 * 2. User explicitly clicks that row -> markOpened().
 * 3. User closes its drawer -> completeReview() dismisses notification.
 */
export function useRecordDeepLink(rows, options = {}) {
  const { param = 'highlight', notificationParam = 'reviewNotification' } = options
  const [searchParams, setSearchParams] = useSearchParams()
  const recordId = searchParams.get(param) || ''
  const notificationId = searchParams.get(notificationParam) || ''
  const [openedLinkedRecord, setOpenedLinkedRecord] = useState(false)

  const highlightedId = useMemo(() => {
    if (!recordId || !Array.isArray(rows)) return ''
    return rows.some((row) => String(row?.id) === String(recordId)) ? String(recordId) : ''
  }, [rows, recordId])

  useEffect(() => {
    setOpenedLinkedRecord(false)
  }, [recordId, notificationId])

  function markOpened(id) {
    if (recordId && String(id) === String(recordId)) setOpenedLinkedRecord(true)
  }

  function completeReview() {
    if (!openedLinkedRecord || !recordId) return false
    if (notificationId) dismissNotification(notificationId)

    const next = new URLSearchParams(searchParams)
    next.delete(param)
    next.delete(notificationParam)
    setSearchParams(next, { replace: true })
    setOpenedLinkedRecord(false)
    return true
  }

  return {
    highlightedId,
    linkedRecordId: recordId,
    notificationId,
    markOpened,
    completeReview,
  }
}
