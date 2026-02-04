import { getMemberById, getMemberByCardCode, Member } from '../database/repositories/memberRepository'
import {
  getActiveSubscription,
  Subscription
} from '../database/repositories/subscriptionRepository'
import {
  getOrCreateCurrentQuota,
  incrementSessionsUsed,
  Quota
} from '../database/repositories/quotaRepository'
import { createLog, getLastSuccessfulScan } from '../database/repositories/logRepository'
import { getSetting } from '../database/repositories/settingsRepository'

export interface AttendanceResult {
  status: 'allowed' | 'warning' | 'denied' | 'ignored'
  reasonCode?: string
  member?: Member
  subscription?: Subscription
  quota?: Quota
  warnings?: Array<{ key: string; params?: Record<string, unknown> }>
}

interface TimeWindow {
  start: string // HH:MM format
  end: string
}

export function checkAttendance(
  scannedValue: string,
  method: 'scan' | 'manual' = 'scan'
): AttendanceResult {
  const now = Math.floor(Date.now() / 1000)

  // 1. Check cooldown - don't log or consume session if within cooldown
  const cooldownSeconds = getSetting<number>('scan_cooldown_seconds', 30)
  const lastScan = getLastSuccessfulScan(scannedValue, cooldownSeconds)

  if (lastScan) {
    return {
      status: 'ignored',
      reasonCode: 'cooldown'
    }
  }

  // 2. Find member by card code (scan) or member id (manual)
  const member =
    method === 'manual' ? getMemberById(scannedValue) : getMemberByCardCode(scannedValue)

  let resolvedMember = member
  if (!resolvedMember && method !== 'manual') {
    resolvedMember = getMemberById(scannedValue) || null
  }

  if (!resolvedMember) {
    // Log unknown QR
    createLog({
      member_id: null,
      scanned_value: scannedValue,
      method,
      status: 'denied',
      reason_code: 'unknown_qr'
    })

    return {
      status: 'denied',
      reasonCode: 'unknown_qr'
    }
  }

  const memberFinal = resolvedMember

  // 3. Get active subscription
  const subscription = getActiveSubscription(memberFinal.id)

  if (!subscription) {
    createLog({
      member_id: memberFinal.id,
      scanned_value: scannedValue,
      method,
      status: 'denied',
      reason_code: 'expired'
    })

    return {
      status: 'denied',
      reasonCode: 'expired',
      member: memberFinal
    }
  }

  // Check if subscription is expired
  if (subscription.end_date <= now) {
    createLog({
      member_id: memberFinal.id,
      scanned_value: scannedValue,
      method,
      status: 'denied',
      reason_code: 'expired'
    })

    return {
      status: 'denied',
      reasonCode: 'expired',
      member: memberFinal,
      subscription
    }
  }

  // Check if subscription has not started yet
  if (subscription.start_date > now) {
    createLog({
      member_id: memberFinal.id,
      scanned_value: scannedValue,
      method,
      status: 'denied',
      reason_code: 'not_started'
    })

    return {
      status: 'denied',
      reasonCode: 'not_started',
      member: memberFinal,
      subscription
    }
  }

  // 4. Check access hours (if enabled)
  const accessHoursEnabled = getSetting<boolean>('access_hours_enabled', false)

  if (accessHoursEnabled) {
    const accessHoursKey =
      memberFinal.gender === 'male' ? 'access_hours_male' : 'access_hours_female'
    const accessHours = getSetting<TimeWindow[]>(accessHoursKey, [])

    if (!isWithinAccessHours(accessHours)) {
      createLog({
        member_id: memberFinal.id,
        scanned_value: scannedValue,
        method,
        status: 'denied',
        reason_code: 'outside_hours'
      })

      return {
        status: 'denied',
        reasonCode: 'outside_hours',
        member: memberFinal,
        subscription
      }
    }
  }

  // 5. Get or create current quota
  const quota = getOrCreateCurrentQuota(memberFinal.id)

  if (!quota) {
    createLog({
      member_id: memberFinal.id,
      scanned_value: scannedValue,
      method,
      status: 'denied',
      reason_code: 'no_quota'
    })

    return {
      status: 'denied',
      reasonCode: 'no_quota',
      member: memberFinal,
      subscription
    }
  }

  // 6. Check sessions
  if (quota.sessions_used >= quota.sessions_cap) {
    createLog({
      member_id: memberFinal.id,
      scanned_value: scannedValue,
      method,
      status: 'denied',
      reason_code: 'no_sessions'
    })

    return {
      status: 'denied',
      reasonCode: 'no_sessions',
      member: memberFinal,
      subscription,
      quota
    }
  }

  // 7. Calculate warnings
  const warnings: Array<{ key: string; params?: Record<string, unknown> }> = []
  const warningDays = getSetting<number>('warning_days_before_expiry', 3)
  const warningSessions = getSetting<number>('warning_sessions_remaining', 3)

  const daysRemaining = Math.ceil((subscription.end_date - now) / 86400)
  const sessionsRemaining = quota.sessions_cap - quota.sessions_used

  if (daysRemaining <= warningDays) {
    warnings.push({ key: 'attendance.expiresIn', params: { count: daysRemaining } })
  }

  // Check sessions AFTER this check-in (so we use sessionsRemaining - 1)
  if (sessionsRemaining - 1 < warningSessions) {
    warnings.push({ key: 'attendance.sessionsAfterVisit', params: { count: sessionsRemaining - 1 } })
  }

  // 8. Consume session
  incrementSessionsUsed(quota.id)

  // Update quota object to reflect the increment
  const updatedQuota: Quota = {
    ...quota,
    sessions_used: quota.sessions_used + 1
  }

  // 9. Log entry
  const status = warnings.length > 0 ? 'warning' : 'allowed'

  createLog({
    member_id: memberFinal.id,
    scanned_value: scannedValue,
    method,
    status,
    reason_code: 'ok'
  })

  // 10. Return result
  return {
    status,
    reasonCode: 'ok',
    member: memberFinal,
    subscription,
    quota: updatedQuota,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

function isWithinAccessHours(windows: TimeWindow[]): boolean {
  if (!windows || windows.length === 0) {
    return true // No restrictions
  }

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  for (const window of windows) {
    const [startHour, startMin] = window.start.split(':').map(Number)
    const [endHour, endMin] = window.end.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    // Handle midnight crossing (e.g., 22:00-02:00)
    if (endMinutes < startMinutes) {
      // Window crosses midnight
      if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
        return true
      }
    } else {
      // Normal window (same day)
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        return true
      }
    }
  }

  return false
}

export function manualCheckIn(memberId: string): AttendanceResult {
  return checkAttendance(memberId, 'manual')
}
