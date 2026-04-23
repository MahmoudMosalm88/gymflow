'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, FileSpreadsheet, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type {
  ImportExecuteResponse,
  ImportMapping,
  ImportPreviewResponse,
  ImportPreviewSummary,
  ImportUploadResponse,
} from '@/lib/imports';

type MappingState = ImportMapping;

// ─── Field config ─────────────────────────────────────────────────────────────

const NONE = '__none__';

const REQUIRED_FIELDS: Array<{ key: keyof MappingState; label: { en: string; ar: string } }> = [
  { key: 'member_name', label: { en: 'Client name', ar: 'اسم العميل' } },
  { key: 'phone', label: { en: 'Phone number', ar: 'رقم الهاتف' } },
];

const OPTIONAL_FIELDS: Array<{ key: keyof MappingState; label: { en: string; ar: string } }> = [
  { key: 'gender', label: { en: 'Gender', ar: 'النوع' } },
  { key: 'joined_at', label: { en: 'Join date', ar: 'تاريخ الانضمام' } },
  { key: 'date_of_birth', label: { en: 'Date of birth', ar: 'تاريخ الميلاد' } },
  { key: 'card_code', label: { en: 'Card / ID code', ar: 'كود الكارت' } },
  { key: 'subscription_start', label: { en: 'Subscription start', ar: 'بداية الاشتراك' } },
  { key: 'subscription_end', label: { en: 'Subscription end', ar: 'نهاية الاشتراك' } },
  { key: 'plan_months', label: { en: 'Plan duration (months)', ar: 'مدة الخطة (شهور)' } },
  { key: 'sessions_per_month', label: { en: 'Sessions per month', ar: 'الجلسات شهرياً' } },
  { key: 'amount_paid', label: { en: 'Amount paid', ar: 'المبلغ المدفوع' } },
  { key: 'notes', label: { en: 'Notes', ar: 'ملاحظات' } },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[_\-\s]+/g, ' ').trim();
}

function setField(current: MappingState, key: keyof MappingState, value?: string): MappingState {
  const next = value ?? (key === 'member_name' || key === 'phone' ? '' : undefined);
  return { ...current, [key]: next } as MappingState;
}

function suggestMapping(headers: string[]): MappingState {
  const aliases: Record<keyof MappingState, string[]> = {
    member_name: ['name', 'member name', 'full name', 'client name'],
    phone: ['phone', 'mobile', 'whatsapp', 'phone number'],
    gender: ['gender', 'sex', 'type'],
    joined_at: ['join date', 'joined at', 'created at', 'start date'],
    date_of_birth: ['dob', 'birth date', 'date of birth'],
    notes: ['notes', 'note', 'remarks'],
    card_code: ['card code', 'card', 'member id', 'qr code'],
    subscription_start: ['subscription start', 'plan start', 'start'],
    subscription_end: ['subscription end', 'plan end', 'expiry', 'end'],
    plan_months: ['plan months', 'months', 'duration'],
    sessions_per_month: ['sessions per month', 'sessions', 'quota'],
    amount_paid: ['amount paid', 'paid', 'price', 'amount'],
  };

  const byNormalized = new Map(headers.map((h) => [normalizeHeader(h), h]));
  let result: MappingState = { member_name: '', phone: '' };

  for (const field of [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]) {
    const match = aliases[field.key].find((a) => byNormalized.has(a));
    if (!match) continue;
    const header = byNormalized.get(match);
    if (header) result = { ...result, [field.key]: header };
  }

  return result;
}

// ─── Copy ─────────────────────────────────────────────────────────────────────

