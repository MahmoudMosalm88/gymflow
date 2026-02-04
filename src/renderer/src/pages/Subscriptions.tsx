import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '../components/Modal'

export default function Subscriptions(): JSX.Element {
  const { t } = useTranslation()
  const [members, setMembers] = useState<
    Array<{
      id: string
      name: string
      phone: string
      gender: 'male' | 'female'
      access_tier: 'A' | 'B'
    }>
  >([])
  const [query, setQuery] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [subscriptions, setSubscriptions] = useState<
    Array<{
      id: number
      start_date: number
      end_date: number
      plan_months: number
      price_paid: number | null
      is_active: number
      created_at: number
    }>
  >([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [isLoadingSubs, setIsLoadingSubs] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showRenewModal, setShowRenewModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [planMonths, setPlanMonths] = useState<1 | 3 | 6 | 12>(1)
  const [pricePaid, setPricePaid] = useState<string>('')
  const renewPrimaryRef = useRef<HTMLButtonElement>(null)
  const paymentPrimaryRef = useRef<HTMLButtonElement>(null)

  const activeSubscription = useMemo(() => {
    return subscriptions.find((s) => s.is_active) || null
  }, [subscriptions])

  const selectedMember = useMemo(() => {
    return selectedMemberId ? members.find((m) => m.id === selectedMemberId) || null : null
  }, [members, selectedMemberId])

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter((m) => {
      return m.name.toLowerCase().includes(q) || m.phone.toLowerCase().includes(q)
    })
  }, [members, query])

  useEffect(() => {
    const loadMembers = async () => {
      setIsLoadingMembers(true)
      setError(null)
      try {
        const data = await window.api.members.getAll()
        setMembers(data || [])
      } catch (e) {
        console.error('Failed to load members:', e)
        setError(t('common.error'))
      } finally {
        setIsLoadingMembers(false)
      }
    }
    loadMembers()
  }, [t])

  useEffect(() => {
    const loadSubs = async () => {
      if (!selectedMemberId) {
        setSubscriptions([])
        return
      }
      setIsLoadingSubs(true)
      setError(null)
      try {
        const data = await window.api.subscriptions.getByMemberId(selectedMemberId)
        setSubscriptions(data || [])
        const active = (data || []).find((s: { is_active: number; plan_months: number }) => s.is_active)
        if (active) {
          setPlanMonths(active.plan_months as 1 | 3 | 6 | 12)
        }
      } catch (e) {
        console.error('Failed to load subscriptions:', e)
        setError(t('common.error'))
      } finally {
        setIsLoadingSubs(false)
      }
    }
    loadSubs()
  }, [selectedMemberId, t])

  const statusLabel = (sub: { end_date: number; is_active: number }) => {
    if (!sub.is_active) return t('subscriptions.expired')
    const expired = sub.end_date * 1000 <= Date.now()
    return expired ? t('subscriptions.expired') : t('subscriptions.active')
  }

  const handleRenew = async () => {
    if (!selectedMember) return
    const amount = pricePaid.trim() ? Number(pricePaid) : undefined
    if (pricePaid.trim() && (!Number.isFinite(amount) || amount! < 0)) {
      setError(t('subscriptions.invalidAmount'))
      return
    }

    setError(null)
    try {
      await window.api.subscriptions.renew(selectedMember.id, {
        plan_months: planMonths,
        price_paid: amount
      })
      setShowRenewModal(false)
      setPricePaid('')
      const data = await window.api.subscriptions.getByMemberId(selectedMember.id)
      setSubscriptions(data || [])
    } catch (e) {
      console.error('Failed to renew subscription:', e)
      setError(t('common.error'))
    }
  }

  const handleCancel = async () => {
    if (!activeSubscription || !selectedMember) return
    if (!confirm(t('common.confirm'))) return

    setError(null)
    try {
      await window.api.subscriptions.cancel(activeSubscription.id)
      const data = await window.api.subscriptions.getByMemberId(selectedMember.id)
      setSubscriptions(data || [])
    } catch (e) {
      console.error('Failed to cancel subscription:', e)
      setError(t('common.error'))
    }
  }

  const handleRecordPayment = async () => {
    if (!activeSubscription || !selectedMember) return
    const amount = pricePaid.trim() ? Number(pricePaid) : NaN
    if (!Number.isFinite(amount) || amount < 0) {
      setError(t('subscriptions.invalidAmount'))
      return
    }

    setError(null)
    try {
      await window.api.subscriptions.updatePricePaid(activeSubscription.id, amount)
      setShowPaymentModal(false)
      setPricePaid('')
      const data = await window.api.subscriptions.getByMemberId(selectedMember.id)
      setSubscriptions(data || [])
    } catch (e) {
      console.error('Failed to record payment:', e)
      setError(t('common.error'))
    }
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('subscriptions.title')}</h1>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 font-bold"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Members List */}
        <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col min-h-0">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('common.search')}
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('subscriptions.searchMembers')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
            />
          </div>

          {isLoadingMembers ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              {t('common.loading')}
            </div>
          ) : (
            <div className="flex-1 overflow-auto border border-gray-100 rounded-lg">
              {filteredMembers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">{t('common.noResults')}</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filteredMembers.map((m) => {
                    const active = m.id === selectedMemberId
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedMemberId(m.id)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                            active ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="font-medium text-gray-900">{m.name}</div>
                          <div className="text-sm text-gray-500">{m.phone}</div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 min-h-0 overflow-auto">
          {!selectedMember ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              {t('subscriptions.selectMember')}
            </div>
          ) : isLoadingSubs ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              {t('common.loading')}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedMember.name}</h2>
                  <p className="text-gray-500">{selectedMember.phone}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null)
                      setPricePaid('')
                      setShowRenewModal(true)
                    }}
                    className="px-4 py-2 bg-gym-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {t('subscriptions.renew')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null)
                      setPricePaid(activeSubscription?.price_paid?.toString() || '')
                      setShowPaymentModal(true)
                    }}
                    disabled={!activeSubscription}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {t('subscriptions.recordPayment')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={!activeSubscription}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                  >
                    {t('subscriptions.cancel')}
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {t('subscriptions.current')}
                </h3>
                {activeSubscription ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between sm:block">
                      <span className="text-gray-500">{t('memberDetail.status')}</span>
                      <div className="font-medium text-gray-900">{statusLabel(activeSubscription)}</div>
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="text-gray-500">{t('memberDetail.plan')}</span>
                      <div className="font-medium text-gray-900">
                        {activeSubscription.plan_months} {t('memberDetail.months')}
                      </div>
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="text-gray-500">{t('subscriptions.starts')}</span>
                      <div className="font-medium text-gray-900">
                        {new Date(activeSubscription.start_date * 1000).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="text-gray-500">{t('memberDetail.expires')}</span>
                      <div className="font-medium text-gray-900">
                        {new Date(activeSubscription.end_date * 1000).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="text-gray-500">{t('memberForm.pricePaid')}</span>
                      <div className="font-medium text-gray-900">
                        {activeSubscription.price_paid ?? '-'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">{t('subscriptions.noSubscriptions')}</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {t('subscriptions.paymentHistory')}
                </h3>
                {subscriptions.length === 0 ? (
                  <p className="text-gray-500">{t('subscriptions.noHistory')}</p>
                ) : (
                  <div className="overflow-auto border border-gray-100 rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="text-left px-4 py-2">{t('subscriptions.date')}</th>
                          <th className="text-left px-4 py-2">{t('memberDetail.plan')}</th>
                          <th className="text-left px-4 py-2">{t('memberDetail.expires')}</th>
                          <th className="text-left px-4 py-2">{t('memberForm.pricePaid')}</th>
                          <th className="text-left px-4 py-2">{t('memberDetail.status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {subscriptions.map((s) => (
                          <tr key={s.id}>
                            <td className="px-4 py-2 text-gray-700">
                              {new Date(s.created_at * 1000).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-gray-700">
                              {s.plan_months} {t('memberDetail.months')}
                            </td>
                            <td className="px-4 py-2 text-gray-700">
                              {new Date(s.end_date * 1000).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-gray-700">{s.price_paid ?? '-'}</td>
                            <td className="px-4 py-2">
                              <span className="inline-flex px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                                {statusLabel(s)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showRenewModal && selectedMember && (
        <Modal
          title={t('subscriptions.renew')}
          onClose={() => setShowRenewModal(false)}
          size="sm"
          closeLabel={t('common.close')}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('memberForm.planMonths')}
              </label>
              <select
                value={planMonths}
                onChange={(e) => setPlanMonths(Number(e.target.value) as 1 | 3 | 6 | 12)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
              >
                <option value={1}>1 {t('memberForm.month')}</option>
                <option value={3}>3 {t('memberForm.months')}</option>
                <option value={6}>6 {t('memberForm.months')}</option>
                <option value={12}>12 {t('memberForm.months')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('memberForm.pricePaid')}
              </label>
              <input
                type="number"
                min="0"
                value={pricePaid}
                onChange={(e) => setPricePaid(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">{t('subscriptions.cashOnly')}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                ref={renewPrimaryRef}
                type="button"
                onClick={handleRenew}
                className="flex-1 py-2.5 bg-gym-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {t('common.save')}
              </button>
              <button
                type="button"
                onClick={() => setShowRenewModal(false)}
                className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showPaymentModal && selectedMember && activeSubscription && (
        <Modal
          title={t('subscriptions.recordPayment')}
          onClose={() => setShowPaymentModal(false)}
          size="sm"
          initialFocusRef={paymentPrimaryRef}
          closeLabel={t('common.close')}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('memberForm.pricePaid')}
              </label>
              <input
                type="number"
                min="0"
                value={pricePaid}
                onChange={(e) => setPricePaid(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">{t('subscriptions.cashOnly')}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                ref={paymentPrimaryRef}
                type="button"
                onClick={handleRecordPayment}
                className="flex-1 py-2.5 bg-gym-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {t('common.save')}
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
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
