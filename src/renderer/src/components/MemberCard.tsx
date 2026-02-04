import { useTranslation } from 'react-i18next'

interface MemberCardProps {
  member: {
    id: string
    name: string
    phone: string
    gender: 'male' | 'female'
    photo_path: string | null
    access_tier: 'A' | 'B'
  }
  quota?: {
    sessions_used: number
    sessions_cap: number
  }
  warnings?: Array<{ key: string; params?: Record<string, unknown> }>
  status: 'allowed' | 'warning' | 'denied' | 'ignored'
}

export default function MemberCard({
  member,
  quota,
  warnings,
  status
}: MemberCardProps): JSX.Element {
  const { t } = useTranslation()

  const sessionsRemaining = quota ? quota.sessions_cap - quota.sessions_used : 0

  return (
    <div className="mt-8 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-800 animate-slide-up">
      {/* Photo and Basic Info */}
      <div className="flex items-center gap-4 p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent overflow-hidden flex-shrink-0 shadow-md">
          {member.photo_path ? (
            <img
              src={
                member.photo_path.startsWith('data:')
                  ? member.photo_path
                  : `file://${member.photo_path}`
              }
              alt={member.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white">
              {member.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white truncate">
            {member.name}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm truncate">{member.phone}</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="badge badge-primary text-xs">
              {t(`members.${member.gender}`)}
            </span>
            <span
              className={`badge text-xs ${
                member.access_tier === 'A'
                  ? 'badge-success'
                  : 'badge-warning'
              }`}
            >
              {t(`members.tier${member.access_tier}`)}
            </span>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={`px-6 py-5 text-center text-white font-bold text-lg font-heading transition-all ${
          status === 'allowed'
            ? 'bg-traffic-green'
            : status === 'warning'
            ? 'bg-traffic-yellow text-gray-900'
            : status === 'denied'
            ? 'bg-traffic-red'
            : 'bg-gray-400 dark:bg-gray-600'
        }`}
      >
        {t(`attendance.${status}`)}
      </div>

      {/* Sessions Info */}
      {quota && status !== 'denied' && (
        <div className="p-6 bg-gradient-to-br from-brand-light/10 to-brand-accent/5 dark:from-brand-light/5 dark:to-brand-accent/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {t('memberDetail.sessions')}
            </span>
            <span className="font-heading font-bold text-gray-900 dark:text-white text-lg">
              {sessionsRemaining} / {quota.sessions_cap}
            </span>
          </div>
          <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                sessionsRemaining <= 3 ? 'bg-traffic-yellow' : 'bg-brand-gradient'
              }`}
              style={{ width: `${(sessionsRemaining / quota.sessions_cap) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            {sessionsRemaining === 0 && '⚠️ No sessions remaining'}
            {sessionsRemaining > 0 && sessionsRemaining <= 3 && `⚠️ Only ${sessionsRemaining} session${sessionsRemaining !== 1 ? 's' : ''} left`}
            {sessionsRemaining > 3 && '✓ Sessions available'}
          </p>
        </div>
      )}

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="px-6 py-5 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-heading font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                {t('attendance.warningsTitle')}
              </h4>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-yellow-600 dark:text-yellow-400 mt-0.5">•</span>
                    <span>{t(warning.key, warning.params || {})}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