const copy = {
  en: {
    confirmTitle: (n: number) => `Add ${n} clients to GymFlow?`,
    confirmBody: 'Your existing clients are safe. You can edit or remove any client individually after import.',
    cancel: 'Cancel',
    step1Title: "Let's bring your clients in.",
    step1Sub: "Your file is never changed. You'll review before anything is added.",
    dropHint: 'Drop your file here, or',
    browse: 'choose a file',
    accept: 'Excel or CSV',
    template: 'Download a blank template',
    skipLink: "I'll add clients manually",
    uploading: 'Uploading...',
    uploadBtn: 'Upload file',
    step2Title: 'Which column is which?',
    step2Sub: "We've matched your columns — fix anything that looks off.",
    required: 'Required',
    moreFields: 'More fields (optional)',
    hideFields: 'Hide extra fields',
    importOptions: 'Import options',
    dateFormatLabel: 'Date format in your file',
    genderDefault: 'Default gender',
    continueBtn: 'Looks good, continue →',
    previewing: 'Checking your file...',
    back: '← Back',
    step3Title: "Here's what we'll add.",
    step3Sub: 'Review the numbers, then import.',
    membersReady: 'clients ready',
    subscriptions: 'subscriptions',
    duplicatesSkipped: 'duplicates skipped',
    needAttention: 'need attention',
    welcomeEmail: 'Send a welcome email to clients',
    welcomeEmailHint: 'Clients get an email to set their password.',
    importBtn: (n: number) => `Add ${n} clients to GymFlow`,
    importing: 'Adding your clients...',
    step4Title: 'Your gym is ready.',
    step4Sub: (n: number) => `${n} clients are waiting for you.`,
    membersAdded: 'clients added',
    skipped: 'duplicates skipped',
    failed: 'failed',
    failedRowsMsg: (n: number) => `${n} ${n === 1 ? 'row' : 'rows'} had issues — download the error report to fix and re-upload.`,
    downloadErrors: 'Download error report',
    importedAt: (d: Date) => `Imported ${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(d)}`,
    whatsNext: "What's next",
    check1: 'Check that your clients look right',
    check2: 'Connect WhatsApp when you\'re ready',
    check2note: 'optional',
    finishBtn: 'Meet your clients →',
    finishing: 'One moment...',
    male: 'Male',
    female: 'Female',
    noImport: "Don't import",
    yourColumn: 'Your column',
    removeFile: 'Remove',
    errNamePhone: 'Member name and phone are required.',
    errUploadFail: 'Upload failed. Please try again.',
    errPreviewFail: 'Could not check your file. Please try again.',
    errImportFail: 'Import failed. Please try again.',
  },
  ar: {
    confirmTitle: (n: number) => `إضافة ${n} عميل إلى GymFlow؟`,
    confirmBody: 'عملاؤك الحاليون في أمان. يمكنك تعديل أو حذف أي عميل بشكل فردي بعد الاستيراد.',
    cancel: 'إلغاء',
    step1Title: 'لنجلب عملاءك.',
    step1Sub: 'ملفك لن يتغير. ستراجع كل شيء قبل أي إضافة.',
    dropHint: 'أسقط الملف هنا، أو',
    browse: 'اختر ملفاً',
    accept: 'Excel أو CSV',
    template: 'تحميل قالب فارغ',
    skipLink: 'سأضيف العملاء يدوياً',
    uploading: 'جاري الرفع...',
    uploadBtn: 'رفع الملف',
    step2Title: 'أي عمود هو ماذا؟',
    step2Sub: 'طابقنا أعمدتك — صحّح أي شيء يبدو خاطئاً.',
    required: 'مطلوب',
    moreFields: 'حقول إضافية (اختيارية)',
    hideFields: 'إخفاء الحقول الإضافية',
    importOptions: 'خيارات الاستيراد',
    dateFormatLabel: 'صيغة التاريخ في ملفك',
    genderDefault: 'النوع الافتراضي',
    continueBtn: 'يبدو صحيحاً، تابع ←',
    previewing: 'جاري التحقق من الملف...',
    back: '→ رجوع',
    step3Title: 'هذا ما سنضيفه.',
    step3Sub: 'راجع الأرقام ثم ابدأ الاستيراد.',
    membersReady: 'عميل جاهز',
    subscriptions: 'اشتراكات',
    duplicatesSkipped: 'مكرر متجاوز',
    needAttention: 'تحتاج مراجعة',
    welcomeEmail: 'أرسل بريداً ترحيبياً للعملاء',
    welcomeEmailHint: 'يستقبل العملاء بريداً لتفعيل حسابهم.',
    importBtn: (n: number) => `أضف ${n} عميلاً إلى GymFlow`,
    importing: 'جاري إضافة العملاء...',
    step4Title: 'جيمك جاهز.',
    step4Sub: (n: number) => `${n} عميل في انتظارك.`,
    membersAdded: 'عميل أُضيف',
    skipped: 'مكرر متجاوز',
    failed: 'فشل',
    failedRowsMsg: (n: number) => `${n} صف بها مشاكل — حمّل تقرير الأخطاء للتصحيح وإعادة الرفع.`,
    downloadErrors: 'تحميل تقرير الأخطاء',
    importedAt: (d: Date) => `تم الاستيراد في ${new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(d)}`,
    whatsNext: 'التالي',
    check1: 'تحقق أن بيانات العملاء صحيحة',
    check2: 'وصّل واتساب عندما تكون جاهزاً',
    check2note: 'اختياري',
    finishBtn: 'تعرف على عملاءك ←',
    finishing: 'لحظة...',
    male: 'ذكر',
    female: 'أنثى',
    noImport: 'لا تستورد',
    yourColumn: 'عمودك',
    removeFile: 'حذف',
    errNamePhone: 'اسم العميل ورقم الهاتف مطلوبان.',
    errUploadFail: 'فشل الرفع. حاول مجدداً.',
    errPreviewFail: 'تعذر التحقق من الملف. حاول مجدداً.',
    errImportFail: 'فشل الاستيراد. حاول مجدداً.',
  },
} as const;

