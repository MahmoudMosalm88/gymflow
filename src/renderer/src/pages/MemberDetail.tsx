import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PencilIcon, TrashIcon, QrCodeIcon } from '@heroicons/react/24/outline'
import QRCodeDisplay from '../components/QRCodeDisplay'
import Modal from '../components/Modal'

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

const toSafeFileUrl = (pathOrUrl: string): string => {
  if (!pathOrUrl) return ''
  if (
    pathOrUrl.startsWith('data:') ||
    pathOrUrl.startsWith('http://') ||
    pathOrUrl.startsWith('https://') ||
    pathOrUrl.startsWith('file://')
  ) {
    return pathOrUrl
  }

  const normalized = pathOrUrl.replace(/\\/g, '/')
  if (normalized.startsWith('//')) {
    return encodeURI(`file:${normalized}`)
  }
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return encodeURI(`file:///${normalized}`)
  }
  if (normalized.startsWith('/')) {
    return encodeURI(`file://${normalized}`)
  }
  return encodeURI(`file:///${normalized}`)
}

export default function MemberDetail(): JSX.Element {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()

  const [member, setMember] = useState<Member | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [quota, setQuota] = useState<Quota | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showRenewModal, setShowRenewModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [planMonths, setPlanMonths] = useState<1 | 3 | 6 | 12>(1)
  const [pricePaid, setPricePaid] = useState<string>('')

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
      setSubscriptions(subscriptions || [])
      const active = (subscriptions || []).find((s: Subscription) => s.is_active) || null
      setSubscription(active)
      if (active) {
        setPlanMonths(active.plan_months as 1 | 3 | 6 | 12)
      }
      setQuota(quotaData)
    } catch (error) {
      console.error('Failed to load member:', error)
      setError(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRenew = async () => {
    if (!member) return
    const amount = pricePaid.trim() ? Number(pricePaid) : undefined
    if (pricePaid.trim() && (!Number.isFinite(amount) || amount! < 0)) {
      setError(t('subscriptions.invalidAmount'))
      return
    }

    setError(null)
    try {
      await window.api.subscriptions.renew(member.id, {
        plan_months: planMonths,
        price_paid: amount
      })
      setShowRenewModal(false)
      setPricePaid('')
      await loadMemberData()
    } catch (e) {
      console.error('Failed to renew subscription:', e)
      setError(t('common.error'))
    }
  }

  const handleRecordPayment = async () => {
    if (!member || !subscription) return
    const amount = pricePaid.trim() ? Number(pricePaid) : NaN
    if (!Number.isFinite(amount) || amount < 0) {
      setError(t('subscriptions.invalidAmount'))
      return
    }

    setError(null)
    try {
      await window.api.subscriptions.updatePricePaid(subscription.id, amount)
      setShowPaymentModal(false)
      setPricePaid('')
      await loadMemberData()
    } catch (e) {
      console.error('Failed to record payment:', e)
      setError(t('common.error'))
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
        <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">{t('common.error')}</p>
      </div>
    )
  }

  const daysRemaining = subscription
    ? Math.ceil((subscription.end_date * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="min-h-full p-4 md:p-8 bg-gray-50 dark:bg-gray-950 max-w-5xl mx-auto">
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 flex justify-between items-center animate-slide-up">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold text-lg leading-none"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-4xl font-heading font-bold text-gray-900 dark:text-white">{member.name}</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowQR(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <QrCodeIcon className="w-5 h-5" />
            {t('memberDetail.qrCode')}
          </button>
          <Link
            to={`/members/${id}/edit`}
            className="btn btn-secondary flex items-center gap-2"
          >
            <PencilIcon className="w-5 h-5" />
            {t('common.edit')}
          </Link>
          <button
            onClick={handleDelete}
            className="btn text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2"
          >
            <TrashIcon className="w-5 h-5" />
            {t('common.delete')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="card">
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-brand-gradient overflow-hidden mb-4 shadow-lg">
              {member.photo_path ? (
                <img
                  src={
                    member.photo_path.startsWith('data:')
                      ? member.photo_path
                      : toSafeFileUrl(member.photo_path)
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
            <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-white">{member.name}</h2>
            <p className="text-gray-600 dark:text-gray-400">{member.phone}</p>
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
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('subscriptions.title')}
          </h3>
          {subscription ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('memberDetail.status')}</span>
                <span
                  className={`font-medium ${
                    daysRemaining > 3 ? 'text-green-600' : daysRemaining > 0 ? 'text-yellow-600' : 'text-red-600'
                  }`}
                >
                  {daysRemaining > 0 ? t('subscriptions.active') : t('subscriptions.expired')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('memberDetail.plan')}</span>
                <span className="font-medium">{subscription.plan_months} {t('memberDetail.months')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('memberDetail.expires')}</span>
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
	              <div className="pt-4 border-t border-gray-200 flex gap-2">
	                <button
	                  type="button"
	                  onClick={() => {
	                    setError(null)
	                    setPricePaid('')
	                    setShowRenewModal(true)
	                  }}
	                  className="flex-1 px-3 py-2 btn btn-primary"
	                >
	                  {t('subscriptions.renew')}
	                </button>
	                <button
	                  type="button"
	                  onClick={() => {
	                    setError(null)
	                    setPricePaid(subscription.price_paid?.toString() || '')
	                    setShowPaymentModal(true)
	                  }}
	                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
	                >
	                  {t('subscriptions.recordPayment')}
	                </button>
	              </div>
	            </div>
	          ) : (
	            <div className="space-y-4">
	              <p className="text-gray-600 dark:text-gray-400">{t('subscriptions.noSubscriptions')}</p>
	              <button
	                type="button"
	                onClick={() => {
	                  setError(null)
	                  setPricePaid('')
	                  setShowRenewModal(true)
	                }}
	                className="w-full px-3 py-2 btn btn-primary"
	              >
	                {t('subscriptions.renew')}
	              </button>
	            </div>
	          )}
	        </div>

        {/* Sessions Card */}
        <div className="card">
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
            <p className="text-gray-600 dark:text-gray-400">{t('memberDetail.noActiveQuota')}</p>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <QRCodeDisplay memberId={member.id} memberName={member.name} onClose={() => setShowQR(false)} />
      )}

      {showRenewModal && (
        <Modal
          title={t('subscriptions.renew')}
          onClose={() => setShowRenewModal(false)}
          size="sm"
          closeLabel={t('common.close')}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-heading font-semibold text-gray-900 dark:text-white mb-2">
                {t('memberForm.planMonths')}
              </label>
              <select
                value={planMonths}
                onChange={(e) => setPlanMonths(Number(e.target.value) as 1 | 3 | 6 | 12)}
                className="w-full input-field"
              >
                <option value={1}>1 {t('memberForm.month')}</option>
                <option value={3}>3 {t('memberForm.months')}</option>
                <option value={6}>6 {t('memberForm.months')}</option>
                <option value={12}>12 {t('memberForm.months')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-heading font-semibold text-gray-900 dark:text-white mb-2">
                {t('memberForm.pricePaid')}
              </label>
              <input
                type="number"
                min="0"
                value={pricePaid}
                onChange={(e) => setPricePaid(e.target.value)}
                className="w-full input-field"
              />
              <p className="text-xs text-gray-500 mt-2">{t('subscriptions.cashOnly')}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleRenew}
                className="flex-1 py-2.5 btn btn-primary"
              >
                {t('common.save')}
              </button>
              <button
                type="button"
                onClick={() => setShowRenewModal(false)}
                className="flex-1 py-2.5 btn btn-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showPaymentModal && subscription && (
        <Modal
          title={t('subscriptions.recordPayment')}
          onClose={() => setShowPaymentModal(false)}
          size="sm"
          closeLabel={t('common.close')}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-heading font-semibold text-gray-900 dark:text-white mb-2">
                {t('memberForm.pricePaid')}
              </label>
              <input
                type="number"
                min="0"
                value={pricePaid}
                onChange={(e) => setPricePaid(e.target.value)}
                className="w-full input-field"
              />
              <p className="text-xs text-gray-500 mt-2">{t('subscriptions.cashOnly')}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleRecordPayment}
                className="flex-1 py-2.5 btn btn-primary"
              >
                {t('common.save')}
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2.5 btn btn-secondary"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
