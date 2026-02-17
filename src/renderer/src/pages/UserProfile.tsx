import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export default function UserProfile(): JSX.Element {
  const { t } = useTranslation()

  // Profile fields (stored in settings key-value store with profile_ prefix)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gymName, setGymName] = useState('')
  const [gymAddress, setGymAddress] = useState('')
  const [gymLogo, setGymLogo] = useState<string | null>(null)

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // UI state
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Load profile data from settings store
  useEffect(() => {
    const load = async () => {
      try {
        const [pName, pEmail, pPhone, gName, gAddress, gLogo] = await Promise.all([
          window.api.settings.get('profile_name'),
          window.api.settings.get('profile_email'),
          window.api.settings.get('profile_phone'),
          window.api.settings.get('profile_gym_name'),
          window.api.settings.get('profile_gym_address'),
          window.api.settings.get('profile_gym_logo')
        ])
        if (typeof pName === 'string') setName(pName)
        if (typeof pEmail === 'string') setEmail(pEmail)
        if (typeof pPhone === 'string') setPhone(pPhone)
        if (typeof gName === 'string') setGymName(gName)
        if (typeof gAddress === 'string') setGymAddress(gAddress)
        if (typeof gLogo === 'string') setGymLogo(gLogo)
      } catch {
        // ignore
      }
    }
    load()
  }, [])

  const handleSaveProfile = async () => {
    setIsSaving(true)
    setProfileMessage(null)
    try {
      await window.api.settings.setAll({
        profile_name: name,
        profile_email: email,
        profile_gym_name: gymName,
        profile_gym_address: gymAddress,
        profile_gym_logo: gymLogo
      })
      setProfileMessage(t('profile.saved'))
    } catch {
      setProfileMessage(t('profile.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordMessage(null)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage(t('auth.required'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage(t('auth.passwordMismatch'))
      return
    }
    if (newPassword.length < 8) {
      setPasswordMessage(t('auth.passwordHint'))
      return
    }

    setIsChangingPassword(true)
    try {
      // Get the session token to authenticate the change
      const tokenRes = await window.api.secureStore.get('session_token')
      const token = tokenRes?.success ? tokenRes.value : null
      if (!token) {
        setPasswordMessage(t('profile.passwordFailed'))
        return
      }

      const result = await window.api.owner.changePassword(token, currentPassword, newPassword)
      if (result?.success) {
        setPasswordMessage(t('profile.passwordChanged'))
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else if (result?.error === 'wrong_password') {
        setPasswordMessage(t('profile.wrongPassword'))
      } else {
        setPasswordMessage(t('profile.passwordFailed'))
      }
    } catch {
      setPasswordMessage(t('profile.passwordFailed'))
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleLogoUpload = async () => {
    try {
      // Use a hidden file input approach
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
          setGymLogo(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
      input.click()
    } catch {
      // ignore
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 bg-muted/30 min-h-full">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{t('profile.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('profile.subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('profile.name')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.email')}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.phone')}</Label>
              <Input value={phone} readOnly className="opacity-60 cursor-not-allowed" />
            </div>
          </CardContent>
        </Card>

        {/* Gym Branding */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.gymBranding')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('profile.gymName')}</Label>
              <Input value={gymName} onChange={(e) => setGymName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.gymAddress')}</Label>
              <Input value={gymAddress} onChange={(e) => setGymAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.gymLogo')}</Label>
              <div className="flex items-center gap-3">
                {gymLogo ? (
                  <img
                    src={gymLogo}
                    alt="Gym logo"
                    className="w-16 h-16 rounded-lg object-cover border border-border"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                    {t('profile.gymLogo')}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleLogoUpload}>
                    {t('profile.uploadLogo')}
                  </Button>
                  {gymLogo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setGymLogo(null)}
                    >
                      {t('profile.removeLogo')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Profile Button */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSaveProfile} disabled={isSaving}>
          {isSaving ? t('common.loading') : t('profile.saveProfile')}
        </Button>
        {profileMessage && (
          <span
            className={`text-sm ${
              profileMessage.includes(t('profile.saved')) ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {profileMessage}
          </span>
        )}
      </div>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.changePassword')}</CardTitle>
          <CardDescription>{t('auth.passwordHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t('profile.currentPassword')}</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.newPassword')}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('profile.confirmPassword')}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword}
              variant="secondary"
            >
              {isChangingPassword ? t('common.loading') : t('profile.updatePassword')}
            </Button>
            {passwordMessage && (
              <span
                className={`text-sm ${
                  passwordMessage === t('profile.passwordChanged')
                    ? 'text-emerald-400'
                    : 'text-red-400'
                }`}
              >
                {passwordMessage}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
