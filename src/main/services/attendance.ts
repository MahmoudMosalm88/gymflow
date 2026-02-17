import { getMemberById, getMemberByCardCode, Member } from '../database/repositories/memberRepository'
import {
  getActiveSubscription,
  Subscription
} from '../database/repositories/subscriptionRepository'
import { getGuestPassByCode, markGuestPassUsed, GuestPass } from '../database/repositories/guestPassRepository'
import { getActiveFreeze, SubscriptionFreeze } from '../database/repositories/subscriptionFreezeRepository'
import {
  getOrCreateCurrentQuota,
  incrementSessionsUsed,
  Quota
} from '../database/repositories/quotaRepository'
import {
  createLog,
  getLastSuccessfulScan,
  hasSuccessfulCheckInToday
} from '../database/repositories/logRepository'
import { getSetting } from '../database/repositories/settingsRepository'

export interface AttendanceResult {
  status: 'allowed' | 'warning' | 'denied' | 'ignored'
  reasonCode?: string
  member?: Member
  subscription?: Subscription
  quota?: Quota
  guestPass?: GuestPass
  freeze?: SubscriptionFreeze
  warnings?: Array<{ key: string; params?: Record<string, unknown> }>
}

export function checkAttendance(
  scannedValue: string,
  method: 'scan' | 'manual' = 'scan'
): AttendanceResult {
  const now = Math.floor(Date.now() / 1000)
  const normalized = scannedValue.trim()
  const scanKey = normalized || scannedValue

  // 0. Guest pass check (single-session trial)
  if (normalized) {
    const guestPass = getGuestPassByCode(normalized)
    if (guestPass) {
      if (guestPass.used_at) {
        createLog({
          member_id: null,
          scanned_value: normalized,
          method,
          status: 'denied',
          reason_code: 'guest_used'
        })
        return {
          status: 'denied',
          reasonCode: 'guest_used',
          guestPass
        }
      }
      if (guestPass.expires_at <= now) {
        createLog({
          member_id: null,
          scanned_value: normalized,
          method,
          status: 'denied',
          reason_code: 'guest_expired'
        })
        return {
          status: 'denied',
          reasonCode: 'guest_expired',
          guestPass
        }
      }

      const updated = markGuestPassUsed(normalized) || guestPass
      createLog({
        member_id: null,
        scanned_value: normalized,
        method,
        status: 'allowed',
        reason_code: 'guest_pass'
      })
      return {
        status: 'allowed',
        reasonCode: 'guest_pass',
        guestPass: updated
      }
    }
  }

  // 1. Check cooldown - don't log or consume session if within cooldown
  const cooldownSeconds = getSetting<number>('scan_cooldown_seconds', 30)
  const lastScan = getLastSuccessfulScan(scanKey, cooldownSeconds)

  if (lastScan) {
    return {
      status: 'ignored',
      reasonCode: 'cooldown'
    }
  }

  // 2. Find member by card code (scan) or member id (manual)
  const member =
    method === 'manual' ? getMemberById(scanKey) : getMemberByCardCode(scanKey)

  let resolvedMember = member
  if (!resolvedMember && method !== 'manual') {
    resolvedMember = getMemberById(scanKey) || null
  }

  if (!resolvedMember) {
    // Log unknown QR
    createLog({
      member_id: null,
      scanned_value: scanKey,
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

  // 3. Ignore repeated successful check-ins within the same local day
  if (hasSuccessfulCheckInToday(memberFinal.id)) {
    return {
      status: 'ignored',
      reasonCode: 'already_today',
      member: memberFinal
    }
  }

  // 4. Get active subscription
  const subscription = getActiveSubscription(memberFinal.id)

  if (!subscription) {
      createLog({
        member_id: memberFinal.id,
        scanned_value: scanKey,
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
      scanned_value: scanKey,
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
      scanned_value: scanKey,
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

  // 5. Check freeze status
  const activeFreeze = getActiveFreeze(subscription.id, now)
  if (activeFreeze) {
    createLog({
      member_id: memberFinal.id,
      scanned_value: scanKey,
      method,
      status: 'denied',
      reason_code: 'frozen'
    })

    return {
      status: 'denied',
      reasonCode: 'frozen',
      member: memberFinal,
      subscription,
      freeze: activeFreeze
    }
  }

  // 6. Get or create current quota
  const quota = getOrCreateCurrentQuota(memberFinal.id)

  if (!quota) {
    createLog({
      member_id: memberFinal.id,
      scanned_value: scanKey,
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

  // 7. Check sessions
  if (quota.sessions_used >= quota.sessions_cap) {
    createLog({
      member_id: memberFinal.id,
      scanned_value: scanKey,
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

  // 8. Calculate warnings
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

  // 9. Consume session
  incrementSessionsUsed(quota.id)

  // Update quota object to reflect the increment
  const updatedQuota: Quota = {
    ...quota,
    sessions_used: quota.sessions_used + 1
  }

  // 10. Log entry
  const status = warnings.length > 0 ? 'warning' : 'allowed'

  createLog({
    member_id: memberFinal.id,
    scanned_value: scanKey,
    method,
    status,
    reason_code: 'ok'
  })

  // 11. Return result
  return {
    status,
    reasonCode: 'ok',
    member: memberFinal,
    subscription,
    quota: updatedQuota,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

export function manualCheckIn(memberId: string): AttendanceResult {
  return checkAttendance(memberId, 'manual')
}
