import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface ParsedRow {
  row: number
  name: string
  phone: string
  gender: 'male' | 'female'
  access_tier: 'A' | 'B'
  plan_months: 1 | 3 | 6 | 12
  start_date?: string
  price_paid?: number
}

interface InvalidRow {
  row: number
  errors: string[]
}

interface ImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; error: string }>
}

type Step = 'upload' | 'preview' | 'importing' | 'complete'

export default function Import() {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('upload')
  const [filePath, setFilePath] = useState<string>('')
  const [validRows, setValidRows] = useState<ParsedRow[]>([])
  const [invalidRows, setInvalidRows] = useState<InvalidRow[]>([])
  const [sendWelcome, setSendWelcome] = useState(true)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectFile = async () => {
    setError(null)
    const result = await window.api.import.selectFile()

    if (!result.success) {
      return
    }

    setFilePath(result.path)
    setIsLoading(true)

    try {
      const parseResult = await window.api.import.parseExcel(result.path)

      if (parseResult.error) {
        setError(parseResult.error)
        setIsLoading(false)
        return
      }

      setValidRows(parseResult.valid)
      setInvalidRows(parseResult.invalid)
      setStep('preview')
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    await window.api.import.downloadTemplate()
  }

  const handleImport = async () => {
    setStep('importing')
    setIsLoading(true)

    try {
      const dataToImport = validRows.map((row) => ({
        ...row,
        send_welcome: sendWelcome
      }))

      const result = await window.api.import.execute(dataToImport)
      setImportResult(result)
      setStep('complete')
    } catch (err) {
      setError(String(err))
      setStep('preview')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setStep('upload')
    setFilePath('')
    setValidRows([])
    setInvalidRows([])
    setImportResult(null)
    setError(null)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {t('import.title', 'Import Members')}
      </h1>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          <StepIndicator
            number={1}
            label={t('import.step.upload', 'Upload')}
            active={step === 'upload'}
            completed={step !== 'upload'}
          />
          <StepConnector completed={step !== 'upload'} />
          <StepIndicator
            number={2}
            label={t('import.step.preview', 'Preview')}
            active={step === 'preview'}
            completed={step === 'importing' || step === 'complete'}
          />
          <StepConnector completed={step === 'importing' || step === 'complete'} />
          <StepIndicator
            number={3}
            label={t('import.step.complete', 'Complete')}
            active={step === 'complete'}
            completed={false}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <XCircleIcon className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <div className="text-center">
            <ArrowUpTrayIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('import.upload.title', 'Upload Excel File')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {t(
                'import.upload.description',
                'Select an Excel file (.xlsx, .xls) or CSV file containing member data.'
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleSelectFile}
                disabled={isLoading}
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
                {t('import.upload.select', 'Select File')}
              </button>

              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                {t('import.upload.template', 'Download Template')}
              </button>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              {t('import.upload.columns', 'Required Columns')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <span className="font-medium">name</span>
                <p className="text-gray-500 text-xs">{t('import.column.name', 'Full name')}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <span className="font-medium">phone</span>
                <p className="text-gray-500 text-xs">
                  {t('import.column.phone', '+201XXXXXXXXX')}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <span className="font-medium">gender</span>
                <p className="text-gray-500 text-xs">{t('import.column.gender', 'male/female')}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded">
                <span className="font-medium">plan_months</span>
                <p className="text-gray-500 text-xs">
                  {t('import.column.planMonths', '1, 3, 6, or 12')}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              {t(
                'import.upload.optional',
                'Optional: access_tier (A/B), start_date, price_paid'
              )}
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {validRows.length + invalidRows.length}
              </div>
              <div className="text-sm text-gray-500">{t('import.preview.total', 'Total Rows')}</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{validRows.length}</div>
              <div className="text-sm text-green-600">{t('import.preview.valid', 'Valid')}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{invalidRows.length}</div>
              <div className="text-sm text-red-600">{t('import.preview.invalid', 'Invalid')}</div>
            </div>
          </div>

          {/* Invalid Rows */}
          {invalidRows.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5" />
                {t('import.preview.invalidRows', 'Rows with Errors')}
              </h3>
              <div className="max-h-48 overflow-y-auto">
                {invalidRows.map((row) => (
                  <div
                    key={row.row}
                    className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <span className="text-sm font-mono bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-2 py-0.5 rounded">
                      Row {row.row}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {row.errors.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valid Rows Preview */}
          {validRows.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {t('import.preview.validRows', 'Members to Import')}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left">
                        {t('import.table.name', 'Name')}
                      </th>
                      <th className="px-4 py-2 text-left">
                        {t('import.table.phone', 'Phone')}
                      </th>
                      <th className="px-4 py-2 text-left">
                        {t('import.table.gender', 'Gender')}
                      </th>
                      <th className="px-4 py-2 text-left">
                        {t('import.table.plan', 'Plan')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {validRows.slice(0, 10).map((row) => (
                      <tr
                        key={row.row}
                        className="border-b border-gray-100 dark:border-gray-700"
                      >
                        <td className="px-4 py-2 text-gray-500">{row.row}</td>
                        <td className="px-4 py-2">{row.name}</td>
                        <td className="px-4 py-2 font-mono text-xs">{row.phone}</td>
                        <td className="px-4 py-2 capitalize">{row.gender}</td>
                        <td className="px-4 py-2">{row.plan_months} months</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validRows.length > 10 && (
                  <div className="p-3 text-center text-sm text-gray-500 bg-gray-50 dark:bg-gray-900">
                    {t('import.preview.andMore', 'and {{count}} more...', {
                      count: validRows.length - 10
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Options */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sendWelcome}
                onChange={(e) => setSendWelcome(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">
                {t('import.preview.sendWelcome', 'Send welcome messages with QR codes via WhatsApp')}
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {t('import.preview.back', 'Back')}
            </button>
            <button
              onClick={handleImport}
              disabled={validRows.length === 0 || isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {t('import.preview.import', 'Import {{count}} Members', { count: validRows.length })}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === 'importing' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('import.importing.title', 'Importing Members...')}
          </h2>
          <p className="text-gray-500 mt-2">
            {t('import.importing.description', 'Please wait while we import your members.')}
          </p>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && importResult && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <div className="text-center mb-8">
            <CheckCircleIcon className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('import.complete.title', 'Import Complete')}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{importResult.success}</div>
              <div className="text-sm text-green-600">
                {t('import.complete.success', 'Imported')}
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{importResult.failed}</div>
              <div className="text-sm text-red-600">{t('import.complete.failed', 'Failed')}</div>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <h3 className="font-semibold text-red-600 mb-2">
                {t('import.complete.errors', 'Errors')}
              </h3>
              <div className="max-h-32 overflow-y-auto text-sm">
                {importResult.errors.map((err, i) => (
                  <div key={i} className="text-red-600">
                    Row {err.row}: {err.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('import.complete.importMore', 'Import More')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StepIndicator({
  number,
  label,
  active,
  completed
}: {
  number: number
  label: string
  active: boolean
  completed: boolean
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
          completed
            ? 'bg-green-500 text-white'
            : active
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
        }`}
      >
        {completed ? <CheckCircleIcon className="w-6 h-6" /> : number}
      </div>
      <span
        className={`mt-2 text-sm ${active ? 'text-blue-600 font-medium' : 'text-gray-500'}`}
      >
        {label}
      </span>
    </div>
  )
}

function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div
      className={`w-24 h-1 mx-2 ${completed ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
    />
  )
}
