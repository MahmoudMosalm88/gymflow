'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Download, FileSpreadsheet, FileUp, Rocket, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type {
  ImportExecuteResponse,
  ImportMapping,
  ImportPreviewResponse,
  ImportPreviewRowResult,
  ImportUploadResponse,
} from '@/lib/imports';

type MappingState = ImportMapping;
type PreviewRow = ImportPreviewRowResult;

type OnboardingChecklistKey =
  | 'reviewWarnings'
  | 'reviewPlans'
  | 'connectWhatsapp'
  | 'reviewReminders'
  | 'testSearchAndCheckIn'
  | 'verifySafeReminder';

type SourceMode = 'spreadsheet' | 'desktop_backup' | 'start_fresh';

type ImportOnboardingFlowProps = {
  variant?: 'import' | 'onboarding';
};

const NONE = '__none__';

const copy = {
  en: {
    title: 'Move Your Gym Into GymFlow',
    subtitle:
      'Choose your migration path, upload a spreadsheet, review exactly what will be created, then finish a controlled go-live checklist.',
    modeTitle: 'Choose how you want to start',
    modeHint:
      'Spreadsheet import is the supported v1 migration path. Desktop backup import stays in Settings because it replaces branch data.',
    modeSpreadsheet: 'Import from spreadsheet',
    modeSpreadsheetHint: 'Bring in members and one active subscription per row from CSV or XLSX.',
    modeDesktop: 'Move from GymFlow desktop backup',
    modeDesktopHint: 'Use the existing desktop backup import flow in Settings for full archive migration.',
    modeFresh: 'Start fresh',
    modeFreshHint: 'Skip import and add your first members manually.',
    goToDesktopImport: 'Open desktop import tools',
    startFreshCta: 'Add first member',
    stepSource: 'Source',
    stepUpload: 'Upload',
    stepMap: 'Match Columns',
    stepPreview: 'Preview',
    stepImport: 'Import',
    stepGoLive: 'Go Live',
    done: 'Done',
    active: 'Active',
    pending: 'Pending',
    uploadTitle: 'Upload spreadsheet',
    uploadHint:
      'Supported files: CSV and XLSX. Imported legacy members are marked safely so onboarding automations do not fire on them.',
    templateHint:
      'Use the template if your current list is messy. GymFlow will map the columns you provide and flag bad rows before anything is created.',
    templateButton: 'Download template',
    upload: 'Upload',
    uploading: 'Uploading...',
    uploadedFile: 'Uploaded file',
    totalRows: 'Total rows',
    headersDetected: 'Headers detected',
    mappingTitle: 'Match Your Columns',
    mappingHint: 'Connect your spreadsheet columns to GymFlow fields. Required fields must be matched before preview.',
    previewTitle: 'Preview the import',
    previewHint:
      'Only valid and warning rows will be imported. Duplicates are skipped conservatively by exact phone or card code match.',
    previewButton: 'Preview before importing',
    previewing: 'Previewing...',
    executeTitle: 'Confirm and import',
    executeHint:
      'Your existing members are safe — we\'ll only add what\'s new in your file. You can edit or remove any member individually after import.',
    executeButton: 'Import valid rows',
    executing: 'Importing...',
    membersToCreate: 'Members to create',
    subscriptionsToCreate: 'Subscriptions to create',
    validRows: 'Valid rows',
    warningRows: 'Warning rows',
    invalidRows: 'Invalid rows',
    duplicateRows: 'Duplicate rows',
    sampleRows: 'Rows with issues',
    row: 'Row',
    status: 'Status',
    issues: 'Issues',
    issueCsv: 'Download issues CSV',
    importComplete: 'Import completed',
    importedMembers: 'Imported members',
    importedSubscriptions: 'Imported subscriptions',
    skippedRows: 'Skipped rows',
    failedRows: 'Failed rows',
    required: 'Required',
    optional: 'Optional',
    genderDefault: 'Default gender for missing rows',
    male: 'Male',
    female: 'Female',
    sourceColumn: 'Source column',
    doNotImport: 'Do not import',
    uploadFirst: 'Upload a spreadsheet first.',
    mapGenderOrDefault: 'Map a gender column or choose a default gender.',
    successUpload: 'Spreadsheet uploaded successfully.',
    successPreview: 'Preview generated successfully.',
    successImport: 'Import completed successfully.',
    fileRequired: 'Select a CSV or XLSX file first.',
    sampleColumnsTitle: 'Template columns',
    sampleColumnsHint: 'These are the columns GymFlow understands in v1.',
    checklistTitle: 'Go-live checklist',
    checklistHint: 'Finish these checks before you switch the gym over fully.',
    checklistReviewWarnings: 'Review warning rows and confirm the missing fields are acceptable.',
    checklistReviewPlans: 'Review imported active plans and confirm the dates look correct.',
    checklistConnectWhatsapp: 'Connect WhatsApp on this branch before using live automation.',
    checklistReviewReminders: 'Review WhatsApp reminder settings and keep at least one reminder day selected.',
    checklistSearch: 'Test member search and one check-in on a safe test member.',
    checklistReminder:
      'Verify one renewal reminder on a safe test member before enabling full live automation.',
    completeOnboarding: 'Your gym is ready — go live',
    completingOnboarding: 'Saving...',
    onboardingComplete: 'Your gym is live.',
    onboardingAlreadyComplete: 'Onboarding was already completed for this branch.',
    goToDashboard: 'Meet your members',
    spreadsheetOnlyNotice:
      'Spreadsheet import is the active path here. Desktop backup import stays in Settings because it is a destructive migration tool.',
    importSafetyTitle: 'Import safety rules',
    importSafety1:
      'Legacy imported members are marked so onboarding automations do not send welcome sequences.',
    importSafety2:
      'Imported active subscriptions can still receive future renewal reminders after import.',
    importSafety3: 'Duplicates are skipped by exact phone or card code match only.',
    importSafety4: 'Imported amount_paid is kept for context but not posted as new live revenue.',
    templateDownloaded: 'Template downloaded.',
    issueDownloadFailed: 'Could not download issues CSV.',
    onboardingSaveFailed: 'Could not mark onboarding complete.',
    onboardingSaved: 'Onboarding marked complete.',
    recoveryHint: 'You can return here later. The uploaded file and preview stay tied to this branch.',
    format: 'Format',
    preImportSafetyNote: 'Your existing members are safe — we\'ll only add what\'s new in your file.',
    dateFormatLabel: 'Date format in your file',
    dateFormatHint: 'Choose the format used in your date columns (join date, subscription dates).',
    sendWelcomeEmailLabel: 'Send a welcome email to imported members',
    sendWelcomeEmailHint: 'Members will receive an email to set their password. Turn off to notify them yourself.',
    importProgress: 'Importing your members...',
    onboardingSuccessTitle: 'Your gym is ready.',
    onboardingSuccessBody: 'members are waiting for you.',
    importedAt: 'Imported on',
  },
  ar: {
    title: 'انقل الجيم إلى GymFlow',
    subtitle:
      'اختر طريقة النقل، ارفع الملف، راجع ما سيتم إنشاؤه بالضبط، ثم أنهِ قائمة التحقق قبل التشغيل الفعلي.',
    modeTitle: 'اختر طريقة البدء',
    modeHint:
      'استيراد الجداول هو مسار النقل المدعوم في النسخة الأولى. أما استيراد نسخة GymFlow Desktop فيبقى داخل الإعدادات لأنه يستبدل بيانات الفرع.',
    modeSpreadsheet: 'استيراد من ملف',
    modeSpreadsheetHint: 'استورد الأعضاء واشتراكاً نشطاً واحداً لكل صف من CSV أو XLSX.',
    modeDesktop: 'نقل من نسخة GymFlow Desktop',
    modeDesktopHint: 'استخدم أداة استيراد نسخة الديسكتوب من الإعدادات لاستيراد الأرشيف الكامل.',
    modeFresh: 'ابدأ من الصفر',
    modeFreshHint: 'تجاوز الاستيراد وابدأ بإضافة أول عضو يدوياً.',
    goToDesktopImport: 'افتح أدوات استيراد الديسكتوب',
    startFreshCta: 'أضف أول عضو',
    stepSource: 'المصدر',
    stepUpload: 'الرفع',
    stepMap: 'مطابقة الأعمدة',
    stepPreview: 'المراجعة',
    stepImport: 'الاستيراد',
    stepGoLive: 'التشغيل',
    done: 'تم',
    active: 'نشط',
    pending: 'قادم',
    uploadTitle: 'رفع ملف الاستيراد',
    uploadHint:
      'الملفات المدعومة: CSV و XLSX. الأعضاء المستوردون يتم تمييزهم كبيانات قديمة حتى لا تُرسل لهم رسائل onboarding.',
    templateHint:
      'استخدم القالب إذا كانت البيانات الحالية غير منظمة. سيقوم GymFlow بمطابقة الأعمدة وتنبيهك للصفوف الخاطئة قبل إنشاء أي سجلات.',
    templateButton: 'تحميل القالب',
    upload: 'رفع',
    uploading: 'جاري الرفع...',
    uploadedFile: 'الملف المرفوع',
    totalRows: 'إجمالي الصفوف',
    headersDetected: 'الأعمدة المكتشفة',
    mappingTitle: 'طابق أعمدتك',
    mappingHint: 'اربط أعمدة ملفك بحقول GymFlow. يجب مطابقة الحقول المطلوبة قبل المراجعة.',
    previewTitle: 'مراجعة الاستيراد',
    previewHint:
      'سيتم استيراد الصفوف الصالحة وصفوف التحذيرات فقط. الصفوف المكررة يتم تخطيها بشكل محافظ حسب الهاتف أو كود الكارت.',
    previewButton: 'معاينة قبل الاستيراد',
    previewing: 'جاري المراجعة...',
    executeTitle: 'تأكيد واستيراد',
    executeHint:
      'أعضاؤك الحاليون في أمان — سنضيف فقط ما هو جديد في ملفك. يمكنك تعديل أو حذف أي عضو بشكل فردي بعد الاستيراد.',
    executeButton: 'استيراد الصفوف الصالحة',
    executing: 'جاري الاستيراد...',
    membersToCreate: 'الأعضاء الذين سيتم إنشاؤهم',
    subscriptionsToCreate: 'الاشتراكات التي سيتم إنشاؤها',
    validRows: 'صفوف صالحة',
    warningRows: 'صفوف بتحذيرات',
    invalidRows: 'صفوف غير صالحة',
    duplicateRows: 'صفوف مكررة',
    sampleRows: 'صفوف بها مشكلات',
    row: 'الصف',
    status: 'الحالة',
    issues: 'المشكلات',
    issueCsv: 'تحميل CSV بالمشكلات',
    importComplete: 'اكتمل الاستيراد',
    importedMembers: 'الأعضاء المستوردون',
    importedSubscriptions: 'الاشتراكات المستوردة',
    skippedRows: 'صفوف تم تخطيها',
    failedRows: 'صفوف فشلت',
    required: 'مطلوب',
    optional: 'اختياري',
    genderDefault: 'النوع الافتراضي للصفوف الناقصة',
    male: 'ذكر',
    female: 'أنثى',
    sourceColumn: 'عمود المصدر',
    doNotImport: 'لا تستورد',
    uploadFirst: 'ارفع ملف الاستيراد أولاً.',
    mapGenderOrDefault: 'اربط عمود النوع أو اختر نوعاً افتراضياً.',
    successUpload: 'تم رفع الملف بنجاح.',
    successPreview: 'تم إنشاء المراجعة بنجاح.',
    successImport: 'تم الاستيراد بنجاح.',
    fileRequired: 'اختر ملف CSV أو XLSX أولاً.',
    sampleColumnsTitle: 'أعمدة القالب',
    sampleColumnsHint: 'هذه هي الأعمدة التي يفهمها GymFlow في النسخة الأولى.',
    checklistTitle: 'قائمة التحقق قبل التشغيل',
    checklistHint: 'أكمل هذه المراجعات قبل تشغيل الفرع فعلياً على النظام.',
    checklistReviewWarnings: 'راجع صفوف التحذيرات وتأكد أن البيانات الناقصة مقبولة.',
    checklistReviewPlans: 'راجع الاشتراكات النشطة المستوردة وتأكد من صحة التواريخ.',
    checklistConnectWhatsapp: 'قم بتوصيل واتساب لهذا الفرع قبل تشغيل الأتمتة الحية.',
    checklistReviewReminders: 'راجع إعدادات تذكيرات واتساب واحتفظ بيوم تذكير واحد على الأقل.',
    checklistSearch: 'اختبر البحث عن عضو وتسجيل دخول واحد لعضو تجريبي آمن.',
    checklistReminder:
      'تحقق من إرسال تذكير تجديد واحد لعضو تجريبي قبل تفعيل الأتمتة الكاملة.',
    completeOnboarding: 'جيمك جاهز — ابدأ الآن',
    completingOnboarding: 'جاري الحفظ...',
    onboardingComplete: 'جيمك جاهز للعمل.',
    onboardingAlreadyComplete: 'تم إكمال الإعداد لهذا الفرع بالفعل.',
    goToDashboard: 'تعرف على أعضائك',
    spreadsheetOnlyNotice:
      'مسار الاستيراد النشط هنا هو الجداول فقط. استيراد نسخة الديسكتوب يبقى داخل الإعدادات لأنه أداة استبدال كاملة لبيانات الفرع.',
    importSafetyTitle: 'قواعد الأمان في الاستيراد',
    importSafety1: 'الأعضاء المستوردون كبيانات قديمة لا تُرسل لهم رسائل onboarding التلقائية.',
    importSafety2: 'الاشتراكات النشطة المستوردة يمكن أن تستقبل لاحقاً تذكيرات التجديد.',
    importSafety3: 'الصفوف المكررة يتم تخطيها فقط حسب الهاتف أو كود الكارت المطابق تماماً.',
    importSafety4: 'قيمة amount_paid تحفظ للمرجعية ولا تُحتسب كإيراد حي جديد.',
    templateDownloaded: 'تم تحميل القالب.',
    issueDownloadFailed: 'تعذر تحميل ملف المشكلات.',
    onboardingSaveFailed: 'تعذر تعليم الـ onboarding كمكتمل.',
    onboardingSaved: 'تم تعليم الـ onboarding كمكتمل.',
    recoveryHint: 'يمكنك العودة لاحقاً. الملف المرفوع والمراجعة يظلان مرتبطين بهذا الفرع.',
    format: 'الصيغة',
    preImportSafetyNote: 'أعضاؤك الحاليون في أمان — سنضيف فقط ما هو جديد في ملفك.',
    dateFormatLabel: 'صيغة التاريخ في ملفك',
    dateFormatHint: 'اختر الصيغة المستخدمة في أعمدة التواريخ (تاريخ الانضمام، تواريخ الاشتراك).',
    sendWelcomeEmailLabel: 'إرسال بريد ترحيب للأعضاء المستوردين',
    sendWelcomeEmailHint: 'سيستقبل الأعضاء بريداً إلكترونياً لتفعيل حساباتهم. يمكنك إيقاف هذا إذا أردت إخبارهم بنفسك.',
    importProgress: 'جاري استيراد أعضائك...',
    onboardingSuccessTitle: 'جيمك جاهز.',
    onboardingSuccessBody: 'عضو في انتظارك.',
    importedAt: 'تم الاستيراد في',
  }
} as const;

