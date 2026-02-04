import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PhotoCapture from '../components/PhotoCapture'
import ScannerInput from '../components/ScannerInput'

interface MemberFormData {
  name: string
  phone: string
  gender: 'male' | 'female' | ''
  access_tier: 'A' | 'B'
  photo_path: string | null
  card_code: string
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
    card_code: ''
  })
  const [createSubscription, setCreateSubscription] = useState(true)
  const [planMonths, setPlanMonths] = useState<1 | 3 | 6 | 12>(1)
  const [pricePaid, setPricePaid] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isEditing) {
      loadMember()
    }
  }, [id])

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
          card_code: member.card_code || ''
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
          card_code: formData.card_code.trim() || null
        })
      } else {
        // Create member first (without photo), then save photo using generated member ID
        const created = await window.api.members.create({
          name: formData.name,
          phone: formData.phone,
          gender: formData.gender as 'male' | 'female',
          access_tier: formData.access_tier,
          card_code: formData.card_code.trim() || null
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
          await window.api.subscriptions.create({
            member_id: created.id,
            plan_months: planMonths,
            price_paid: pricePaid ? Number(pricePaid) : undefined
          })
        }
      }

      navigate('/members')
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

  const handleCardScan = (value: string) => {
    setFormData((prev) => ({ ...prev, card_code: value }))
    setError(null)
  }

  return (
    <div className="min-h-full p-4 md:p-8 bg-gray-50 dark:bg-gray-950 max-w-3xl mx-auto">
      <h1 className="text-4xl font-heading font-bold text-gray-900 dark:text-white mb-2">
        {isEditing ? t('memberForm.editTitle') : t('memberForm.addTitle')}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        {isEditing ? 'Update member information' : 'Create a new gym member'}
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-200 animate-slide-up">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Photo */}
        <div>
          <label className="block text-sm font-heading font-semibold text-gray-900 dark:text-white mb-3">
            {t('memberForm.photo')}
          </label>
          <PhotoCapture
            currentPhoto={formData.photo_path}
            onCapture={handlePhotoCapture}
            onRemove={() => setFormData({ ...formData, photo_path: null })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-heading font-semibold text-gray-900 dark:text-white mb-2">
              {t('memberForm.name')} *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="Full name"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-heading font-semibold text-gray-900 dark:text-white mb-2">
              {t('memberForm.phone')} *
            </label>
            <input
              type="tel"
              id="phone"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+201xxxxxxxxx"
              className="input-field"
            />
          </div>

          {/* Gender */}
          <div>
            <label htmlFor="gender" className="block text-sm font-heading font-semibold text-gray-900 dark:text-white mb-2">
              {t('memberForm.gender')} *
            </label>
            <select
              id="gender"
              required
              value={formData.gender}
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | '' })
              }
              className="input-field"
            >
              <option value="">{t('memberForm.selectGender')}</option>
              <option value="male">{t('memberForm.male')}</option>
              <option value="female">{t('memberForm.female')}</option>
            </select>
          </div>

          {/* Access Tier */}
          <div>
            <label htmlFor="tier" className="block text-sm font-heading font-semibold text-gray-900 dark:text-white mb-2">
              {t('memberForm.tier')} *
            </label>
            <select
              id="tier"
              value={formData.access_tier}
              onChange={(e) =>
                setFormData({ ...formData, access_tier: e.target.value as 'A' | 'B' })
              }
              className="input-field"
            >
              <option value="A">{t('memberForm.tierA')}</option>
              <option value="B">{t('memberForm.tierB')}</option>
            </select>
          </div>
        </div>

        {/* Card Code */}
        <div>
          <label htmlFor="card_code" className="block text-sm font-heading font-semibold text-gray-900 dark:text-white mb-2">
            {t('memberForm.cardCode', 'Card QR Code')}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="card_code"
              value={formData.card_code}
              onChange={(e) => setFormData({ ...formData, card_code: e.target.value })}
              placeholder={t('memberForm.cardPlaceholder', 'Scan or type card code')}
              className="input-field flex-1"
            />
            <button
              type="button"
              onClick={() => document.querySelector<HTMLInputElement>('.scanner-input')?.focus()}
              className="btn btn-secondary"
            >
              {t('memberForm.scanCard', 'Scan Card')}
            </button>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            {t('memberForm.cardHint', 'Assign a QR card now, or you can do it later.')}
          </p>
        </div>

        {!isEditing && (
          <div className="border-t border-gray-300 dark:border-gray-700 pt-6">
            <h3 className="text-base font-heading font-semibold text-gray-900 dark:text-white mb-4">
              {t('memberForm.subscription', 'Initial Subscription')}
            </h3>
            <label className="flex items-center gap-3 mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={createSubscription}
                onChange={(e) => setCreateSubscription(e.target.checked)}
                className="w-5 h-5 accent-brand-primary rounded"
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {t('memberForm.createSubscription', 'Create subscription now')}
              </span>
            </label>

            {createSubscription && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                <div>
                  <label className="block text-sm font-heading font-semibold text-gray-900 dark:text-white mb-2">
                    {t('memberForm.planMonths', 'Duration')}
                  </label>
                  <select
                    value={planMonths}
                    onChange={(e) => setPlanMonths(Number(e.target.value) as 1 | 3 | 6 | 12)}
                    className="input-field"
                  >
                    <option value={1}>1 {t('memberForm.month', 'month')}</option>
                    <option value={3}>3 {t('memberForm.months', 'months')}</option>
                    <option value={6}>6 {t('memberForm.months', 'months')}</option>
                    <option value={12}>12 {t('memberForm.months', 'months')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-heading font-semibold text-gray-900 dark:text-white mb-2">
                    {t('memberForm.pricePaid', 'Price Paid')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={pricePaid}
                    onChange={(e) => setPricePaid(e.target.value)}
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 pt-6 border-t border-gray-300 dark:border-gray-700">
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary flex-1"
          >
            {isLoading ? (
              <>
                <div className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {t('common.loading')}
              </>
            ) : (
              t('memberForm.save')
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/members')}
            className="btn btn-secondary flex-1"
          >
            {t('memberForm.cancel')}
          </button>
        </div>
      </form>

      {/* Hidden scanner input for card assignment */}
      <ScannerInput onScan={(value) => handleCardScan(value)} autoFocus={false} />
    </div>
  )
}
