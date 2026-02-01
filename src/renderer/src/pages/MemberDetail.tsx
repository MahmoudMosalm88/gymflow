import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PencilIcon, TrashIcon, QrCodeIcon } from '@heroicons/react/24/outline'
import QRCodeDisplay from '../components/QRCodeDisplay'

interface Member {
  id: string
  name: string
  phone: string
  gender: 'male' | 'female'
  photo_path: string | null
  access_tier: 'A' | 'B'
  created_at: number
}

interface Subscription {
  id: number
  start_date: number
  end_date: number
  plan_months: number
  price_paid: number | null
  is_active: number
}

interface Quota {
  sessions_used: number
  sessions_cap: number
  cycle_start: number
  cycle_end: number
}

export default function MemberDetail(): JSX.Element {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()

  const [member, setMember] = useState<Member | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [quota, setQuota] = useState<Quota | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMemberData()
  }, [id])

  const loadMemberData = async () => {
    try {
      const [memberData, subscriptions, quotaData] = await Promise.all([
        window.api.members.getById(id!),
        window.api.subscriptions.getByMemberId(id!),
        window.api.quotas.getCurrentByMember(id!)
      ])

      setMember(memberData)
      setSubscription(subscriptions.find((s: Subscription) => s.is_active) || null)
      setQuota(quotaData)
    } catch (error) {
      console.error('Failed to load member:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('common.confirm'))) return

    try {
      await window.api.members.delete(id!)
      navigate('/members')
    } catch (error) {
      console.error('Failed to delete member:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-gray-500">{t('common.error')}</p>
      </div>
    )
  }

  const daysRemaining = subscription
    ? Math.ceil((subscription.end_date * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{member.name}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <QrCodeIcon className="w-5 h-5" />
            {t('memberDetail.qrCode')}
          </button>
          <Link
            to={`/members/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <PencilIcon className="w-5 h-5" />
            {t('common.edit')}
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            <TrashIcon className="w-5 h-5" />
            {t('common.delete')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden mb-4">
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
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400">
                  {member.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{member.name}</h2>
            <p className="text-gray-500">{member.phone}</p>
            <div className="flex gap-2 mt-3">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {t(`members.${member.gender}`)}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
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

        {/* Subscription Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('subscriptions.title')}
          </h3>
          {subscription ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('memberDetail.status')}</span>
                <span
                  className={`font-medium ${
                    daysRemaining > 3 ? 'text-green-600' : daysRemaining > 0 ? 'text-yellow-600' : 'text-red-600'
                  }`}
                >
                  {daysRemaining > 0 ? t('subscriptions.active') : t('subscriptions.expired')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('memberDetail.plan')}</span>
                <span className="font-medium">{subscription.plan_months} {t('memberDetail.months')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('memberDetail.expires')}</span>
                <span className="font-medium">
                  {new Date(subscription.end_date * 1000).toLocaleDateString()}
                </span>
              </div>
              {daysRemaining > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <div
                    className={`text-center font-semibold ${
                      daysRemaining <= 3 ? 'text-yellow-600' : 'text-gray-700'
                    }`}
                  >
                    {t('attendance.daysRemaining', { count: daysRemaining })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">{t('subscriptions.noSubscriptions')}</p>
          )}
        </div>

        {/* Sessions Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('memberDetail.sessions')}</h3>
          {quota ? (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-bold text-gym-primary">
                  {quota.sessions_cap - quota.sessions_used}
                </span>
                <span className="text-gray-500 text-lg"> / {quota.sessions_cap}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gym-primary h-3 rounded-full transition-all"
                  style={{
                    width: `${((quota.sessions_cap - quota.sessions_used) / quota.sessions_cap) * 100}%`
                  }}
                />
              </div>
              <p className="text-center text-sm text-gray-500">
                {t('attendance.sessionsRemaining', {
                  count: quota.sessions_cap - quota.sessions_used
                })}
              </p>
            </div>
          ) : (
            <p className="text-gray-500">{t('memberDetail.noActiveQuota')}</p>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <QRCodeDisplay memberId={member.id} memberName={member.name} onClose={() => setShowQR(false)} />
      )}
    </div>
  )
}