const FIELD_CONFIG: Array<{
  key: keyof MappingState;
  required: boolean;
  label: { en: string; ar: string };
}> = [
  { key: 'member_name', required: true, label: { en: 'Member name', ar: 'اسم العضو' } },
  { key: 'phone', required: true, label: { en: 'Phone', ar: 'الهاتف' } },
  { key: 'gender', required: false, label: { en: 'Gender', ar: 'النوع' } },
  { key: 'joined_at', required: false, label: { en: 'Join date', ar: 'تاريخ الانضمام' } },
  { key: 'date_of_birth', required: false, label: { en: 'Date of birth', ar: 'تاريخ الميلاد' } },
  { key: 'notes', required: false, label: { en: 'Notes', ar: 'ملاحظات' } },
  { key: 'card_code', required: false, label: { en: 'Card code', ar: 'كود الكارت' } },
  { key: 'subscription_start', required: false, label: { en: 'Subscription start', ar: 'بداية الاشتراك' } },
  { key: 'subscription_end', required: false, label: { en: 'Subscription end', ar: 'نهاية الاشتراك' } },
  { key: 'plan_months', required: false, label: { en: 'Plan months', ar: 'عدد الشهور' } },
  {
    key: 'sessions_per_month',
    required: false,
    label: { en: 'Sessions per month', ar: 'الجلسات لكل شهر' }
  },
  { key: 'amount_paid', required: false, label: { en: 'Amount paid', ar: 'المبلغ المدفوع' } }
];

