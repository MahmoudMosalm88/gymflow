'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

// --- Step indicator: three circles connected by lines ---
function StepIndicator({ current }: { current: number }) {
  const steps = [1, 2, 3];
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          {/* Circle */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
              ${s <= current
                ? 'bg-[#FF8C00] text-white'            /* completed or current */
                : 'bg-gray-700 text-gray-400'           /* pending */
              }`}
          >
            {s}
          </div>
          {/* Connecting line (skip after last) */}
          {i < steps.length - 1 && (
            <div
              className={`w-16 h-1 ${s < current ? 'bg-[#FF8C00]' : 'bg-gray-700'}`}
            />
          )}
        </div>
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
    if (!file) { setError('Please select a .json file.'); return; }

    setUploading(true);
    try {
      // Read and parse the JSON file
      const text = await file.text();
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        setError('File is not valid JSON.');
        setUploading(false);
        return;
      }

      // Upload to API
      const res = await api.post<UploadResult>('/api/migration/upload', {
        fileName: file.name,
        payload,
      });

      if (!res.success || !res.data) {
        setError(res.message || 'Upload failed.');
        setUploading(false);
        return;
      }

      setArtifactId(res.data.id);
      setStep(2); // advance to validation
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
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
          setError(res.message || 'Validation failed.');
        } else {
          setValidation(res.data);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Validation failed.');
      } finally {
        if (!cancelled) setValidating(false);
      }
    }

    validate();
    return () => { cancelled = true; };
  }, [step, artifactId]);

  // --- Step 3: Execute import ---
  async function handleExecute() {
    setShowConfirm(false);
    setExecuting(true);
    setError('');
    try {
      const res = await api.post<ExecuteResult>('/api/migration/execute', { artifactId });
      if (!res.success || !res.data) {
        setError(res.message || 'Execution failed.');
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
      setError(e instanceof Error ? e.message : 'Execution failed.');
      setExecuting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Page title */}
      <h1 className="text-2xl font-bold text-[#f3f6ff] mb-2">{labels.import}</h1>
      <p className="text-gray-400 mb-8 text-sm">
        {lang === 'ar' ? 'استيراد بيانات من ملف JSON' : 'Import data from a JSON file'}
      </p>

      <StepIndicator current={step} />

      {/* Error banner */}
      {error && (
        <div className="bg-red-900/40 border border-red-500/50 text-red-300 rounded-lg px-4 py-3 mb-6 text-sm">
          {error}
        </div>
      )}

      {/* ============ STEP 1: Upload ============ */}
      {step === 1 && (
        <div className="bg-[#111827] rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold text-[#f3f6ff] mb-4">
            {lang === 'ar' ? 'رفع الملف' : 'Upload File'}
          </h2>

          {/* File input */}
          <label className="block mb-4">
            <span className="text-gray-400 text-sm mb-1 block">
              {lang === 'ar' ? 'اختر ملف .json' : 'Select a .json file'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
              className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0 file:bg-[#FF8C00] file:text-white file:font-medium
                file:cursor-pointer hover:file:bg-[#e07b00] cursor-pointer"
            />
          </label>

          {fileName && (
            <p className="text-gray-400 text-sm mb-4">{fileName}</p>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || !fileName}
            className="bg-[#FF8C00] hover:bg-[#e07b00] disabled:opacity-40 disabled:cursor-not-allowed
              text-white font-medium rounded-lg px-6 py-2.5 text-sm transition-colors"
          >
            {uploading
              ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...')
              : (lang === 'ar' ? 'رفع' : 'Upload')}
          </button>
        </div>
      )}

      {/* ============ STEP 2: Validate ============ */}
      {step === 2 && (
        <div className="bg-[#111827] rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold text-[#f3f6ff] mb-4">
            {lang === 'ar' ? 'التحقق من البيانات' : 'Validation'}
          </h2>

          {validating && <LoadingSpinner />}

          {!validating && validation && (
            <div className="space-y-3 mb-6">
              <Row label={lang === 'ar' ? 'إصدار المخطط' : 'Schema Version'} value={validation.schemaVersion} />
              <Row label={lang === 'ar' ? 'الأعضاء' : 'Members'} value={String(validation.members)} />
              <Row label={lang === 'ar' ? 'الاشتراكات' : 'Subscriptions'} value={String(validation.subscriptions)} />
              <Row
                label={labels.status}
                value={validation.isValid
                  ? (lang === 'ar' ? 'صالح ✓' : 'Valid ✓')
                  : (lang === 'ar' ? 'غير صالح ✗' : 'Invalid ✗')}
                color={validation.isValid ? 'text-green-400' : 'text-red-400'}
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setStep(1); setValidation(null); setError(''); }}
              className="border border-gray-600 text-gray-300 hover:bg-gray-800
                rounded-lg px-5 py-2.5 text-sm transition-colors"
            >
              {labels.back}
            </button>
            {validation?.isValid && (
              <button
                onClick={() => setStep(3)}
                className="bg-[#FF8C00] hover:bg-[#e07b00] text-white font-medium
                  rounded-lg px-6 py-2.5 text-sm transition-colors"
              >
                {lang === 'ar' ? 'متابعة' : 'Continue'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============ STEP 3: Execute ============ */}
      {step === 3 && (
        <div className="bg-[#111827] rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold text-[#f3f6ff] mb-4">
            {lang === 'ar' ? 'تنفيذ الاستيراد' : 'Execute Import'}
          </h2>

          {/* Before execution: confirm dialog */}
          {!executing && !result && !showConfirm && (
            <>
              <p className="text-gray-400 text-sm mb-6">
                {lang === 'ar'
                  ? 'عند التنفيذ سيتم استبدال البيانات الحالية. هل أنت متأكد؟'
                  : 'This will replace all existing data. Are you sure you want to proceed?'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(2); setError(''); }}
                  className="border border-gray-600 text-gray-300 hover:bg-gray-800
                    rounded-lg px-5 py-2.5 text-sm transition-colors"
                >
                  {labels.back}
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  className="bg-[#FF8C00] hover:bg-[#e07b00] text-white font-medium
                    rounded-lg px-6 py-2.5 text-sm transition-colors"
                >
                  {lang === 'ar' ? 'تنفيذ الاستيراد' : 'Execute Import'}
                </button>
              </div>
            </>
          )}

          {/* Confirmation overlay */}
          {showConfirm && (
            <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-4 mb-4">
              <p className="text-red-300 text-sm font-medium mb-4">
                {lang === 'ar'
                  ? '⚠ تحذير: سيتم استبدال جميع البيانات الحالية. لا يمكن التراجع.'
                  : '⚠ Warning: All existing data will be replaced. This cannot be undone.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="border border-gray-600 text-gray-300 hover:bg-gray-800
                    rounded-lg px-5 py-2.5 text-sm transition-colors"
                >
                  {labels.cancel}
                </button>
                <button
                  onClick={handleExecute}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium
                    rounded-lg px-6 py-2.5 text-sm transition-colors"
                >
                  {labels.confirm}
                </button>
              </div>
            </div>
          )}

          {/* Executing spinner */}
          {executing && <LoadingSpinner />}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              {result.status === 'completed' ? (
                <div className="bg-green-900/30 border border-green-500/40 rounded-lg p-4">
                  <p className="text-green-400 font-medium mb-2">
                    {lang === 'ar' ? 'تم الاستيراد بنجاح' : 'Import completed successfully'}
                  </p>
                  {result.result && (
                    <pre className="text-gray-300 text-xs overflow-auto max-h-48">
                      {JSON.stringify(result.result as Record<string, unknown>, null, 2)}
                    </pre>
                  )}
                </div>
              ) : (
                <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-4">
                  <p className="text-red-400 font-medium">
                    {lang === 'ar' ? 'فشل الاستيراد' : 'Import failed'}
                  </p>
                </div>
              )}

              <button
                onClick={() => { window.location.href = '/dashboard'; }}
                className="bg-[#FF8C00] hover:bg-[#e07b00] text-white font-medium
                  rounded-lg px-6 py-2.5 text-sm transition-colors"
              >
                {lang === 'ar' ? 'تم' : 'Done'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Small helper for validation rows ---
function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-sm font-medium ${color || 'text-[#f3f6ff]'}`}>{value}</span>
    </div>
  );
}
