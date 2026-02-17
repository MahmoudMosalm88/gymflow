import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

export default function ImportWizard(): JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="p-6 bg-muted/30 min-h-full">
      <h1 className="text-3xl font-bold text-foreground mb-6">{t('import.title')}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Import Wizard</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>Excel import wizard coming soon...</p>
        </CardContent>
      </Card>
    </div>
  )
}
