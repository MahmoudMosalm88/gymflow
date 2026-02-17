import { useTranslation } from 'react-i18next'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'

interface GuestPassCardProps {
  guestPass: {
    name: string
    phone: string | null
    code: string
    expires_at: number
    used_at: number | null
  }
  status: 'allowed' | 'warning' | 'denied' | 'ignored'
}

export default function GuestPassCard({ guestPass }: GuestPassCardProps): JSX.Element {
  const { t } = useTranslation()
  const now = Date.now() / 1000
  const isExpired = guestPass.expires_at <= now
  const isUsed = !!guestPass.used_at

  const statusLabel = isUsed
    ? t('guestPasses.used', 'Used')
    : isExpired
      ? t('guestPasses.expired', 'Expired')
      : t('guestPasses.active', 'Active')

  const statusVariant = isUsed ? 'warning' : isExpired ? 'destructive' : 'success'

  return (
    <Card className="w-full max-w-md mt-8">
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t('guestPasses.title', 'Guest Pass')}</p>
            <p className="text-xl font-semibold text-foreground">{guestPass.name}</p>
          </div>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>

        {guestPass.phone && (
          <p className="text-sm text-muted-foreground">{guestPass.phone}</p>
        )}

        <div className="text-sm">
          <span className="text-muted-foreground">{t('guestPasses.code', 'Code')}:</span>{' '}
          <span className="font-mono text-foreground">{guestPass.code}</span>
        </div>

        <div className="text-sm text-muted-foreground">
          {t('guestPasses.expires', 'Expires')}: {new Date(guestPass.expires_at * 1000).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  )
}
