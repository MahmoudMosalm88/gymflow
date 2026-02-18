'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Check, CircleDotIcon, CircleDashedIcon } from 'lucide-react'; // Icons for Alert and steps
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';


// --- Step indicator: three circles connected by lines ---
function StepIndicator({ current }: { current: number }) {
  const { lang } = useLang();
  const steps = [
    { num: 1, label: t[lang].upload_file },
    { num: 2, label: t[lang].validate_data },
    { num: 3, label: t[lang].execute_import },
  ];

  return (
    <div className="flex items-center justify-center gap-2 mb-10 text-sm md:text-base">
      {steps.map((step, i) => (
        <React.Fragment key={step.num}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-bold border-2 border-[#2a2a2a]",
                step.num <= current
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {step.num}
            </div>
            <span className={cn(
                "text-xs md:text-sm mt-1",
                step.num <= current ? "text-foreground" : "text-muted-foreground"
            )}>
                {step.label}
            </span>
          </div>
          {/* Connecting line (skip after last) */}
          {i < steps.length - 1 && (
            <Separator
              orientation="horizontal"
              className={cn(
                "w-12 md:w-16 h-0.5",
                step.num < current ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// --- Types for API responses ---
type UploadResult = { id: string; file_name: string; status: string; created_at: string };
type ValidateResult = { schemaVersion: string; members: number; subscriptions: number; isValid: boolean };
type ExecuteResult = { jobId: string; status: string; report: Record<string, unknown> };
type StatusResult = { id: string; type: string; status: string; payload: Record<string, unknown>; result: Record<string, unknown> | null; started_at: string; finished_at: string };


export default function ImportPage() {
  const { lang } = useLang();
  const labels = t[lang];

  // Wizard state
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  // Step 1 state
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [artifactId, setArtifactId] = useState('');

  // Step 2 state
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidateResult | null>(null);

  // Step 3 state
  const [showConfirm, setShowConfirm] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<StatusResult | null>(null);

  // --- Step 1: Upload handler ---
  async function handleUpload() {
    setError('');
    const file = fileRef.current?.files?.[0];
    if (!file) { setError(labels.select_db_file); return; }

    setUploading(true);
    try {
      // Send the .db file as FormData (binary upload)
      const formData = new FormData();
      formData.append('file', file);

      // Use fetch directly since api client sets Content-Type to JSON
      const token = localStorage.getItem('session_token');
      const branchId = localStorage.getItem('branch_id');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (branchId) headers['x-branch-id'] = branchId;

      const response = await fetch('/api/migration/upload', {
        method: 'POST',
        headers,
        body: formData,
      });
      const res = await response.json();

      if (!res.success || !res.data) {
        setError(res.message || labels.upload_failed);
        setUploading(false);
        return;
      }

      setArtifactId(res.data.id);
      setStep(2); // advance to validation
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : labels.upload_failed);
    } finally {
      setUploading(false);
    }
  }

  // --- Step 2: Auto-validate on entering step 2 ---
  useEffect(() => {
    if (step !== 2 || !artifactId) return;
    let cancelled = false;

    async function validate() {
      setValidating(true);
      setError('');
      try {
        const res = await api.post<ValidateResult>('/api/migration/validate', { artifactId });
        if (cancelled) return;
        if (!res.success || !res.data) {
          setError(res.message || labels.validation_failed);
        } else {
          setValidation(res.data);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : labels.validation_failed);
      } finally {
        if (!cancelled) setValidating(false);
      }
    }

    validate();
    return () => { cancelled = true; };
  }, [step, artifactId, labels.validation_failed]);

  // --- Step 3: Execute import ---
  const handleExecute = useCallback(async () => {
    setShowConfirm(false);
    setExecuting(true);
    setError('');
    try {
      const res = await api.post<ExecuteResult>('/api/migration/execute', { artifactId });
      if (!res.success || !res.data) {
        setError(res.message || labels.execution_failed);
        setExecuting(false);
        return;
      }

      // Poll status until finished
      const jobId = res.data.jobId;
      const poll = async () => {
        const s = await api.get<StatusResult>(`/api/migration/status?jobId=${jobId}`);
        if (s.data && (s.data.status === 'completed' || s.data.status === 'failed')) {
          setResult(s.data);
          setExecuting(false);
        } else {
          setTimeout(poll, 2000);
        }
      };
      poll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : labels.execution_failed);
      setExecuting(false);
    }
  }, [artifactId, labels.execution_failed]);


  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Page title */}
      <h1 className="text-3xl font-bold">{labels.import_data}</h1>
      <CardDescription className="text-lg">
        {labels.import_data_description}
      </CardDescription>

      <StepIndicator current={step} />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{labels.error_title}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ============ STEP 1: Upload ============ */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>{labels.upload_file}</CardTitle>
            <CardDescription>{labels.upload_file_description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Native file input — no wrappers, guaranteed to work */}
            <input
              ref={fileRef}
              type="file"
              accept=".db"
              onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
              style={{
                display: 'block',
                width: '100%',
                padding: '16px',
                border: '2px dashed #3a3a3a',
                backgroundColor: 'transparent',
                color: '#8a8578',
                cursor: 'pointer',
              }}
            />

            <Button
              onClick={handleUpload}
              disabled={uploading || !fileName}
              className="w-full"
            >
              {uploading ? labels.uploading : labels.upload}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ============ STEP 2: Validate ============ */}
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
                <Row label={labels.schema_version} value={validation.schemaVersion} />
                <Row label={labels.members_count} value={String(validation.members)} />
                <Row label={labels.subscriptions_count} value={String(validation.subscriptions)} />
                <Row
                  label={labels.status}
                  value={validation.isValid
                    ? labels.valid + ' ✓'
                    : labels.invalid + ' ✗'}
                  color={validation.isValid ? 'text-success' : 'text-destructive'}
                />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => { setStep(1); setValidation(null); setError(''); }}
              >
                {labels.back}
              </Button>
              {validation?.isValid && (
                <Button
                  onClick={() => setStep(3)}
                >
                  {labels.continue}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ STEP 3: Execute ============ */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{labels.execute_import}</CardTitle>
            <CardDescription>{labels.execute_import_description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Before execution: confirm dialog */}
            {!executing && !result && !showConfirm && (
              <>
                <Alert variant={"warning" as any}>
                  <Terminal className="h-4 w-4" /> {/* Or a warning icon */}
                  <AlertTitle>{labels.warning_title}</AlertTitle>
                  <AlertDescription>
                    {labels.warning_replace_data}
                  </AlertDescription>
                </Alert>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => { setStep(2); setError(''); }}
                  >
                    {labels.back}
                  </Button>
                  <Button
                    onClick={() => setShowConfirm(true)}
                  >
                    {labels.execute_import_button}
                  </Button>
                </div>
              </>
            )}

            {/* Confirmation overlay */}
            {showConfirm && (
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>{labels.confirm_action}</AlertTitle>
                <AlertDescription>
                  {labels.confirm_replace_data}
                </AlertDescription>
                <div className="flex gap-3 justify-end mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirm(false)}
                  >
                    {labels.cancel}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleExecute}
                  >
                    {labels.yes_execute}
                  </Button>
                </div>
              </Alert>
            )}

            {/* Executing spinner */}
            {executing && <LoadingSpinner />}

            {/* Result */}
            {result && (
              <div className="space-y-4">
                {result.status === 'completed' ? (
                  <Alert variant={"success" as any}>
                    <Check className="h-4 w-4" />
                    <AlertTitle>{labels.import_successful}</AlertTitle>
                    <AlertDescription>
                      {labels.import_successful_description}
                      {result.result && (
                        <pre className="mt-2 text-xs p-2 bg-secondary text-secondary-foreground overflow-auto max-h-48 border-2 border-[#2a2a2a]">
                          {JSON.stringify(result.result as Record<string, unknown>, null, 2)}
                        </pre>
                      )}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>{labels.import_failed}</AlertTitle>
                    <AlertDescription>
                      {labels.import_failed_description}
                      {result.result && (
                        <pre className="mt-2 text-xs p-2 bg-secondary text-secondary-foreground overflow-auto max-h-48 border-2 border-[#2a2a2a]">
                          {JSON.stringify(result.result as Record<string, unknown>, null, 2)}
                        </pre>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={() => { window.location.href = '/dashboard'; }}
                  className="w-full"
                >
                  {labels.done}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Small helper for validation rows ---
function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center border-b border-border py-2 last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-normal text-foreground", color)}>{value}</span>
    </div>
  );
}
