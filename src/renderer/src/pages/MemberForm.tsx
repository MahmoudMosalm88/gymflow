import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PhotoCapture from '../components/PhotoCapture'
import QRCodeDisplay from '../components/QRCodeDisplay'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
import { Checkbox } from '../components/ui/checkbox'

interface MemberFormData {
  name: string
  phone: string
  gender: 'male' | 'female' | ''
  access_tier: 'A' | 'B'
  photo_path: string | null
  card_code: string
  address: string
}

export default function MemberForm(): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [formData, setFormData] = useState<MemberFormData>({
    name: '',
    phone: '',
    gender: '',
    access_tier: 'A',
    photo_path: null,
    card_code: '',
    address: ''
  })
  const [createSubscription, setCreateSubscription] = useState(true)
  const [planMonths, setPlanMonths] = useState<1 | 3 | 6 | 12>(1)
  const [pricePaid, setPricePaid] = useState<string>('')
  const [sessionsPerMonth, setSessionsPerMonth] = useState<string>('')
  const [sessionsTouched, setSessionsTouched] = useState(false)
  const [sessionCaps, setSessionCaps] = useState<{ male: number; female: number }>({
    male: 26,
    female: 30
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdMember, setCreatedMember] = useState<{ id: string; name: string } | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)

  useEffect(() => {
    if (isEditing) {
      loadMember()
    }
  }, [id])

  useEffect(() => {
    const loadCaps = async () => {
      try {
        const settings = await window.api.settings.getAll()
        const male = typeof settings.session_cap_male === 'number' ? settings.session_cap_male : 26
        const female = typeof settings.session_cap_female === 'number' ? settings.session_cap_female : 30
        setSessionCaps({ male, female })
      } catch {
        // ignore
      }
    }
    loadCaps()
  }, [])

  useEffect(() => {
    if (isEditing || !createSubscription || sessionsTouched) return
    if (formData.gender === 'male') {
      setSessionsPerMonth(String(sessionCaps.male))
    } else if (formData.gender === 'female') {
      setSessionsPerMonth(String(sessionCaps.female))
    }
  }, [formData.gender, createSubscription, sessionCaps, sessionsTouched, isEditing])

  const loadMember = async () => {
    try {
      const member = await window.api.members.getById(id!)
      if (member) {
        setFormData({
          name: member.name,
          phone: member.phone,
          gender: member.gender,
          access_tier: member.access_tier,
          photo_path: member.photo_path,
          card_code: member.card_code || '',
          address: member.address || ''
        })
      }
    } catch (error) {
      console.error('Failed to load member:', error)
      setError(t('common.error'))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.gender) {
      setError('Please select a gender')
      return
    }
    if (!isEditing) {
      const cardCode = formData.card_code.trim()
      if (!cardCode) {
        setError(t('memberForm.cardCodeRequired', 'Card code is required'))
        return
      }
      const cardCodePattern = /^GF-\d{6}$/
      if (!cardCodePattern.test(cardCode)) {
        setError(t('memberForm.cardCodeFormat', 'Card code must match GF-000001'))
        return
      }
    }
    if (!isEditing && createSubscription) {
      const parsedSessions = sessionsPerMonth.trim() ? Number(sessionsPerMonth) : NaN
      if (!Number.isFinite(parsedSessions) || parsedSessions <= 0) {
        setError(t('memberForm.sessionsRequired', 'Enter sessions per month'))
        return
      }
    }

    setIsLoading(true)
    setError(null)

    try {
      const isDataUrl = (value: string | null) => !!value && value.startsWith('data:')

      if (isEditing) {
        let photoPath = formData.photo_path

        if (isDataUrl(photoPath)) {
          const saveResult = await window.api.photos.save(photoPath as string, id!)
          if (!saveResult.success || !saveResult.path) {
            throw new Error(saveResult.error || 'Failed to save photo')
          }
          photoPath = saveResult.path
        }

        await window.api.members.update(id!, {
          name: formData.name,
          phone: formData.phone,
          gender: formData.gender as 'male' | 'female',
          access_tier: formData.access_tier,
          photo_path: photoPath ?? null,
          card_code: formData.card_code.trim() || null,
          address: formData.address.trim() || null
        })

        navigate('/members')
        return
      }

      const created = await window.api.members.create({
        name: formData.name,
        phone: formData.phone,
        gender: formData.gender as 'male' | 'female',
        access_tier: formData.access_tier,
        card_code: formData.card_code.trim() || null,
        address: formData.address.trim() || null
      })

      if (formData.photo_path) {
        let photoPath: string | null = formData.photo_path
        if (isDataUrl(photoPath)) {
          const saveResult = await window.api.photos.save(photoPath, created.id)
          if (!saveResult.success || !saveResult.path) {
            throw new Error(saveResult.error || 'Failed to save photo')
          }
          photoPath = saveResult.path
        }
        await window.api.members.update(created.id, { photo_path: photoPath })
      }

      if (createSubscription) {
        const parsedSessions = sessionsPerMonth.trim() ? Number(sessionsPerMonth) : NaN
        const sessionsValue =
          Number.isFinite(parsedSessions) && parsedSessions > 0 ? parsedSessions : undefined
        await window.api.subscriptions.create({
          member_id: created.id,
          plan_months: planMonths,
          price_paid: pricePaid ? Number(pricePaid) : undefined,
          sessions_per_month: sessionsValue
        })
      }

      setCreatedMember({ id: created.id, name: created.name })
      setShowQrModal(true)
    } catch (error) {
      console.error('Failed to save member:', error)
      setError(t('common.error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhotoCapture = (photoPath: string) => {
    setFormData({ ...formData, photo_path: photoPath })
  }

  return (
    <div className="min-h-full p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          {isEditing ? t('memberForm.editTitle') : t('memberForm.addTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEditing ? 'Update member information' : 'Create a new gym member'}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('memberForm.addTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label>{t('memberForm.photo')}</Label>
              <div className="mt-3">
                <PhotoCapture
                  currentPhoto={formData.photo_path}
                  onCapture={handlePhotoCapture}
                  onRemove={() => setFormData({ ...formData, photo_path: null })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">{t('memberForm.name')} *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('memberForm.phone')} *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+201xxxxxxxxx"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">{t('memberForm.gender')} *</Label>
                <Select
                  id="gender"
                  required
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | '' })
                  }
                >
                  <option value="">{t('memberForm.selectGender')}</option>
                  <option value="male">{t('memberForm.male')}</option>
                  <option value="female">{t('memberForm.female')}</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier">{t('memberForm.tier')} *</Label>
                <Select
                  id="tier"
                  value={formData.access_tier}
                  onChange={(e) =>
                    setFormData({ ...formData, access_tier: e.target.value as 'A' | 'B' })
                  }
                >
                  <option value="A">{t('memberForm.tierA')}</option>
                  <option value="B">{t('memberForm.tierB')}</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t('memberForm.address', 'Address')}</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('memberForm.addressPlaceholder', 'Street, area, city')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="card_code">
                {t('memberForm.cardCode', 'Card Code')} {!isEditing && '*'}
              </Label>
              <Input
                id="card_code"
                value={formData.card_code}
                onChange={(e) => setFormData({ ...formData, card_code: e.target.value })}
                readOnly={isEditing}
                required={!isEditing}
                placeholder={t('memberForm.cardCodePlaceholder', 'Scan printed card code')}
              />
              <p className="text-xs text-muted-foreground">
                {isEditing
                  ? t('memberForm.cardCodeEditHint', 'Use Replace Card Code in the member profile to update.')
                  : t('memberForm.cardCodeHint', 'Scan or type the printed card code (e.g. GF-000123).')}
              </p>
            </div>

            {!isEditing && (
              <div className="border-t pt-6">
                <h3 className="text-base font-semibold text-foreground mb-4">
                  {t('memberForm.subscription', 'Initial Subscription')}
                </h3>
                <div className="flex items-center gap-3 mb-5">
                  <Checkbox
                    id="create-subscription"
                    checked={createSubscription}
                    onCheckedChange={(checked) => setCreateSubscription(Boolean(checked))}
                  />
                  <Label htmlFor="create-subscription" className="text-sm font-medium">
                    {t('memberForm.createSubscription', 'Create subscription now')}
                  </Label>
                </div>

                {createSubscription && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>{t('memberForm.planMonths', 'Duration')}</Label>
                      <Select
                        value={planMonths}
                        onChange={(e) => setPlanMonths(Number(e.target.value) as 1 | 3 | 6 | 12)}
                      >
                        <option value={1}>1 {t('memberForm.month', 'month')}</option>
                        <option value={3}>3 {t('memberForm.months', 'months')}</option>
                        <option value={6}>6 {t('memberForm.months', 'months')}</option>
                        <option value={12}>12 {t('memberForm.months', 'months')}</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('memberForm.sessionsPerMonth', 'Sessions per month')}</Label>
                      <Input
                        type="number"
                        min="1"
                        value={sessionsPerMonth}
                        onChange={(e) => {
                          setSessionsTouched(true)
                          setSessionsPerMonth(e.target.value)
                        }}
                        placeholder="26"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('memberForm.pricePaid', 'Price Paid')}</Label>
                      <Input
                        type="number"
                        min="0"
                        value={pricePaid}
                        onChange={(e) => setPricePaid(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4 pt-6 border-t">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? t('common.loading') : t('memberForm.save')}
              </Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate('/members')}>
                {t('memberForm.cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {showQrModal && createdMember && (
        <QRCodeDisplay
          memberId={createdMember.id}
          memberName={createdMember.name}
          onClose={() => {
            setShowQrModal(false)
            navigate(`/members/${createdMember.id}`)
          }}
        />
      )}
    </div>
  )
}
