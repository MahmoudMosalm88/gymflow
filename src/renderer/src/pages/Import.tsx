import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Checkbox } from '../components/ui/checkbox'

interface ParsedRow {
  row: number
  name: string
  phone: string
  gender: 'male' | 'female'
  access_tier: 'A' | 'B'
  plan_months: 1 | 3 | 6 | 12
  sessions_per_month?: number
  start_date?: string
  price_paid?: number
  address?: string
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
    <div className="p-6 max-w-6xl mx-auto bg-muted/30 min-h-full">
      <h1 className="text-2xl font-bold text-foreground mb-6">
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
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
          <div className="flex items-center gap-2 text-destructive">
            <XCircleIcon className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <ArrowUpTrayIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {t('import.upload.title', 'Upload Excel File')}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t(
                  'import.upload.description',
                  'Select an Excel file (.xlsx, .xls) or CSV file containing member data.'
                )}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={handleSelectFile} disabled={isLoading}>
                  <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
                  {t('import.upload.select', 'Select File')}
                </Button>

                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                  {t('import.upload.template', 'Download Template')}
                </Button>
              </div>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <h3 className="font-medium text-foreground mb-3">
                {t('import.upload.columns', 'Required Columns')}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-muted/40 p-3 rounded">
                  <span className="font-medium">name</span>
                  <p className="text-muted-foreground text-xs">
                    {t('import.column.name', 'Full name')}
                  </p>
                </div>
                <div className="bg-muted/40 p-3 rounded">
                  <span className="font-medium">phone</span>
                  <p className="text-muted-foreground text-xs">
                    {t('import.column.phone', '+201XXXXXXXXX')}
                  </p>
                </div>
                <div className="bg-muted/40 p-3 rounded">
                  <span className="font-medium">gender</span>
                  <p className="text-muted-foreground text-xs">
                    {t('import.column.gender', 'male/female')}
                  </p>
                </div>
                <div className="bg-muted/40 p-3 rounded">
                  <span className="font-medium">plan_months</span>
                  <p className="text-muted-foreground text-xs">
                    {t('import.column.planMonths', '1, 3, 6, or 12')}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {t(
                  'import.upload.optional',
                  'Optional: access_tier (A/B), start_date, price_paid, card_code, sessions_per_month, address'
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-foreground">
                  {validRows.length + invalidRows.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('import.preview.total', 'Total Rows')}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-100">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-emerald-600">{validRows.length}</div>
                <div className="text-sm text-emerald-600">{t('import.preview.valid', 'Valid')}</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-100">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{invalidRows.length}</div>
                <div className="text-sm text-red-600">{t('import.preview.invalid', 'Invalid')}</div>
              </CardContent>
            </Card>
          </div>

          {/* Invalid Rows */}
          {invalidRows.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5" />
                  {t('import.preview.invalidRows', 'Rows with Errors')}
                </h3>
                <div className="max-h-48 overflow-y-auto">
                  {invalidRows.map((row) => (
                    <div
                      key={row.row}
                      className="flex items-start gap-3 py-2 border-b border-border last:border-0"
                    >
                      <span className="text-sm font-mono bg-red-100 text-red-700 px-2 py-0.5 rounded">
                        Row {row.row}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {row.errors.join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Valid Rows Preview */}
          {validRows.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border">
                <CardTitle>{t('import.preview.validRows', 'Members to Import')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
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
                    <tbody className="divide-y divide-border">
                      {validRows.slice(0, 10).map((row) => (
                        <tr key={row.row}>
                          <td className="px-4 py-2 text-muted-foreground">{row.row}</td>
                          <td className="px-4 py-2">{row.name}</td>
                          <td className="px-4 py-2 font-mono text-xs">{row.phone}</td>
                          <td className="px-4 py-2 capitalize">{row.gender}</td>
                          <td className="px-4 py-2">{row.plan_months} months</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validRows.length > 10 && (
                    <div className="p-3 text-center text-sm text-muted-foreground bg-muted">
                      {t('import.preview.andMore', 'and {{count}} more...', {
                        count: validRows.length - 10
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Options */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="send-welcome"
                  checked={sendWelcome}
                  onCheckedChange={(checked) => setSendWelcome(Boolean(checked))}
                />
                <label htmlFor="send-welcome" className="text-sm text-foreground">
                  {t('import.preview.sendWelcome', 'Send welcome messages with QR codes via WhatsApp')}
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              {t('import.preview.back', 'Back')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0 || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {t('import.preview.import', 'Import {{count}} Members', { count: validRows.length })}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === 'importing' && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-16 h-16 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-foreground">
              {t('import.importing.title', 'Importing Members...')}
            </h2>
            <p className="text-muted-foreground mt-2">
              {t('import.importing.description', 'Please wait while we import your members.')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && importResult && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <CheckCircleIcon className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-foreground">
                {t('import.complete.title', 'Import Complete')}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{importResult.success}</div>
                <div className="text-sm text-green-600">
                  {t('import.complete.success', 'Imported')}
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{importResult.failed}</div>
                <div className="text-sm text-red-600">{t('import.complete.failed', 'Failed')}</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mb-8 p-4 bg-red-50 rounded-lg">
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
              <Button onClick={handleReset}>{t('import.complete.importMore', 'Import More')}</Button>
            </div>
          </CardContent>
        </Card>
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
            ? 'bg-emerald-500 text-white'
            : active
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {completed ? <CheckCircleIcon className="w-6 h-6" /> : number}
      </div>
      <span
        className={`mt-2 text-sm ${active ? 'text-primary font-medium' : 'text-muted-foreground'}`}
      >
        {label}
      </span>
    </div>
  )
}

function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div
      className={`w-24 h-1 mx-2 ${completed ? 'bg-emerald-500' : 'bg-muted'}`}
    />
  )
}