const TEMPLATE_HEADERS = [
  'member_name',
  'phone',
  'gender',
  'joined_at',
  'date_of_birth',
  'card_code',
  'subscription_start',
  'subscription_end',
  'plan_months',
  'sessions_per_month',
  'amount_paid',
  'notes'
];

const CHECKLIST_KEYS: OnboardingChecklistKey[] = [
  'reviewWarnings',
  'reviewPlans',
  'connectWhatsapp',
  'reviewReminders',
  'testSearchAndCheckIn',
  'verifySafeReminder'
];

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[_\-\s]+/g, ' ').trim();
}

function setMappingFieldValue(current: MappingState, field: keyof MappingState, value?: string): MappingState {
  const nextValue = value ?? (field === 'member_name' || field === 'phone' ? '' : undefined);
  return {
    ...current,
    [field]: nextValue
  } as MappingState;
}

function suggestMapping(headers: string[]): ImportMapping {
  const aliases: Record<keyof ImportMapping, string[]> = {
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
    amount_paid: ['amount paid', 'paid', 'price', 'amount']
  };

  const byNormalized = new Map(headers.map((header) => [normalizeHeader(header), header]));
  let mapping: ImportMapping = {
    member_name: '',
    phone: ''
  };

  for (const field of FIELD_CONFIG) {
    const match = aliases[field.key].find((alias) => byNormalized.has(alias));
    if (!match) continue;
    const header = byNormalized.get(match);
    if (!header) continue;
    mapping = setMappingFieldValue(mapping, field.key, header);
  }

  return mapping;
}

