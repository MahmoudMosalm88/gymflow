import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PencilIcon, TrashIcon, QrCodeIcon } from '@heroicons/react/24/outline'
import QRCodeDisplay from '../components/QRCodeDisplay'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { Button, buttonVariants } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'

interface Member {
  id: string
  name: string
  phone: string
  gender: 'male' | 'female'
  photo_path: string | null
  access_tier: 'A' | 'B'
  card_code: string | null
  address: string | null
  created_at: number
}

interface Subscription {
  id: number
  start_date: number
  end_date: number
  plan_months: number
  price_paid: number | null
  sessions_per_month: number | null
  is_active: number
}

interface Quota {
  sessions_used: number
  sessions_cap: number
  cycle_start: number
  cycle_end: number
}

interface SubscriptionFreeze {
  id: number
  subscription_id: number
  start_date: number
  end_date: number
  days: number
  created_at: number
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
  const [freezes, setFreezes] = useState<SubscriptionFreeze[]>([])
  const [quota, setQuota] = useState<Quota | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRenewModal, setShowRenewModal] = useState(false)
  const [showFreezeModal, setShowFreezeModal] = useState(false)
  const [showReplaceCardModal, setShowReplaceCardModal] = useState(false)
  const [planMonths, setPlanMonths] = useState<1 | 3 | 6 | 12>(1)
  const [pricePaid, setPricePaid] = useState<string>('')
  const [sessionsPerMonth, setSessionsPerMonth] = useState<string>('')
  const [freezeDays, setFreezeDays] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1)
  const [replaceCardCode, setReplaceCardCode] = useState('')

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
        setSessionsPerMonth(
          active.sessions_per_month !== null && active.sessions_per_month !== undefined
            ? String(active.sessions_per_month)
            : ''
        )
        try {
          const freezeData = await window.api.subscriptions.getFreezes(active.id)
          setFreezes(freezeData || [])
        } catch {
          setFreezes([])
        }
      } else {
        setFreezes([])
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
    const parsedSessions = sessionsPerMonth.trim() ? Number(sessionsPerMonth) : NaN
    if (!Number.isFinite(parsedSessions) || parsedSessions <= 0) {
      setError(t('memberForm.sessionsRequired', 'Enter sessions per month'))
      return
    }

    setError(null)
    try {
      await window.api.subscriptions.renew(member.id, {
        plan_months: planMonths,
        price_paid: amount,
        sessions_per_month: parsedSessions
      })
      setShowRenewModal(false)
      setPricePaid('')
      await loadMemberData()
    } catch (e) {
      console.error('Failed to renew subscription:', e)
      setError(t('common.error'))
    }
  }

  const handleFreeze = async () => {
    if (!subscription) return
    setError(null)
    try {
      await window.api.subscriptions.freeze(subscription.id, freezeDays)
      setShowFreezeModal(false)
      await loadMemberData()
    } catch (e) {
      console.error('Failed to freeze subscription:', e)
      setError(t('common.error'))
    }
  }

  const handleReplaceCard = async () => {
    if (!member) return
    const code = replaceCardCode.trim()
    if (!code) {
      setError(t('memberDetail.cardRequired', 'Card code is required'))
      return
    }
    const cardCodePattern = /^\d{5}$/
    if (!cardCodePattern.test(code)) {
      setError(t('memberDetail.cardFormat', 'Card code must match 00000'))
      return
    }

    setError(null)
    try {
      await window.api.members.update(member.id, { card_code: code })
      setShowReplaceCardModal(false)
      setReplaceCardCode('')
      await loadMemberData()
    } catch (e) {
      console.error('Failed to replace card code:', e)
      setError(t('common.error'))
    }
  }

  const handleDelete = async () => {
    try {
      await window.api.members.delete(id!)
      navigate('/members')
    } catch (error) {
      console.error('Failed to delete member:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center gap-3" role="status" aria-label={t('common.loading')}>
        <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.error')}</p>
      </div>
    )
  }

  const daysRemaining = subscription
    ? Math.ceil((subscription.end_date * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
    : 0
  const activeFreeze = freezes.find((freeze) => {
    const now = Date.now() / 1000
    return freeze.start_date <= now && freeze.end_date > now
  })

  return (
    <div className="min-h-full p-4 md:p-8 bg-muted/30 max-w-5xl mx-auto">
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive flex justify-between items-center animate-slide-up">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-destructive hover:text-destructive/80 font-bold text-lg leading-none"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-4xl font-heading font-bold text-foreground">{member.name}</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowQR(true)} variant="outline" className="gap-2">
            <QrCodeIcon className="w-5 h-5" />
            {t('memberDetail.qrCode')}
          </Button>
          <Button
            onClick={() => {
              setError(null)
              setReplaceCardCode(member.card_code || '')
              setShowReplaceCardModal(true)
            }}
            variant="secondary"
            className="gap-2"
          >
            {t('memberDetail.replaceCard', 'Replace Card')}
          </Button>
          <Link
            to={`/members/${id}/edit`}
            className={buttonVariants({ variant: 'secondary', className: 'gap-2' })}
          >
            <PencilIcon className="w-5 h-5" />
            {t('common.edit')}
          </Link>
          <Button onClick={() => setShowDeleteConfirm(true)} variant="destructive" className="gap-2">
            <TrashIcon className="w-5 h-5" />
            {t('common.delete')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card>
          <CardContent className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/60 overflow-hidden mb-4 shadow-lg">
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
            <h2 className="text-xl font-heading font-semibold text-foreground">{member.name}</h2>
            <p className="text-muted-foreground">{member.phone}</p>
            {member.card_code && (
              <p className="text-sm text-muted-foreground mt-1">
                {t('memberDetail.serial', 'Serial')}: <span className="font-mono text-foreground">{member.card_code}</span>
              </p>
            )}
            {member.address && (
              <p className="text-sm text-muted-foreground mt-1">
                {t('memberDetail.address', 'Address')}: {member.address}
              </p>
            )}
            <div className="flex gap-2 mt-3">
              <Badge variant="secondary">{t(`members.${member.gender}`)}</Badge>
              <Badge variant={member.access_tier === 'A' ? 'success' : 'warning'}>
                {t(`members.tier${member.access_tier}`)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('subscriptions.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscription ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('memberDetail.status')}</span>
                  <span
                    className={`font-medium ${
                      daysRemaining > 3
                        ? 'text-emerald-400'
                        : daysRemaining > 0
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }`}
                  >
                    {daysRemaining > 0 ? t('subscriptions.active') : t('subscriptions.expired')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('memberDetail.plan')}</span>
                  <span className="font-medium">
                    {subscription.plan_months} {t('memberDetail.months')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('memberDetail.sessionsPerMonth', 'Sessions / month')}
                  </span>
                  <span className="font-medium">
                    {subscription.sessions_per_month ?? quota?.sessions_cap ?? '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('memberDetail.expires')}</span>
                  <span className="font-medium">
                    {new Date(subscription.end_date * 1000).toLocaleDateString()}
                  </span>
                </div>
                {activeFreeze && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
                    {t('memberDetail.frozenUntil', 'Frozen until')} {new Date(activeFreeze.end_date * 1000).toLocaleDateString()}
                  </div>
                )}
                {daysRemaining > 0 && (
                  <div className="pt-2 border-t border-border">
                    <div
                      className={`text-center font-semibold ${
                        daysRemaining <= 3 ? 'text-amber-400' : 'text-foreground'
                      }`}
                    >
                      {t('attendance.daysRemaining', { count: daysRemaining })}
                    </div>
                  </div>
                )}
                <div className="pt-4 border-t border-border grid grid-cols-2 gap-3">
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
                      setFreezeDays(1)
                      setShowFreezeModal(true)
                    }}
                    className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                    disabled={!!activeFreeze}
                  >
                    {activeFreeze
                      ? t('memberDetail.frozen', 'Frozen')
                      : t('memberDetail.freeze', 'Freeze')}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-muted-foreground">{t('subscriptions.noSubscriptions')}</p>
                <Button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setPricePaid('')
                    setShowRenewModal(true)
                  }}
                  className="w-full"
                >
                  {t('subscriptions.renew')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sessions Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('memberDetail.sessions')}</CardTitle>
          </CardHeader>
          <CardContent>
            {quota ? (
              <div className="space-y-4">
                <div className="text-center">
                  <span className="text-4xl font-bold text-primary">
                    {quota.sessions_cap - quota.sessions_used}
                  </span>
                  <span className="text-muted-foreground text-lg"> / {quota.sessions_cap}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all"
                    style={{
                      width: `${((quota.sessions_cap - quota.sessions_used) / quota.sessions_cap) * 100}%`
                    }}
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {t('attendance.sessionsRemaining', {
                    count: quota.sessions_cap - quota.sessions_used
                  })}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">{t('memberDetail.noActiveQuota')}</p>
            )}
          </CardContent>
        </Card>
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
              <Label className="mb-2 block">{t('memberForm.sessionsPerMonth', 'Sessions per month')}</Label>
              <Input
                type="number"
                min="1"
                value={sessionsPerMonth}
                onChange={(e) => setSessionsPerMonth(e.target.value)}
              />
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
              <Button type="button" onClick={handleRenew} className="flex-1">
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

      {showFreezeModal && subscription && (
        <Modal
          title={t('memberDetail.freezeTitle', 'Freeze Subscription')}
          onClose={() => setShowFreezeModal(false)}
          size="sm"
          closeLabel={t('common.close')}
        >
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">{t('memberDetail.freezeDays', 'Freeze days')}</Label>
              <Select
                value={freezeDays}
                onChange={(e) => setFreezeDays(Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 | 7)}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
                <option value={6}>6</option>
                <option value={7}>7</option>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                {t('memberDetail.freezeHint', 'Membership end date will extend by the frozen days.')}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" onClick={handleFreeze} className="flex-1">
                {t('memberDetail.freeze', 'Freeze')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowFreezeModal(false)}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title={t('common.delete')}
          message={t('common.confirmDelete', 'Are you sure you want to delete this member? This cannot be undone.')}
          confirmLabel={t('common.delete')}
          variant="danger"
          onConfirm={() => {
            setShowDeleteConfirm(false)
            handleDelete()
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showReplaceCardModal && (
        <Modal
          title={t('memberDetail.replaceCard', 'Replace Card')}
          onClose={() => setShowReplaceCardModal(false)}
          size="sm"
          closeLabel={t('common.close')}
        >
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">{t('memberDetail.cardCodeLabel', 'Card Code')}</Label>
              <Input
                value={replaceCardCode}
                onChange={(e) => setReplaceCardCode(e.target.value)}
                placeholder={t('memberDetail.cardCodePlaceholder', 'Scan printed card code')}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {t(
                  'memberDetail.cardCodeHint',
                  'Scan or type the printed card code (e.g. 00001).'
                )}
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" onClick={handleReplaceCard} className="flex-1">
                {t('common.save')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowReplaceCardModal(false)}
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
