'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Terminal, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  DesktopImportExecuteResponse,
  DesktopImportJobStatusResponse,
  DesktopImportValidationResponse,
} from '@/lib/migration-contracts';

type ValidateResult = DesktopImportValidationResponse;
type ExecuteResult = DesktopImportExecuteResponse;
type StatusResult = DesktopImportJobStatusResponse;

const IMPORT_CONFIRMATION_TEXT = "IMPORT";

const safetyCopy = {
  en: {
    importReviewTitle: "Import review",
    importFile: "File",
    importAutoSnapshot: "GymFlow will create a pre-import backup before replacing the current branch data.",
    importConfirmLabel: `Type ${IMPORT_CONFIRMATION_TEXT} to continue`,
    importConfirmHint: "This import will replace the branch data currently in GymFlow.",
    importSuccessSnapshot: "A safety backup was created before this import ran.",
  },
  ar: {
    importReviewTitle: "مراجعة الاستيراد",
    importFile: "الملف",
    importAutoSnapshot: "سيقوم GymFlow بإنشاء نسخة أمان قبل استبدال بيانات الفرع الحالية.",
    importConfirmLabel: `اكتب ${IMPORT_CONFIRMATION_TEXT} للمتابعة`,
    importConfirmHint: "سيؤدي هذا الاستيراد إلى استبدال بيانات الفرع الموجودة حالياً في GymFlow.",
    importSuccessSnapshot: "تم إنشاء نسخة أمان قبل تنفيذ هذا الاستيراد.",
  },
} as const;

