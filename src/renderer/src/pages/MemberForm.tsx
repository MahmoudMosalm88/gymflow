import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PhotoCapture from '../components/PhotoCapture'

interface MemberFormData {
  name: string
  phone: string
  gender: 'male' | 'female' | ''
  access_tier: 'A' | 'B'
  photo_path: string | null
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
    photo_path: null
  })
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
          photo_path: member.photo_path
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
          photo_path: photoPath ?? null
        })
      } else {
        // Create member first (without photo), then save photo using generated member ID
        const created = await window.api.members.create({
          name: formData.name,
          phone: formData.phone,
          gender: formData.gender as 'male' | 'female',
          access_tier: formData.access_tier
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

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {isEditing ? t('memberForm.editTitle') : t('memberForm.addTitle')}
      </h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
        {/* Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('memberForm.photo')}
          </label>
          <PhotoCapture
            currentPhoto={formData.photo_path}
            onCapture={handlePhotoCapture}
            onRemove={() => setFormData({ ...formData, photo_path: null })}
          />
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            {t('memberForm.name')}
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            {t('memberForm.phone')}
          </label>
          <input
            type="tel"
            id="phone"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+201xxxxxxxxx"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
          />
        </div>

        {/* Gender */}
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
            {t('memberForm.gender')}
          </label>
          <select
            id="gender"
            required
            value={formData.gender}
            onChange={(e) =>
              setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | '' })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
          >
            <option value="">{t('memberForm.selectGender')}</option>
            <option value="male">{t('memberForm.male')}</option>
            <option value="female">{t('memberForm.female')}</option>
          </select>
        </div>

        {/* Access Tier */}
        <div>
          <label htmlFor="tier" className="block text-sm font-medium text-gray-700 mb-2">
            {t('memberForm.tier')}
          </label>
          <select
            id="tier"
            value={formData.access_tier}
            onChange={(e) =>
              setFormData({ ...formData, access_tier: e.target.value as 'A' | 'B' })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gym-primary focus:border-transparent"
          >
            <option value="A">{t('memberForm.tierA')}</option>
            <option value="B">{t('memberForm.tierB')}</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 bg-gym-primary text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? t('common.loading') : t('memberForm.save')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/members')}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            {t('memberForm.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
