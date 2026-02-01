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
  warnings?: string[]
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
    <div className="mt-8 w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Photo and Basic Info */}
      <div className="flex items-center p-6 border-b border-gray-100">
        <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
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
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
              {member.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-xl font-bold text-gray-900">{member.name}</h3>
          <p className="text-gray-500">{member.phone}</p>
          <div className="flex gap-2 mt-2">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
              {t(`members.${member.gender}`)}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                member.access_tier === 'A'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {t(`members.tier${member.access_tier}`)}
            </span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div
        className={`px-6 py-4 text-center text-white font-bold text-lg ${
          status === 'allowed'
            ? 'bg-traffic-green'
            : status === 'warning'
            ? 'bg-traffic-yellow text-gray-900'
            : status === 'denied'
            ? 'bg-traffic-red'
            : 'bg-gray-400'
        }`}
      >
        {t(`attendance.${status}`)}
      </div>

      {/* Sessions Info */}
      {quota && status !== 'denied' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Sessions</span>
            <span className="font-bold text-gray-900">
              {sessionsRemaining} / {quota.sessions_cap}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                sessionsRemaining <= 3 ? 'bg-traffic-yellow' : 'bg-gym-primary'
              }`}
              style={{ width: `${(sessionsRemaining / quota.sessions_cap) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <h4 className="font-medium text-yellow-800 mb-1">Warnings</h4>
            <ul className="text-sm text-yellow-700 list-disc list-inside">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
