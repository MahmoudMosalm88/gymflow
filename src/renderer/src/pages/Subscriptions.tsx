import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '../components/Modal'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'

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
    <div className="p-6 h-full flex flex-col bg-muted/30">
      <h1 className="text-3xl font-bold text-foreground mb-6">{t('subscriptions.title')}</h1>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-destructive hover:text-destructive/80 font-bold"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Members List */}
        <Card className="flex flex-col min-h-0">
          <CardHeader>
            <CardTitle>{t('subscriptions.searchMembers')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 min-h-0">
            <div className="space-y-2">
              <Label>{t('common.search')}</Label>
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('subscriptions.searchMembers')}
              />
            </div>

            {isLoadingMembers ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                {t('common.loading')}
              </div>
            ) : (
              <div className="flex-1 overflow-auto border border-border rounded-lg">
                {filteredMembers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">{t('common.noResults')}</div>
                ) : (
                  <ul className="divide-y divide-border">
                    {filteredMembers.map((m) => {
                      const active = m.id === selectedMemberId
                      return (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedMemberId(m.id)}
                            className={`w-full text-left px-4 py-3 hover:bg-muted ${
                              active ? 'bg-muted' : ''
                            }`}
                          >
                            <div className="font-medium text-foreground">{m.name}</div>
                            <div className="text-sm text-muted-foreground">{m.phone}</div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <Card className="lg:col-span-2 min-h-0 overflow-auto">
          <CardContent>
            {!selectedMember ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                {t('subscriptions.selectMember')}
              </div>
            ) : isLoadingSubs ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                {t('common.loading')}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{selectedMember.name}</h2>
                    <p className="text-muted-foreground">{selectedMember.phone}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setError(null)
                        setPricePaid('')
                        setShowRenewModal(true)
                      }}
                    >
                      {t('subscriptions.renew')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setError(null)
                        setPricePaid(activeSubscription?.price_paid?.toString() || '')
                        setShowPaymentModal(true)
                      }}
                      disabled={!activeSubscription}
                    >
                      {t('subscriptions.recordPayment')}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleCancel}
                      disabled={!activeSubscription}
                    >
                      {t('subscriptions.cancel')}
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {t('subscriptions.current')}
                  </h3>
                  {activeSubscription ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between sm:block">
                        <span className="text-muted-foreground">{t('memberDetail.status')}</span>
                        <div className="font-medium text-foreground">{statusLabel(activeSubscription)}</div>
                      </div>
                      <div className="flex justify-between sm:block">
                        <span className="text-muted-foreground">{t('memberDetail.plan')}</span>
                        <div className="font-medium text-foreground">
                          {activeSubscription.plan_months} {t('memberDetail.months')}
                        </div>
                      </div>
                      <div className="flex justify-between sm:block">
                        <span className="text-muted-foreground">{t('subscriptions.starts')}</span>
                        <div className="font-medium text-foreground">
                          {new Date(activeSubscription.start_date * 1000).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex justify-between sm:block">
                        <span className="text-muted-foreground">{t('memberDetail.expires')}</span>
                        <div className="font-medium text-foreground">
                          {new Date(activeSubscription.end_date * 1000).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex justify-between sm:block">
                        <span className="text-muted-foreground">{t('memberForm.pricePaid')}</span>
                        <div className="font-medium text-foreground">
                          {activeSubscription.price_paid ?? '-'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{t('subscriptions.noSubscriptions')}</p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {t('subscriptions.paymentHistory')}
                  </h3>
                  {subscriptions.length === 0 ? (
                    <p className="text-muted-foreground">{t('subscriptions.noHistory')}</p>
                  ) : (
                    <div className="overflow-auto border border-border rounded-lg">
                      <table className="min-w-full text-sm">
                        <thead className="bg-muted text-muted-foreground">
                          <tr>
                            <th className="text-left px-4 py-2">{t('subscriptions.date')}</th>
                            <th className="text-left px-4 py-2">{t('memberDetail.plan')}</th>
                            <th className="text-left px-4 py-2">{t('memberDetail.expires')}</th>
                            <th className="text-left px-4 py-2">{t('memberForm.pricePaid')}</th>
                            <th className="text-left px-4 py-2">{t('memberDetail.status')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {subscriptions.map((s) => (
                            <tr key={s.id}>
                              <td className="px-4 py-2 text-foreground">
                                {new Date(s.created_at * 1000).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2 text-foreground">
                                {s.plan_months} {t('memberDetail.months')}
                              </td>
                              <td className="px-4 py-2 text-foreground">
                                {new Date(s.end_date * 1000).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2 text-foreground">{s.price_paid ?? '-'}</td>
                              <td className="px-4 py-2">
                                <span className="inline-flex px-2 py-1 rounded-full text-xs bg-muted text-foreground">
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
          </CardContent>
        </Card>
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
              <Label className="mb-2 block">{t('memberForm.planMonths')}</Label>
              <Select
                value={planMonths}
                onChange={(e) => setPlanMonths(Number(e.target.value) as 1 | 3 | 6 | 12)}
              >
                <option value={1}>1 {t('memberForm.month')}</option>
                <option value={3}>3 {t('memberForm.months')}</option>
                <option value={6}>6 {t('memberForm.months')}</option>
                <option value={12}>12 {t('memberForm.months')}</option>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">{t('memberForm.pricePaid')}</Label>
              <Input
                type="number"
                min="0"
                value={pricePaid}
                onChange={(e) => setPricePaid(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">{t('subscriptions.cashOnly')}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button ref={renewPrimaryRef} type="button" onClick={handleRenew} className="flex-1">
                {t('common.save')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowRenewModal(false)}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
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
              <Label className="mb-2 block">{t('memberForm.pricePaid')}</Label>
              <Input
                type="number"
                min="0"
                value={pricePaid}
                onChange={(e) => setPricePaid(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">{t('subscriptions.cashOnly')}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button ref={paymentPrimaryRef} type="button" onClick={handleRecordPayment} className="flex-1">
                {t('common.save')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