// ─── Constants ────────────────────────────────────────────────────────────────

const WIZARD_STEPS = [
  { en: 'Map columns', ar: 'تطابق الأعمدة' },
  { en: 'Review', ar: 'مراجعة' },
  { en: 'Import', ar: 'استيراد' },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const { lang } = useLang();
  const L = copy[lang];
  const router = useRouter();

  // Step: 1=upload, 2=map, 3=review, 4=done
  const [step, setStep] = useState(1);
  const [fading, setFading] = useState(false);

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Data
  const [artifact, setArtifact] = useState<ImportUploadResponse | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({ member_name: '', phone: '' });
  const [genderDefault, setGenderDefault] = useState<'male' | 'female'>('male');
  const [dateFormat, setDateFormat] = useState<'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'>('DD/MM/YYYY');
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  // Preview
  const [previewing, setPreviewing] = useState(false);
  const [previewSummary, setPreviewSummary] = useState<ImportPreviewSummary | null>(null);

  // Execute
  const [executing, setExecuting] = useState(false);
  const [execution, setExecution] = useState<ImportExecuteResponse | null>(null);

  // Confirm modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Done
  const [finishing, setFinishing] = useState(false);
  const [importTimestamp, setImportTimestamp] = useState<Date | null>(null);
  const [step4Visible, setStep4Visible] = useState(false);

  useEffect(() => {
    if (step === 4) {
      const t = setTimeout(() => setStep4Visible(true), 80);
      return () => clearTimeout(t);
    } else {
      setStep4Visible(false);
    }
  }, [step]);

  // ── Navigation ──

  function navigate(to: number) {
    setFading(true);
    setTimeout(() => {
      setStep(to);
      setFading(false);
    }, 150);
  }

  // ── Handlers ──

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.postFormData<ImportUploadResponse>('/api/imports/upload', formData);
      if (!res.success || !res.data) {
        toast.error(res.message || L.errUploadFail);
        return;
      }
      setArtifact(res.data);
      setMapping(suggestMapping(res.data.headers));
      navigate(2);
    } finally {
      setUploading(false);
    }
  }

  async function handleContinueFromMap() {
    if (!artifact) return;
    if (!mapping.member_name || !mapping.phone) {
      toast.error(L.errNamePhone);
      return;
    }
    setPreviewing(true);
    try {
      const res = await api.post<ImportPreviewResponse>('/api/imports/preview', {
        artifactId: artifact.id,
        mapping,
        defaults: {
          gender_default: mapping.gender ? undefined : genderDefault,
          duplicate_mode: 'skip_duplicates',
        },
      });
      if (!res.success || !res.data) {
        toast.error(res.message || L.errPreviewFail);
        return;
      }
      setPreviewSummary(res.data.summary);
      navigate(3);
    } finally {
      setPreviewing(false);
    }
  }

  function handleImport() {
    if (!artifact || !previewSummary) return;
    setShowConfirmModal(true);
  }

  async function handleConfirmImport() {
    if (!artifact || !previewSummary) return;
    setShowConfirmModal(false);
    setExecuting(true);
    try {
      const res = await api.post<ImportExecuteResponse>('/api/imports/execute', {
        artifactId: artifact.id,
        duplicate_mode: 'skip_duplicates',
        suppressImportedAutomations: true,
        dateFormat,
        sendWelcomeEmail,
      });
      if (!res.success || !res.data) {
        toast.error(res.message || L.errImportFail);
        return;
      }
      setExecution(res.data);
      setImportTimestamp(new Date());
      navigate(4);
    } finally {
      setExecuting(false);
    }
  }

  async function handleStartFresh() {
    try {
      await api.put('/api/settings', {
        values: {
          onboarding_completed: true,
          onboarding_mode: 'start_fresh',
          onboarding_completed_at: new Date().toISOString(),
        },
      });
    } catch {
      // Non-blocking — redirect regardless
    }
    router.push('/dashboard/members/new');
  }

  async function handleFinish() {
    setFinishing(true);
    try {
      await api.put('/api/settings', {
        values: {
          onboarding_completed: true,
          onboarding_mode: 'spreadsheet_import',
          onboarding_completed_at: new Date().toISOString(),
        },
      });
    } catch {
      // Non-blocking — redirect regardless
    }
    router.push('/dashboard/members');
  }

  function handleDownloadErrors() {
    if (!execution) return;
    const link = document.createElement('a');
    link.href = `/api/imports/${execution.artifactId}/errors`;
    link.download = 'gymflow-import-errors.csv';
    link.rel = 'noopener';
    link.click();
  }

  function handleDownloadTemplate() {
    const link = document.createElement('a');
    link.href = '/api/imports/template';
    link.download = 'gymflow-import-template.xlsx';
    link.rel = 'noopener';
    link.click();
  }

  // ── Computed ──

  const canImport = Boolean(previewSummary && previewSummary.estimatedMembersToCreate > 0) && !executing;

  // Wizard step 2 → activeStep 0, step 3 → 1, step 4 → 2
  const activeStep = step >= 2 ? step - 2 : -1;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes gf-drift-a {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-22px) rotate(6deg); }
        }
        @keyframes gf-drift-b {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-16px) rotate(-7deg); }
        }
        @keyframes gf-drift-c {
          0%, 100% { transform: translateY(0px) rotate(45deg); }
          50% { transform: translateY(-18px) rotate(54deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gf-deco { animation: none !important; }
        }
      `}</style>

      <div
        className={cn(
          'relative min-h-screen overflow-hidden transition-colors duration-500',
          step === 1 ? 'bg-[#0a0a0a]' : 'bg-background'
        )}
        style={step === 1 ? {
          backgroundImage: 'radial-gradient(#1d1d1d 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        } : undefined}
      >
        {/* Step 1 decorative layer */}
        {step === 1 && (
          <>
            <div aria-hidden="true" className="gf-deco pointer-events-none select-none absolute top-[7%] left-[5%] h-36 w-36 border border-white/[0.06]" style={{ animation: 'gf-drift-a 11s ease-in-out infinite' }} />
            <div aria-hidden="true" className="gf-deco pointer-events-none select-none absolute top-[38%] right-[4%] h-20 w-14 border border-white/[0.04]" style={{ animation: 'gf-drift-b 14s ease-in-out infinite 1.5s' }} />
            <div aria-hidden="true" className="gf-deco pointer-events-none select-none absolute bottom-[18%] left-[8%] h-12 w-12 bg-destructive/[0.12]" style={{ animation: 'gf-drift-c 9s ease-in-out infinite 3s' }} />
            <div aria-hidden="true" className="gf-deco pointer-events-none select-none absolute top-[22%] right-[22%] h-6 w-6 bg-destructive/[0.18]" style={{ animation: 'gf-drift-a 7s ease-in-out infinite 0.8s' }} />
            <div aria-hidden="true" className="gf-deco pointer-events-none select-none absolute bottom-[30%] right-[8%] h-8 w-20 border border-white/[0.03]" style={{ animation: 'gf-drift-b 12s ease-in-out infinite 2s' }} />
            {/* GF watermark — design system */}
            <div
              aria-hidden="true"
              className="pointer-events-none select-none absolute -bottom-16 -right-10 font-black leading-none"
              style={{ fontSize: '22rem', fontWeight: 900, color: '#e63946', opacity: 0.045, letterSpacing: '-0.04em' }}
            >
              GF
            </div>
          </>
        )}

        <div
          className={cn(
            'relative flex min-h-screen flex-col items-center justify-center px-6 py-16 transition-opacity duration-150',
            fading && 'opacity-0'
          )}
        >

      {/* Confirmation modal */}
      {showConfirmModal && previewSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowConfirmModal(false)}
          />
          <div
            className="relative w-full max-w-sm bg-background border-2 border-border"
            style={{ boxShadow: '6px 6px 0 #1a1a1a' }}
          >
            <div className="h-1 bg-destructive" />
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-heading font-bold tracking-tight">
                {L.confirmTitle(previewSummary.estimatedMembersToCreate)}
              </h2>
              <p className="text-sm text-muted-foreground">{L.confirmBody}</p>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={handleConfirmImport}
                  disabled={executing}
                  className="w-full"
                >
                  {executing ? L.importing : L.importBtn(previewSummary.estimatedMembersToCreate)}
                </Button>
                <button
                  type="button"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border-2 border-border"
                >
                  {L.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-lg">

        {/* GymFlow wordmark — step 1 only */}
        {step === 1 && (
          <div className="mb-12 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center bg-destructive shrink-0">
              <span className="font-heading text-white leading-none" style={{ fontSize: '28px', letterSpacing: '3px', fontWeight: 900 }}>GF</span>
            </div>
            <span className="font-heading font-black text-white tracking-tight" style={{ fontSize: '2rem', letterSpacing: '-0.02em' }}>GymFlow</span>
          </div>
        )}

        {/* Horizontal stepper — step 2 onward */}
        {step >= 2 && (
          <nav
            role="navigation"
            aria-label={lang === 'ar' ? 'خطوات الاستيراد' : 'Import steps'}
            className="mb-10"
          >
            <ol className="flex items-start">
              {WIZARD_STEPS.map((s, i) => {
                const isComplete = i < activeStep;
                const isCurrent = i === activeStep;
                return (
                  <li
                    key={i}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={`${lang === 'ar' ? 'الخطوة' : 'Step'} ${i + 1} ${lang === 'ar' ? 'من' : 'of'} 3: ${s[lang]}${isComplete ? (lang === 'ar' ? ' — مكتمل' : ' — completed') : ''}`}
                    className={cn('flex items-start', i < WIZARD_STEPS.length - 1 && 'flex-1')}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center text-sm font-bold transition-colors',
                          isComplete
                            ? 'bg-destructive text-white'
                            : isCurrent
                            ? 'border-2 border-destructive text-destructive'
                            : 'border-2 border-border text-muted-foreground'
                        )}
                      >
                        {isComplete ? <Check className="h-4 w-4" /> : <span>{i + 1}</span>}
                      </div>
                      <span
                        className={cn(
                          'mt-1.5 text-xs text-center leading-tight w-16',
                          isComplete
                            ? 'text-muted-foreground'
                            : isCurrent
                            ? 'text-foreground font-medium'
                            : 'text-muted-foreground/40'
                        )}
                      >
                        {s[lang]}
                      </span>
                    </div>
                    {i < WIZARD_STEPS.length - 1 && (
                      <div
                        className={cn(
                          'flex-1 h-px mt-4 mx-2 transition-colors',
                          isComplete ? 'bg-destructive' : 'bg-border'
                        )}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {/* ── Step 1: Upload ─────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-heading font-bold tracking-tight text-white">{L.step1Title}</h1>
              <p className="mt-2 text-sm text-[#aaaaaa]">{L.step1Sub}</p>
            </div>

            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              aria-label={lang === 'ar' ? 'منطقة رفع الملف' : 'File upload area'}
              className={cn(
                'border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-3 py-14 px-6 text-center cursor-pointer transition-colors',
                dragging && 'border-white/40 bg-white/5',
                file && 'py-10'
              )}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) setFile(f);
              }}
              onClick={() => !file && fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            >
              {file ? (
                <>
                  <FileSpreadsheet className="h-8 w-8 text-[#888888]" />
                  <p className="text-sm font-medium text-white break-all max-w-xs">{file.name}</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="flex items-center gap-1 text-xs text-[#666666] hover:text-[#aaaaaa] transition-colors"
                  >
                    <X className="h-3 w-3" />
                    {L.removeFile}
                  </button>
                </>
              ) : (
                <>
                  <Upload className="h-7 w-7 text-[#555555]" />
                  <p className="text-sm text-[#888888]">
                    {L.dropHint}{' '}
                    <span className="text-white underline underline-offset-2">{L.browse}</span>
                  </p>
                  <p className="text-xs text-[#555555]">{L.accept}</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            {/* Upload button */}
            {file && (
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-6 text-base"
              >
                {uploading ? L.uploading : L.uploadBtn}
              </Button>
            )}

            {/* Template link */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-xs text-[#555555] hover:text-[#888888] transition-colors underline underline-offset-2"
              >
                {L.template}
              </button>
            </div>

            {/* Skip link */}
            <div className="pt-4 text-center border-t border-white/10">
              <button
                type="button"
                onClick={handleStartFresh}
                className="text-xs text-[#444444] hover:text-[#777777] transition-colors"
              >
                {L.skipLink}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Map columns ────────────────────────────────────────────── */}
        {step === 2 && artifact && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-heading font-bold tracking-tight">{L.step2Title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{L.step2Sub}</p>
            </div>

            {/* Column mapping */}
            <div className="space-y-0 divide-y divide-border border border-border">
              {REQUIRED_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-foreground truncate">{field.label[lang]}</span>
                    <span className="shrink-0 text-xs text-destructive font-medium">{L.required}</span>
                  </div>
                  <Select
                    value={mapping[field.key] || NONE}
                    onValueChange={(v) => setMapping(setField(mapping, field.key, v === NONE ? undefined : v))}
                  >
                    <SelectTrigger className="w-40 shrink-0">
                      <SelectValue placeholder={L.yourColumn} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{L.noImport}</SelectItem>
                      {artifact.headers.map((h) => (
                        <SelectItem key={`${field.key}-${h}`} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Import options */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {L.importOptions}
              </p>
              <div className="space-y-0 divide-y divide-border border border-border">
                {/* Date format */}
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="text-sm text-foreground truncate">{L.dateFormatLabel}</span>
                  <Select value={dateFormat} onValueChange={(v: typeof dateFormat) => setDateFormat(v)}>
                    <SelectTrigger className="w-40 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Gender default (if gender not mapped) */}
                {!mapping.gender && (
                  <div className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="text-sm text-foreground truncate">{L.genderDefault}</span>
                    <Select value={genderDefault} onValueChange={(v: 'male' | 'female') => setGenderDefault(v)}>
                      <SelectTrigger className="w-40 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{L.male}</SelectItem>
                        <SelectItem value="female">{L.female}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Optional fields */}
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showOptional ? L.hideFields : L.moreFields}
            </button>

            {showOptional && (
              <div className="space-y-0 divide-y divide-border border border-border">
                {OPTIONAL_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="text-sm text-muted-foreground truncate">{field.label[lang]}</span>
                    <Select
                      value={mapping[field.key] || NONE}
                      onValueChange={(v) => setMapping(setField(mapping, field.key, v === NONE ? undefined : v))}
                    >
                      <SelectTrigger className="w-40 shrink-0">
                        <SelectValue placeholder={L.noImport} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>{L.noImport}</SelectItem>
                        {artifact.headers.map((h) => (
                          <SelectItem key={`${field.key}-${h}`} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleContinueFromMap}
              disabled={previewing || !mapping.member_name || !mapping.phone}
              className="w-full py-6 text-base"
            >
              {previewing ? L.previewing : L.continueBtn}
            </Button>

            <button
              type="button"
              onClick={() => navigate(1)}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {L.back}
            </button>
          </div>
        )}

        {/* ── Step 3: Review ────────────────────────────────────────────────── */}
        {step === 3 && previewSummary && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-heading font-bold tracking-tight">{L.step3Title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{L.step3Sub}</p>
            </div>

            {/* Primary stat */}
            <div className="py-4">
              <p className="font-stat tracking-wide text-8xl tabular-nums text-foreground leading-none">
                {previewSummary.estimatedMembersToCreate}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{L.membersReady}</p>
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-3 divide-x divide-border border border-border">
              <div className="px-4 py-3 text-center">
                <p className="font-stat tracking-wide text-2xl tabular-nums">
                  {previewSummary.estimatedSubscriptionsToCreate}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{L.subscriptions}</p>
              </div>
              <div className="px-4 py-3 text-center">
                <p className="font-stat tracking-wide text-2xl tabular-nums">
                  {previewSummary.duplicateRows}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{L.duplicatesSkipped}</p>
              </div>
              <div className="px-4 py-3 text-center">
                <p className={cn('font-stat tracking-wide text-2xl tabular-nums', previewSummary.warningRows > 0 && 'text-warning')}>
                  {previewSummary.warningRows}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{L.needAttention}</p>
              </div>
            </div>

            {/* Welcome email */}
            <div className="flex items-start gap-3 border border-border p-4">
              <Checkbox
                id="wizard-welcome-email"
                checked={sendWelcomeEmail}
                onCheckedChange={(c) => setSendWelcomeEmail(Boolean(c))}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="wizard-welcome-email" className="cursor-pointer font-normal">
                  {L.welcomeEmail}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">{L.welcomeEmailHint}</p>
              </div>
            </div>

            <Button
              onClick={handleImport}
              disabled={!canImport}
              className="w-full py-6 text-base"
            >
              {executing ? L.importing : L.importBtn(previewSummary.estimatedMembersToCreate)}
            </Button>

            <button
              type="button"
              onClick={() => navigate(2)}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {L.back}
            </button>
          </div>
        )}

        {/* ── Step 4: Done ──────────────────────────────────────────────────── */}
        {step === 4 && execution && (
          <div
            className={cn(
              'space-y-6 transition-all duration-500 ease-out',
              step4Visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            )}
          >
            {/* Success mark */}
            <div className="flex h-20 w-20 items-center justify-center bg-destructive">
              <Check className="h-10 w-10 text-white" />
            </div>

            <div>
              <h1 className="text-3xl font-heading font-bold tracking-tight">{L.step4Title}</h1>
              <p className="mt-2 text-muted-foreground">{L.step4Sub(execution.importedMembers)}</p>
            </div>

            {/* Stats summary row */}
            <div className="grid grid-cols-3 divide-x divide-border border border-border">
              <div className="px-4 py-3 text-center">
                <p className="font-stat tracking-wide text-2xl tabular-nums text-foreground">
                  {execution.importedMembers}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{L.membersAdded}</p>
              </div>
              <div className="px-4 py-3 text-center">
                <p className="font-stat tracking-wide text-2xl tabular-nums">
                  {execution.skippedRows}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{L.skipped}</p>
              </div>
              <div className="px-4 py-3 text-center">
                <p className={cn('font-stat tracking-wide text-2xl tabular-nums', execution.failedRows > 0 && 'text-warning')}>
                  {execution.failedRows}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{L.failed}</p>
              </div>
            </div>

            {/* Failed row recovery */}
            {execution.failedRows > 0 && (
              <div className="border-2 border-border p-4 space-y-2">
                <p className="text-sm text-foreground">{L.failedRowsMsg(execution.failedRows)}</p>
                <button
                  type="button"
                  onClick={handleDownloadErrors}
                  className="text-xs text-foreground underline underline-offset-2 hover:text-muted-foreground transition-colors"
                >
                  {L.downloadErrors}
                </button>
              </div>
            )}

            {/* Timestamp */}
            {importTimestamp && (
              <p className="text-xs text-muted-foreground">{L.importedAt(importTimestamp)}</p>
            )}

            {/* What's next */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {L.whatsNext}
              </p>
              <div className="space-y-0 divide-y divide-border border border-border">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Check className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm">{L.check1}</span>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Check className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm">{L.check2}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">({L.check2note})</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleFinish}
              disabled={finishing}
              className="w-full py-6 text-base"
            >
              {finishing ? L.finishing : L.finishBtn}
            </Button>
          </div>
        )}
      </div>
        </div>
      </div>
    </>
  );
}
