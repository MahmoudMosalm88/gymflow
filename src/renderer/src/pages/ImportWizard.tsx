import { useTranslation } from 'react-i18next'

export default function ImportWizard(): JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('import.title')}</h1>
      <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
        <p>Excel import wizard coming soon...</p>
      </div>
    </div>
  )
}
