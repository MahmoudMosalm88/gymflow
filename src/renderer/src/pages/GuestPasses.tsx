import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
import { Badge } from '../components/ui/badge'

interface GuestPass {
  id: string
  code: string
  name: string
  phone: string | null
  price_paid: number | null
  created_at: number
  expires_at: number
  used_at: number | null
}

export default function GuestPasses(): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [passes, setPasses] = useState<GuestPass[]>([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pricePaid, setPricePaid] = useState('')
  const [validityDays, setValidityDays] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPasses()
  }, [])

  const loadPasses = async () => {
    try {
      const data = await window.api.guestpasses.list(30)
      setPasses(data || [])
    } catch (err) {
      console.error('Failed to load guest passes:', err)
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setError(t('guestPasses.nameRequired', 'Guest name is required'))
      return
    }

    const priceValue = pricePaid.trim() ? Number(pricePaid) : undefined
    if (pricePaid.trim() && (!Number.isFinite(priceValue) || priceValue! < 0)) {
      setError(t('subscriptions.invalidAmount'))
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await window.api.guestpasses.create({
        name: name.trim(),
        phone: phone.trim() || undefined,
        price_paid: priceValue,
        validity_days: validityDays
      })

      setName('')
      setPhone('')
      setPricePaid('')
      setValidityDays(1)
      await loadPasses()
    } catch (err) {
      console.error('Failed to create guest pass:', err)
      setError(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const now = Date.now() / 1000

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 bg-muted/30 min-h-full">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('guestPasses.title', 'Guest Passes')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('guestPasses.subtitle', 'Create single-session trial passes and track usage.')}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr,1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t('guestPasses.create', 'Create Guest Pass')}</CardTitle>
            <CardDescription>{t('guestPasses.createHint', 'Create a one-time trial pass for entry.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('guestPasses.name', 'Guest Name')} *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('guestPasses.namePlaceholder', 'Guest name')} />
            </div>
            <div className="space-y-2">
              <Label>{t('guestPasses.phone', 'Phone (optional)')}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('guestPasses.phonePlaceholder', '+201xxxxxxxxx')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('guestPasses.validity', 'Validity (days)')}</Label>
                <Select
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6 | 7)}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                  <option value={6}>6</option>
                  <option value={7}>7</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('guestPasses.price', 'Price Paid')}</Label>
                <Input
                  type="number"
                  min="0"
                  value={pricePaid}
                  onChange={(e) => setPricePaid(e.target.value)}
                  placeholder={t('guestPasses.pricePlaceholder', '0.00')}
                />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={isLoading} className="w-full">
              {isLoading ? t('common.loading') : t('guestPasses.confirm', 'Confirm')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('guestPasses.recent', 'Recent Guest Passes')}</CardTitle>
            <CardDescription>{t('guestPasses.recentHint', 'Latest passes and their status.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {passes.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t('guestPasses.none', 'No guest passes yet.')}</div>
            ) : (
              passes.map((pass) => {
                const isExpired = pass.expires_at <= now
                const isUsed = !!pass.used_at
                const statusLabel = isUsed
                  ? t('guestPasses.used', 'Used')
                  : isExpired
                    ? t('guestPasses.expired', 'Expired')
                    : t('guestPasses.active', 'Active')
                const badgeVariant = isUsed ? 'warning' : isExpired ? 'destructive' : 'success'
                return (
                  <div key={pass.id} className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <p className="font-medium text-foreground">{pass.name}</p>
                      <p className="text-xs text-muted-foreground">{pass.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('guestPasses.expires', 'Expires')}: {new Date(pass.expires_at * 1000).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={badgeVariant}>{statusLabel}</Badge>
                      {pass.price_paid !== null && (
                        <span className="text-xs text-muted-foreground">{pass.price_paid}</span>
                      )}
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate('/members/new', { state: { guestName: pass.name, guestPhone: pass.phone } })}
                      >
                        {t('guestPasses.convertToMember', 'Convert to Member')}
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