function StepIndicator({ current }: { current: number }) {
  const { lang } = useLang();
  const steps = [
    { num: 1, label: t[lang].upload_file },
    { num: 2, label: t[lang].validate_data },
    { num: 3, label: t[lang].execute_import },
  ];
  return (
    <div className="flex items-center justify-center gap-2 mb-6 text-sm">
      {steps.map((step, i) => (
        <React.Fragment key={step.num}>
          <div className="flex flex-col items-center gap-1">
            <div className={cn(
              "w-9 h-9 flex items-center justify-center font-bold border-2 border-border",
              step.num <= current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {step.num}
            </div>
            <span className={cn("text-xs mt-1", step.num <= current ? "text-foreground" : "text-muted-foreground")}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <Separator orientation="horizontal" className={cn("w-12 h-0.5", step.num < current ? "bg-primary" : "bg-muted")} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ImportRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center border-b border-border py-2 last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-normal text-foreground", color)}>{value}</span>
    </div>
  );
}


export default function ImportTab() {
  const { lang } = useLang();
  const labels = t[lang];
  const safetyLabels = safetyCopy[lang];
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [artifactId, setArtifactId] = useState('');

  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidateResult | null>(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmImportText, setConfirmImportText] = useState('');
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<StatusResult | null>(null);

  async function handleUpload() {
    setError('');
    const file = fileRef.current?.files?.[0];
    if (!file) { setError(labels.select_db_file); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('session_token');
      const branchId = localStorage.getItem('branch_id');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (branchId) headers['x-branch-id'] = branchId;
      const response = await fetch('/api/migration/upload', { method: 'POST', headers, body: formData });
      const res = await response.json();
      if (!res.success || !res.data) { setError(res.message || labels.upload_failed); return; }
      setArtifactId(res.data.id);
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : labels.upload_failed);
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (step !== 2 || !artifactId) return;
    let cancelled = false;
    async function validate() {
      setValidating(true);
      setError('');
      try {
        const res = await api.post<ValidateResult>('/api/migration/validate', { artifactId });
        if (cancelled) return;
        if (!res.success || !res.data) { setError(res.message || labels.validation_failed); }
        else { setValidation(res.data); }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : labels.validation_failed);
      } finally {
        if (!cancelled) setValidating(false);
      }
    }
    validate();
    return () => { cancelled = true; };
  }, [step, artifactId, labels.validation_failed]);

  const handleExecute = useCallback(async () => {
    setShowConfirm(false);
    setExecuting(true);
    setError('');
    try {
      const res = await api.post<ExecuteResult>('/api/migration/execute', {
        artifactId,
        confirmImportText: confirmImportText.trim(),
      });
      if (!res.success || !res.data) { setError(res.message || labels.execution_failed); setExecuting(false); return; }
      const jobId = res.data.jobId;
      const poll = async () => {
        const s = await api.get<StatusResult>(`/api/migration/status?jobId=${jobId}`);
        if (s.data && (s.data.status === 'completed' || s.data.status === 'failed')) {
          setResult(s.data);
          setExecuting(false);
          setConfirmImportText('');
        } else {
          setTimeout(poll, 2000);
        }
      };
      poll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : labels.execution_failed);
      setExecuting(false);
    }
  }, [artifactId, confirmImportText, labels.execution_failed]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <StepIndicator current={step} />

      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{labels.error_title}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{labels.upload_file}</CardTitle>
            <CardDescription>{labels.upload_file_description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Styled upload zone — replaces the native inline-styled file input */}
            <label
              htmlFor="db-file-input"
              className="flex flex-col items-center justify-center border-2 border-dashed border-border p-6 text-center cursor-pointer hover:border-primary transition-colors"
            >
              <span className="text-muted-foreground text-sm">
                {fileName ? fileName : labels.select_db_file}
              </span>
              <span className="mt-2 text-xs text-muted-foreground">{labels.upload_file_description}</span>
              <input
                ref={fileRef}
                id="db-file-input"
                type="file"
                accept=".db"
                className="sr-only"
                onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
              />
            </label>
            <Button onClick={handleUpload} disabled={uploading || !fileName} className="w-full">
              {uploading ? labels.uploading : labels.upload}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{labels.validate_data}</CardTitle>
            <CardDescription>{labels.validate_data_description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {validating && <LoadingSpinner />}
            {!validating && validation && (
              <div className="space-y-3 mb-6">
                <ImportRow label={labels.schema_version} value={validation.schemaVersion} />
                <ImportRow label={labels.members_count} value={String(validation.members)} />
                <ImportRow label={labels.subscriptions_count} value={String(validation.subscriptions)} />
                <ImportRow label={labels.status} value={validation.isValid ? labels.valid + ' ✓' : labels.invalid + ' ✗'} color={validation.isValid ? 'text-success' : 'text-destructive'} />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setStep(1); setValidation(null); setError(''); }}>{labels.back}</Button>
              {validation?.isValid && <Button onClick={() => setStep(3)}>{labels.continue}</Button>}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{labels.execute_import}</CardTitle>
            <CardDescription>{labels.execute_import_description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!executing && !result && !showConfirm && (
              <>
                {/* Warning alert — className override since Alert has no "warning" variant */}
                <Alert className="border-warning/50 text-warning [&>svg]:text-warning">
                  <Terminal className="h-4 w-4" />
                  <AlertTitle>{labels.warning_title}</AlertTitle>
                  <AlertDescription>{labels.warning_replace_data}</AlertDescription>
                </Alert>
                {validation ? (
                  <div className="border-2 border-border bg-muted/20 p-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground">{safetyLabels.importReviewTitle}</p>
                    <div className="grid gap-2 text-sm md:grid-cols-2">
                      <p>{safetyLabels.importFile}: <span className="font-medium text-foreground">{validation.fileName}</span></p>
                      <p>{labels.schema_version}: <span className="font-medium text-foreground">{validation.schemaVersion}</span></p>
                      <p>{labels.members_count}: <span className="font-stat text-foreground">{validation.members}</span></p>
                      <p>{labels.subscriptions_count}: <span className="font-stat text-foreground">{validation.subscriptions}</span></p>
                    </div>
                    <p className="text-xs text-warning">{safetyLabels.importAutoSnapshot}</p>
                  </div>
                ) : null}
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => { setStep(2); setError(''); }}>{labels.back}</Button>
                  <Button onClick={() => setShowConfirm(true)}>{labels.execute_import_button}</Button>
                </div>
              </>
            )}

            {showConfirm && (
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>{labels.confirm_action}</AlertTitle>
                <AlertDescription>{safetyLabels.importConfirmHint}</AlertDescription>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="import-confirmation">{safetyLabels.importConfirmLabel}</Label>
                  <Input
                    id="import-confirmation"
                    value={confirmImportText}
                    onChange={(event) => setConfirmImportText(event.target.value)}
                    placeholder={IMPORT_CONFIRMATION_TEXT}
                    dir="ltr"
                  />
                </div>
                <div className="flex gap-3 justify-end mt-4">
                  <Button variant="outline" onClick={() => { setShowConfirm(false); setConfirmImportText(''); }}>{labels.cancel}</Button>
                  <Button variant="destructive" onClick={handleExecute} disabled={confirmImportText.trim() !== IMPORT_CONFIRMATION_TEXT}>
                    {labels.yes_execute}
                  </Button>
                </div>
              </Alert>
            )}

            {executing && <LoadingSpinner />}

            {result && (
              <div className="space-y-4">
                {result.status === 'completed' ? (
                  /* Success alert — className override since Alert "success" variant uses Tailwind green not design token */
                  <Alert className="border-success/50 text-success [&>svg]:text-success">
                    <Check className="h-4 w-4" />
                    <AlertTitle>{labels.import_successful}</AlertTitle>
                    <AlertDescription>
                      {labels.import_successful_description}
                      {result.result && (
                        <pre className="mt-2 text-xs p-2 bg-secondary text-secondary-foreground overflow-auto max-h-48 border-2 border-border">
                          {JSON.stringify(result.result as Record<string, unknown>, null, 2)}
                        </pre>
                      )}
                      <p className="mt-2 text-xs text-success">{safetyLabels.importSuccessSnapshot}</p>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>{labels.import_failed}</AlertTitle>
                    <AlertDescription>
                      {labels.import_failed_description}
                      {result.result && (
                        <pre className="mt-2 text-xs p-2 bg-secondary text-secondary-foreground overflow-auto max-h-48 border-2 border-border">
                          {JSON.stringify(result.result as Record<string, unknown>, null, 2)}
                        </pre>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                <Button onClick={() => router.push('/dashboard')} className="w-full">{labels.done}</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