function statusBadgeClass(status: PreviewRow['status']) {
  switch (status) {
    case 'valid':
      return 'bg-success/10 text-success border border-success/30';
    case 'warning':
      return 'bg-warning/10 text-warning border border-warning/30';
    case 'duplicate':
      return 'bg-info/10 text-info border border-info/30';
    default:
      return 'bg-destructive/10 text-destructive border border-destructive/30';
  }
}

export default function ImportOnboardingFlow({ variant = 'onboarding' }: ImportOnboardingFlowProps) {
  const { lang } = useLang();
  const labels = copy[lang];
  const router = useRouter();

  const [selectedSource, setSelectedSource] = useState<SourceMode>('spreadsheet');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [artifact, setArtifact] = useState<ImportUploadResponse | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({ member_name: '', phone: '' });
  const [genderDefault, setGenderDefault] = useState<'male' | 'female'>('male');
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [execution, setExecution] = useState<ImportExecuteResponse | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [checklist, setChecklist] = useState<Record<OnboardingChecklistKey, boolean>>({
    reviewWarnings: false,
    reviewPlans: false,
    connectWhatsapp: false,
    reviewReminders: false,
    testSearchAndCheckIn: false,
    verifySafeReminder: false
  });
  const [dateFormat, setDateFormat] = useState<'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'>('DD/MM/YYYY');
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);
  const [importingStatus, setImportingStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await api.get<Record<string, unknown>>('/api/settings').catch(() => null);
      if (cancelled || !res?.success || !res.data) return;
      setOnboardingCompleted(Boolean(res.data.onboarding_completed));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canPreview = Boolean(
    selectedSource === 'spreadsheet' &&
      artifact &&
      mapping.member_name &&
      mapping.phone &&
      (mapping.gender || genderDefault)
  );

  const stepState = useMemo(
    () => ({
      source: Boolean(selectedSource),
      upload: Boolean(artifact),
      map: Boolean(artifact && mapping.member_name && mapping.phone),
      preview: Boolean(preview),
      execute: Boolean(execution),
      goLive: Boolean(onboardingCompleted)
    }),
    [selectedSource, artifact, mapping.member_name, mapping.phone, preview, execution, onboardingCompleted]
  );

  const allChecklistChecked = CHECKLIST_KEYS.every((key) => checklist[key]);

  async function handleUpload() {
    if (!file) {
      toast.error(labels.fileRequired);
      return;
    }

    setUploading(true);
    setPreview(null);
    setExecution(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.postFormData<ImportUploadResponse>('/api/imports/upload', formData);
      if (!res.success || !res.data) {
        toast.error(res.message || labels.uploadFirst);
        return;
      }
      setArtifact(res.data);
      setMapping(suggestMapping(res.data.headers));
      toast.success(labels.successUpload);
    } finally {
      setUploading(false);
    }
  }

  async function handlePreview() {
    if (!artifact) {
      toast.error(labels.uploadFirst);
      return;
    }
    if (!canPreview) {
      toast.error(labels.mapGenderOrDefault);
      return;
    }

    setPreviewing(true);
    setExecution(null);
    try {
      const res = await api.post<ImportPreviewResponse>('/api/imports/preview', {
        artifactId: artifact.id,
        mapping,
        defaults: {
          gender_default: mapping.gender ? undefined : genderDefault,
          duplicate_mode: 'skip_duplicates'
        }
      });
      if (!res.success || !res.data) {
        toast.error(res.message || labels.previewHint);
        return;
      }
      const previewData = res.data;
      setPreview(previewData);
      setChecklist((current) => ({
        ...current,
        reviewWarnings: previewData.summary.warningRows === 0
      }));
      toast.success(labels.successPreview);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleExecute() {
    if (!artifact || !preview) return;
    setExecuting(true);
    setImportingStatus(labels.importProgress);
    try {
      const res = await api.post<ImportExecuteResponse>('/api/imports/execute', {
        artifactId: artifact.id,
        duplicate_mode: 'skip_duplicates',
        suppressImportedAutomations: true,
        dateFormat,
        sendWelcomeEmail
      });
      if (!res.success || !res.data) {
        toast.error(res.message || labels.executeHint);
        return;
      }
      const executionData = res.data;
      setExecution(executionData);
      setChecklist((current) => ({
        ...current,
        reviewPlans: executionData.importedSubscriptions === 0 ? true : current.reviewPlans
      }));
      toast.success(labels.successImport);
    } finally {
      setExecuting(false);
      setImportingStatus('');
    }
  }

  async function handleCompleteOnboarding() {
    if (!allChecklistChecked) return;
    setSavingOnboarding(true);
    try {
      const res = await api.put('/api/settings', {
        values: {
          onboarding_completed: true,
          onboarding_mode: 'spreadsheet_import',
          onboarding_completed_at: new Date().toISOString()
        }
      });
      if (!res.success) {
        toast.error(res.message || labels.onboardingSaveFailed);
        return;
      }
      setOnboardingCompleted(true);
      toast.success(labels.onboardingSaved);
    } finally {
      setSavingOnboarding(false);
    }
  }

  function handleDownloadTemplate() {
    const link = document.createElement('a');
    link.href = '/api/imports/template';
    link.download = 'gymflow-import-template.xlsx';
    link.rel = 'noopener';
    link.click();
    toast.success(labels.templateDownloaded);
  }

  async function handleDownloadIssuesCsv() {
    if (!artifact) return;
    try {
      const token = localStorage.getItem('session_token');
      const branchId = localStorage.getItem('branch_id');
      const response = await fetch(`/api/imports/issues?artifactId=${encodeURIComponent(artifact.id)}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(branchId ? { 'x-branch-id': branchId } : {})
        }
      });
      if (!response.ok) throw new Error('download_failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'gymflow-import-issues.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(labels.issueDownloadFailed);
    }
  }

  const sourceCards: Array<{
    key: SourceMode;
    icon: typeof FileSpreadsheet;
    title: string;
    description: string;
  }> = [
    { key: 'spreadsheet', icon: FileSpreadsheet, title: labels.modeSpreadsheet, description: labels.modeSpreadsheetHint },
    { key: 'desktop_backup', icon: ShieldCheck, title: labels.modeDesktop, description: labels.modeDesktopHint },
    { key: 'start_fresh', icon: Rocket, title: labels.modeFresh, description: labels.modeFreshHint }
  ];

  const steps = [
    { key: 'source', label: labels.stepSource, complete: stepState.source },
    { key: 'upload', label: labels.stepUpload, complete: stepState.upload },
    { key: 'map', label: labels.stepMap, complete: stepState.map },
    { key: 'preview', label: labels.stepPreview, complete: stepState.preview },
    { key: 'execute', label: labels.stepImport, complete: stepState.execute },
    { key: 'goLive', label: labels.stepGoLive, complete: stepState.goLive }
  ];
  const activeStepIndex = steps.findIndex((s) => !s.complete);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-heading font-bold tracking-tight">{labels.title}</h1>
          {variant === 'onboarding' && (
            <Badge className="bg-primary/10 text-primary border border-primary/30">Onboarding</Badge>
          )}
          {onboardingCompleted && (
            <Badge className="bg-success/10 text-success border border-success/30">{labels.done}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
      </div>

      <nav
        aria-label={lang === 'ar' ? 'خطوات الإعداد' : 'Setup progress'}
        className="overflow-x-auto pb-1"
      >
        <ol className="flex min-w-max items-start">
          {steps.map((step, index) => {
            const isComplete = step.complete;
            const isActive = index === activeStepIndex;
            return (
              <li
                key={step.key}
                className="flex items-start"
                aria-current={isActive ? 'step' : undefined}
                aria-label={`${lang === 'ar' ? 'الخطوة' : 'Step'} ${index + 1} ${lang === 'ar' ? 'من' : 'of'} ${steps.length}: ${step.label}${isComplete ? (lang === 'ar' ? ' — مكتملة' : ' — completed') : isActive ? (lang === 'ar' ? ' — الحالية' : ' — current') : ''}`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center">
                    {index > 0 && (
                      <div
                        className={cn(
                          'h-0.5 w-8 sm:w-14',
                          isComplete || isActive ? 'bg-destructive' : 'bg-border'
                        )}
                      />
                    )}
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center text-xs font-bold',
                        isComplete
                          ? 'bg-destructive text-white'
                          : isActive
                          ? 'border-2 border-destructive text-destructive'
                          : 'border-2 border-input text-muted-foreground'
                      )}
                    >
                      {isComplete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={cn(
                          'h-0.5 w-8 sm:w-14',
                          isComplete ? 'bg-destructive' : 'bg-border'
                        )}
                      />
                    )}
                  </div>
                  <p
                    className={cn(
                      'w-20 text-center text-xs',
                      isActive
                        ? 'font-semibold text-foreground'
                        : isComplete
                        ? 'text-muted-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>{labels.modeTitle}</CardTitle>
          <CardDescription>{labels.modeHint}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {sourceCards.map((source) => {
            const Icon = source.icon;
            const isSelected = selectedSource === source.key;
            return (
              <button
                key={source.key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedSource(source.key)}
                className={cn(
                  'border p-4 text-start transition-colors',
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <p className="font-semibold text-foreground">{source.title}</p>
                    <p className="text-sm text-muted-foreground">{source.description}</p>
                  </div>
                  {isSelected && (
                    <Badge className="bg-primary/10 text-primary border border-primary/30">{labels.active}</Badge>
                  )}
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {selectedSource === 'desktop_backup' && (
        <Alert>
          <AlertTitle>{labels.modeDesktop}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{labels.spreadsheetOnlyNotice}</p>
            <Button variant="outline" onClick={() => router.push('/dashboard/settings')}>
              {labels.goToDesktopImport}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {selectedSource === 'start_fresh' && (
        <Alert>
          <AlertTitle>{labels.modeFresh}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{labels.recoveryHint}</p>
            <Button variant="outline" onClick={() => router.push('/dashboard/members/new')}>
              {labels.startFreshCta}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {selectedSource === 'spreadsheet' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{labels.uploadTitle}</CardTitle>
              <CardDescription>{labels.uploadHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <p className="text-sm text-muted-foreground">{labels.templateHint}</p>
                <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  {labels.templateButton}
                </Button>
              </div>

              <p className="text-sm text-muted-foreground border-s-2 border-destructive ps-3">
                {labels.preImportSafetyNote}
              </p>

              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Input type="file" accept=".csv,.xlsx" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                <Button onClick={handleUpload} disabled={!file || uploading} className="gap-2">
                  <FileUp className="h-4 w-4" />
                  {uploading ? labels.uploading : labels.upload}
                </Button>
              </div>

              {artifact && (
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{labels.uploadedFile}</p>
                    <p className="font-medium break-all">{artifact.file_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{labels.totalRows}</p>
                    <p className="font-medium">{artifact.totalRows}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{labels.format}</p>
                    <p className="font-medium uppercase">{artifact.fileFormat}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{labels.headersDetected}</p>
                    <p className="font-medium">{artifact.headers.length}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {artifact && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{labels.sampleColumnsTitle}</CardTitle>
                  <CardDescription>{labels.sampleColumnsHint}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {TEMPLATE_HEADERS.map((column) => (
                    <Badge key={column} className="bg-muted text-muted-foreground border border-border">
                      {column}
                    </Badge>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{labels.importSafetyTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>1. {labels.importSafety1}</p>
                  <p>2. {labels.importSafety2}</p>
                  <p>3. {labels.importSafety3}</p>
                  <p>4. {labels.importSafety4}</p>
                </CardContent>
              </Card>
            </>
          )}

          {artifact && (
            <Card>
              <CardHeader>
                <CardTitle>{labels.mappingTitle}</CardTitle>
                <CardDescription>{labels.mappingHint}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  {FIELD_CONFIG.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>{field.label[lang]}</Label>
                        <Badge
                          className={
                            field.required
                              ? 'bg-primary/10 text-primary border border-primary/30'
                              : 'bg-muted text-muted-foreground border border-border'
                          }
                        >
                          {field.required ? labels.required : labels.optional}
                        </Badge>
                      </div>
                      <Select
                        value={mapping[field.key] || NONE}
                        onValueChange={(value) =>
                          setMapping((current) =>
                            setMappingFieldValue(current, field.key, value === NONE ? undefined : value)
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={labels.sourceColumn} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>{labels.doNotImport}</SelectItem>
                          {artifact.headers.map((header) => (
                            <SelectItem key={`${field.key}-${header}`} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {!mapping.gender && (
                  <div className="space-y-2">
                    <Label>{labels.genderDefault}</Label>
                    <Select value={genderDefault} onValueChange={(value: 'male' | 'female') => setGenderDefault(value)}>
                      <SelectTrigger className="max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{labels.male}</SelectItem>
                        <SelectItem value="female">{labels.female}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{labels.dateFormatLabel}</Label>
                  <p className="text-xs text-muted-foreground">{labels.dateFormatHint}</p>
                  <Select value={dateFormat} onValueChange={(value: typeof dateFormat) => setDateFormat(value)}>
                    <SelectTrigger className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handlePreview} disabled={!canPreview || previewing}>
                  {previewing ? labels.previewing : labels.previewButton}
                </Button>
              </CardContent>
            </Card>
          )}

          {preview && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{labels.previewTitle}</CardTitle>
                  <CardDescription>{labels.previewHint}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 border border-border divide-x divide-y divide-border md:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
                    <div className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">{labels.validRows}</p>
                      <p className="font-stat tracking-wide text-2xl tabular-nums">{preview.summary.validRows}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">{labels.warningRows}</p>
                      <p className="font-stat tracking-wide text-2xl tabular-nums">{preview.summary.warningRows}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">{labels.invalidRows}</p>
                      <p className="font-stat tracking-wide text-2xl tabular-nums">{preview.summary.invalidRows}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">{labels.duplicateRows}</p>
                      <p className="font-stat tracking-wide text-2xl tabular-nums">{preview.summary.duplicateRows}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">{labels.membersToCreate}</p>
                      <p className="font-stat tracking-wide text-2xl tabular-nums text-destructive">{preview.summary.estimatedMembersToCreate}</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">{labels.subscriptionsToCreate}</p>
                      <p className="font-stat tracking-wide text-2xl tabular-nums">{preview.summary.estimatedSubscriptionsToCreate}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold">{labels.sampleRows}</h3>
                    <Button variant="outline" onClick={handleDownloadIssuesCsv} className="gap-2">
                      <Download className="h-4 w-4" />
                      {labels.issueCsv}
                    </Button>
                  </div>

                  <Table aria-label={lang === 'ar' ? 'صفوف بها مشكلات' : 'Rows with issues'}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{labels.row}</TableHead>
                        <TableHead>{labels.status}</TableHead>
                        <TableHead>{labels.issues}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.rows.map((row) => (
                        <TableRow key={row.rowNumber}>
                          <TableCell className="tabular-nums">{row.rowNumber}</TableCell>
                          <TableCell>
                            <Badge className={statusBadgeClass(row.status)}>{row.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {row.issues.map((issue, index) => (
                                <p key={`${row.rowNumber}-${issue.code}-${index}`} className="text-xs text-muted-foreground">
                                  {issue.message}
                                </p>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{labels.executeTitle}</CardTitle>
                  <CardDescription>{labels.executeHint}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="send-welcome-email"
                      checked={sendWelcomeEmail}
                      onCheckedChange={(checked) => setSendWelcomeEmail(Boolean(checked))}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="send-welcome-email" className="cursor-pointer font-normal">
                        {labels.sendWelcomeEmailLabel}
                      </Label>
                      <p className="text-xs text-muted-foreground">{labels.sendWelcomeEmailHint}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={handleExecute}
                      disabled={executing || preview.summary.estimatedMembersToCreate === 0}
                    >
                      {executing
                        ? labels.executing
                        : lang === 'ar'
                        ? `استيراد ${preview.summary.estimatedMembersToCreate} عضو`
                        : `Import ${preview.summary.estimatedMembersToCreate} members`}
                    </Button>
                    {executing && importingStatus && (
                      <p className="text-sm text-muted-foreground animate-pulse">{importingStatus}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {execution && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{labels.importComplete}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0 p-0">
                  <div className="grid grid-cols-2 border-b border-border divide-x divide-border md:grid-cols-4">
                    <div className="px-6 py-4">
                      <p className="text-xs text-muted-foreground">{labels.importedMembers}</p>
                      <p className="font-stat tracking-wide text-3xl tabular-nums text-destructive">{execution.importedMembers}</p>
                    </div>
                    <div className="px-6 py-4">
                      <p className="text-xs text-muted-foreground">{labels.importedSubscriptions}</p>
                      <p className="font-stat tracking-wide text-3xl tabular-nums">{execution.importedSubscriptions}</p>
                    </div>
                    <div className="px-6 py-4">
                      <p className="text-xs text-muted-foreground">{labels.skippedRows}</p>
                      <p className="font-stat tracking-wide text-3xl tabular-nums">{execution.skippedRows}</p>
                    </div>
                    <div className="px-6 py-4">
                      <p className="text-xs text-muted-foreground">{labels.failedRows}</p>
                      <p className="font-stat tracking-wide text-3xl tabular-nums">{execution.failedRows}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{labels.checklistTitle}</CardTitle>
                  <CardDescription>{labels.checklistHint}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {[
                      { key: 'reviewWarnings', label: labels.checklistReviewWarnings },
                      { key: 'reviewPlans', label: labels.checklistReviewPlans },
                      { key: 'connectWhatsapp', label: labels.checklistConnectWhatsapp },
                      { key: 'reviewReminders', label: labels.checklistReviewReminders },
                      { key: 'testSearchAndCheckIn', label: labels.checklistSearch },
                      { key: 'verifySafeReminder', label: labels.checklistReminder }
                    ].map((item) => (
                      <div key={item.key} className="flex items-start gap-3 border border-border p-3">
                        <Checkbox
                          id={`checklist-${item.key}`}
                          checked={checklist[item.key as OnboardingChecklistKey]}
                          onCheckedChange={(checked) =>
                            setChecklist((current) => ({
                              ...current,
                              [item.key]: Boolean(checked)
                            }))
                          }
                          className="mt-0.5"
                        />
                        <Label
                          htmlFor={`checklist-${item.key}`}
                          className="text-sm text-foreground cursor-pointer font-normal"
                        >
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </div>

                  {!onboardingCompleted && (
                    <Button onClick={handleCompleteOnboarding} disabled={!allChecklistChecked || savingOnboarding}>
                      {savingOnboarding ? labels.completingOnboarding : labels.completeOnboarding}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {onboardingCompleted && (
                <Card className="border-destructive/40 bg-destructive/5">
                  <CardContent className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-destructive" />
                      <div className="space-y-1">
                        <p className="font-heading text-xl font-bold tracking-tight text-foreground">
                          {labels.onboardingComplete}
                        </p>
                        {execution && (
                          <p className="text-muted-foreground">
                            <span className="font-stat tracking-wide text-2xl text-foreground tabular-nums">
                              {execution.importedMembers}
                            </span>{' '}
                            {labels.onboardingSuccessBody}
                          </p>
                        )}
                        {!execution && (
                          <p className="text-sm text-muted-foreground">{labels.onboardingAlreadyComplete}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => router.push('/dashboard/members')}
                      className="shrink-0"
                    >
                      {labels.goToDashboard}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
