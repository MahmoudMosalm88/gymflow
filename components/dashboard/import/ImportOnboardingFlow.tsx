'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleAlert,
  Download,
  FileSpreadsheet,
  ScanLine,
  Settings2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import {
  canExecuteImportedMembers,
  hasBlockingInvalidRows,
  hasBlockingRows,
  hasBlockingWarningRows,
} from '@/lib/import-onboarding';
import {
  clearOnboardingChecklistNavLock,
  clearOnboardingNavigationBypass,
  setOnboardingChecklistNavLock,
  setOnboardingNavigationBypass,
} from '@/lib/onboarding-client';
import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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

type ChecklistKey =
  | 'reviewImportedMembers'
  | 'addFirstMember'
  | 'connectWhatsapp'
  | 'addTeam'
  | 'testCheckIn'
  | 'reviewReminders'
  | 'rememberImportLater';

type EntryMode = 'import' | 'manual_setup';
type OnboardingCompletionMode = 'imported' | 'manual';
type ImportStep = 'upload' | 'map' | 'review' | 'success';
type ManualStep = 'setup' | 'checklist';
type Step = ImportStep | ManualStep;

type ImportOnboardingFlowProps = {
  variant?: 'import' | 'onboarding';
};

const NONE = '__none__';
const ONBOARDING_RESUME_STATE_VERSION = 1;

type PersistedOnboardingState = {
  version: number;
  step: Step;
  entryMode: EntryMode;
  completionMode: OnboardingCompletionMode | null;
  artifact: ImportUploadResponse | null;
  mapping: MappingState;
  genderDefault: 'male' | 'female';
  preview: ImportPreviewResponse | null;
  execution: ImportExecuteResponse | null;
  onboardingCompleted: boolean;
  executeChecks: {
    reviewedRows: boolean;
    understoodSafety: boolean;
  };
  checklist: Record<ChecklistKey, boolean>;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
};

function getResumeStorageKey(variant: ImportOnboardingFlowProps['variant']) {
  if (typeof window === 'undefined') return null;
  const branchId = window.localStorage.getItem('branch_id');
  if (!branchId) return null;
  return `gymflow:onboarding-resume:${variant}:${branchId}`;
}

function readPersistedOnboardingState(storageKey: string): PersistedOnboardingState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedOnboardingState;
    if (parsed.version !== ONBOARDING_RESUME_STATE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearPersistedOnboardingState(storageKey: string | null) {
  if (!storageKey || typeof window === 'undefined') return;
  window.sessionStorage.removeItem(storageKey);
}

function persistOnboardingState(storageKey: string | null, snapshot: PersistedOnboardingState) {
  if (!storageKey || typeof window === 'undefined') return;
  window.sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
}

const copy = {
  en: {
    titleOnboarding: 'Set up your gym in GymFlow',
    titleImport: 'Import your client list',
    subtitleOnboarding:
      'Start by bringing over your current clients. If you prefer to begin manually, you can still import later from Settings at any time.',
    subtitleImport:
      'Bring over your current clients, review exactly what GymFlow will add, then finish a short go-live checklist.',
    recommended: 'Recommended',
    modeTitle: 'The fastest way to start is to import your client list',
    modeHint:
      'If you already have clients in another sheet or system, bring them in first so this branch starts with the right people and subscriptions.',
    modeSpreadsheetHint:
      'Upload a CSV or Excel file, match the columns, fix blocked rows, and import only the clean rows.',
    primaryCta: 'Import your client list',
    secondaryCta: 'Start without importing',
    secondaryHint: 'If you want to begin manually today, that is fine.',
    secondaryRecovery:
      'You can keep setting up now and import your old client list later from Settings at any time.',
    desktopRestoreHint:
      'Need the old desktop backup restore tool? Keep that for Settings > Backup & Restore.',
    openBackupSettings: 'Open backup tools',
    openImportSettings: 'Open import in Settings',
    stepUpload: 'Upload',
    stepMap: 'Match columns',
    stepFix: 'Fix blocked rows',
    stepImport: 'Import',
    stepManual: 'Manual setup',
    stepGoLive: 'Go live',
    done: 'Done',
    uploadTitle: 'Upload your client list',
    uploadHint:
      'Use CSV or XLSX. GymFlow never changes your file, and nothing gets created until you review the preview.',
    templateHint:
      'Use the template if your current sheet is messy. GymFlow will match the columns you provide and show you exactly what still needs fixing.',
    templateButton: 'Download template',
    upload: 'Upload file',
    uploading: 'Uploading...',
    uploadedFile: 'Uploaded file',
    totalRows: 'Total rows',
    headersDetected: 'Headers detected',
    mappingTitle: 'Match your columns',
    mappingHint:
      'Connect your file columns to GymFlow fields. Required fields must be matched before the preview can run.',
    fixIssuesTitle: 'Fix blocked rows before importing',
    fixIssuesHint:
      'The preview shows what is ready, what is blocked, and what GymFlow will safely skip.',
    previewButton: 'Preview the import',
    previewing: 'Checking your file...',
    previewCleanTitle: 'Your sheet is clean enough to import.',
    previewCleanBody:
      'Warning and invalid rows are clear now. Duplicates, if any, will be skipped safely.',
    previewBlockedTitle: 'Some rows still need to be fixed.',
    previewBlockedBody:
      'Rows with warnings or errors must be fixed in your sheet, then uploaded again before import can continue.',
    duplicatesSafeTitle: 'Duplicates are safe skips',
    duplicatesSafeBody:
      'Exact phone or card duplicates will not be imported again. They do not block this import.',
    noNewMembersTitle: 'There is nothing new to import yet.',
    noNewMembersBody:
      'GymFlow did not find any new clients to create from this file. Check the duplicate rows and your column mapping.',
    executeTitle: 'Import the clean rows',
    executeHint:
      'Once the sheet is clean, GymFlow will add only the new clients shown here. Existing clients stay untouched.',
    executeChecklistTitle: 'Before you import',
    executeCheckRows:
      'I reviewed the preview and understand which rows will be created versus safely skipped.',
    executeCheckSafety:
      'I understand GymFlow will add only new clients and skip exact phone or card duplicates.',
    executeButton: (count: number) => `Import ${count} clean clients`,
    executing: 'Importing...',
    membersToCreate: 'Clients to create',
    subscriptionsToCreate: 'Subscriptions to create',
    validRows: 'Ready rows',
    warningRows: 'Warning rows',
    invalidRows: 'Blocked rows',
    duplicateRows: 'Safe skips',
    sampleRows: 'Rows to review',
    row: 'Row',
    status: 'Status',
    issues: 'Issues',
    issueCsv: 'Download issues CSV',
    importComplete: 'Import completed',
    importedMembers: 'Imported clients',
    importedSubscriptions: 'Imported subscriptions',
    skippedRows: 'Safely skipped rows',
    failedRows: 'Failed rows',
    required: 'Required',
    optional: 'Optional',
    genderDefault: 'Default gender for missing rows',
    male: 'Male',
    female: 'Female',
    sourceColumn: 'Source column',
    doNotImport: 'Do not import',
    uploadFirst: 'Upload a spreadsheet first.',
    mapGenderOrDefault: 'Match a gender column or choose a default gender.',
    successUpload: 'Spreadsheet uploaded successfully.',
    successPreview: 'Preview generated successfully.',
    successImport: 'Import completed successfully.',
    fileRequired: 'Choose a CSV or XLSX file first.',
    sampleColumnsTitle: 'Template columns',
    sampleColumnsHint: 'These are the spreadsheet columns GymFlow understands in this import flow.',
    manualTitle: 'Start manually for now',
    manualHint:
      'You can begin operating today with a few quick setup actions, then import your old list later when you are ready.',
    manualLaterHint:
      'Skipping import now is not permanent. You can open Settings > Import Data later at any time.',
    manualActionAddMemberTitle: 'Add your first client',
    manualActionAddMemberBody:
      'Create one real client so the front desk has something to work with immediately.',
    manualActionWhatsappTitle: 'Connect WhatsApp in Settings',
    manualActionWhatsappBody:
      'Sign in to WhatsApp before you rely on reminders or automation.',
    manualActionTeamTitle: 'Add PT or staff',
    manualActionTeamBody:
      'Set up the people who will actually use this branch with you.',
    manualActionCheckInTitle: 'Test one check-in',
    manualActionCheckInBody:
      'Run one safe check-in so scanning and search feel normal before go-live.',
    manualContinue: 'Continue to the go-live checklist',
    backToImport: 'Go back to import',
    checklistTitleImported: 'Go-live checklist',
    checklistHintImported:
      'Finish these checks before the branch starts running fully in GymFlow.',
    checklistTitleManual: 'Finish manual setup',
    checklistHintManual:
      'Use this checklist to make sure the branch is usable now, while keeping import available later.',
    checklistReviewMembers: 'Review your imported clients',
    checklistAddFirstMember: 'Add your first client',
    checklistConnectWhatsapp: 'Connect WhatsApp from Settings',
    checklistAddTeam: 'Add PT/staff who will use this branch',
    checklistTestCheckIn: 'Test one real check-in',
    checklistReviewReminders: 'Review reminder automation before using it live',
    checklistImportLater:
      'Remember you can import your old client list later from Settings at any time',
    completeOnboarding: 'Finish onboarding',
    completingOnboarding: 'Saving...',
    onboardingCompleteImported: 'Your gym is ready.',
    onboardingCompleteManual: 'You can start manually now.',
    onboardingAlreadyComplete: 'Onboarding is already completed for this branch.',
    importedSuccessBody: (count: number) => `${count} imported clients are waiting for you.`,
    manualSuccessBody:
      'Keep adding clients now, and remember you can import your old client list later from Settings at any time.',
    goToMembers: 'Open clients',
    goToDashboard: 'Open dashboard',
    openMembers: 'Open clients',
    openAddMember: 'Open clients',
    openWhatsappSettings: 'Open WhatsApp settings',
    openTeamSetup: 'Open PT/staff setup',
    openCheckIn: 'Open dashboard scanner',
    openReminders: 'Open reminder settings',
    importSafetyTitle: 'Import safety rules',
    importSafety1:
      'Imported legacy clients are marked so onboarding automations do not send welcome sequences.',
    importSafety2:
      'Imported active subscriptions can still receive future renewal reminders after import.',
    importSafety3: 'Exact phone or card duplicates are skipped safely instead of being imported again.',
    importSafety4: 'Imported amount_paid is kept for context but not posted as new live revenue.',
    templateDownloaded: 'Template downloaded.',
    issueDownloadFailed: 'Could not download the issues CSV.',
    onboardingSaveFailed: 'Could not mark onboarding complete.',
    onboardingSaved: 'Onboarding marked complete.',
    format: 'Format',
    preImportSafetyNote: 'GymFlow adds only new clients from this file. Existing clients stay safe.',
    dateFormatLabel: 'Date format in your file',
    dateFormatHint: 'Choose the format used in your date columns.',
confirmTitle: (count: number) => `Import ${count} clients?`,
    confirmBody: 'Review your data one more time. You can edit or remove any client after import.',
    confirmCancel: 'Cancel',
    confirmExecute: 'Import clients',
    welcomeTitle: "Let's bring your clients in.",
    welcomeSub: 'Your file is never changed. You will review before anything is added.',
    dropHint: 'Drop your file here, or',
    browse: 'choose a file',
    accept: 'Excel or CSV',
    skipLink: "I'll add clients manually",
    removeFile: 'Remove',
    back: 'Back',
    continueBtn: 'Continue',
    moreFields: 'More fields (optional)',
    hideFields: 'Hide extra fields',
    importOptions: 'Import options',
    errNamePhone: 'Client name and phone are required.',
    errUploadFail: 'Upload failed. Please try again.',
    errPreviewFail: 'Could not check your file. Please try again.',
    errImportFail: 'Import failed. Please try again.',
    downloadedTemplate: 'Template downloaded.',
    membersReady: 'ready to import',
    importingLabel: 'Importing...',
    stepReview: 'Review',
    stepReviewAlt: 'Fix blocked rows',
    safetyNote: 'GymFlow adds only new clients. Existing clients stay untouched.',
    showSafety: 'Show safety rules',
    hideSafety: 'Hide safety rules',
    showTemplate: 'Show template columns',
    hideTemplate: 'Hide template columns',
  },
  ar: {
    titleOnboarding: 'جهّز جيمك على GymFlow',
    titleImport: 'استورد قائمة العملاء',
    subtitleOnboarding:
      'ابدأ بنقل العملاء الحاليين أولاً. وإذا فضّلت البدء يدوياً، يمكنك الاستيراد لاحقاً من الإعدادات في أي وقت.',
    subtitleImport:
      'انقل أعضاءك الحاليين، راجع ما سيضيفه GymFlow بالضبط، ثم أنهِ قائمة تشغيل قصيرة قبل البدء.',
    recommended: 'الاختيار المقترح',
    modeTitle: 'أسرع طريقة للبدء هي استيراد قائمة العملاء',
    modeHint:
      'إذا كان لديك عملاء في ملف أو نظام آخر، استوردهم أولاً ليبدأ هذا الفرع بالأشخاص والاشتراكات الصحيحة.',
    modeSpreadsheetHint:
      'ارفع ملف CSV أو Excel، طابق الأعمدة، أصلح الصفوف الممنوعة، ثم استورد الصفوف النظيفة فقط.',
    primaryCta: 'استورد قائمة العملاء',
    secondaryCta: 'ابدأ بدون استيراد',
    secondaryHint: 'إذا أردت البدء يدوياً اليوم فهذا مناسب.',
    secondaryRecovery:
      'يمكنك متابعة الإعداد الآن ثم استيراد قائمتك القديمة لاحقاً من الإعدادات في أي وقت.',
    desktopRestoreHint:
      'إذا كنت تحتاج أداة استرجاع نسخة GymFlow Desktop القديمة، اتركها لأدوات الإعدادات > النسخ الاحتياطي.',
    openBackupSettings: 'افتح أدوات النسخ الاحتياطي',
    openImportSettings: 'افتح الاستيراد في الإعدادات',
    stepUpload: 'الرفع',
    stepMap: 'مطابقة الأعمدة',
    stepFix: 'إصلاح الصفوف الممنوعة',
    stepImport: 'الاستيراد',
    stepManual: 'الإعداد اليدوي',
    stepGoLive: 'التشغيل',
    done: 'تم',
    uploadTitle: 'ارفع قائمة العملاء',
    uploadHint:
      'الملفات المدعومة CSV و XLSX. GymFlow لن يغيّر ملفك، ولن يتم إنشاء أي شيء قبل مراجعتك للمعاينة.',
    templateHint:
      'استخدم القالب إذا كان ملفك الحالي غير مرتب. GymFlow سيطابق الأعمدة ويظهر لك ما يحتاج إلى تصحيح.',
    templateButton: 'تحميل القالب',
    upload: 'رفع الملف',
    uploading: 'جاري الرفع...',
    uploadedFile: 'الملف المرفوع',
    totalRows: 'إجمالي الصفوف',
    headersDetected: 'الأعمدة المكتشفة',
    mappingTitle: 'طابق أعمدتك',
    mappingHint:
      'اربط أعمدة ملفك بحقول GymFlow. يجب مطابقة الحقول المطلوبة قبل تشغيل المعاينة.',
    fixIssuesTitle: 'أصلح الصفوف الممنوعة قبل الاستيراد',
    fixIssuesHint:
      'المعاينة توضّح ما هو جاهز، وما هو ممنوع، وما الذي سيتخطاه GymFlow بأمان.',
    previewButton: 'معاينة الاستيراد',
    previewing: 'جاري فحص الملف...',
    previewCleanTitle: 'الملف أصبح جاهزاً للاستيراد.',
    previewCleanBody:
      'لم تعد هناك صفوف بتحذيرات أو أخطاء. أي تكرارات موجودة سيتم تخطيها بأمان.',
    previewBlockedTitle: 'ما زالت هناك صفوف تحتاج إلى تصحيح.',
    previewBlockedBody:
      'الصفوف التي تحتوي على تحذيرات أو أخطاء يجب تصحيحها في الملف ثم رفعه مرة أخرى قبل الاستيراد.',
    duplicatesSafeTitle: 'التكرارات لن تعطل الاستيراد',
    duplicatesSafeBody:
      'إذا كان الهاتف أو كود الكارت مطابقاً تماماً، سيتخطى GymFlow هذا الصف ولن يستورده مرة أخرى.',
    noNewMembersTitle: 'لا يوجد عملاء جدد للاستيراد حالياً.',
    noNewMembersBody:
      'GymFlow لم يجد عملاء جدداً لإنشائهم من هذا الملف. راجع الصفوف المكررة ومطابقة الأعمدة.',
    executeTitle: 'استورد الصفوف النظيفة',
    executeHint:
      'بعد تنظيف الملف، سيضيف GymFlow العملاء الجدد الظاهرين هنا فقط. العملاء الحاليون لن يتأثروا.',
    executeChecklistTitle: 'قبل الاستيراد',
    executeCheckRows:
      'راجعت المعاينة وأفهم أي الصفوف سيتم إنشاؤها وأي الصفوف سيتم تخطيها بأمان.',
    executeCheckSafety:
      'أفهم أن GymFlow سيضيف العملاء الجدد فقط وسيتخطى التكرارات المطابقة للهاتف أو الكارت.',
    executeButton: (count: number) => `استورد ${count} عميلاً جاهزاً`,
    executing: 'جاري الاستيراد...',
    membersToCreate: 'العملاء الذين سيتم إنشاؤهم',
    subscriptionsToCreate: 'الاشتراكات التي سيتم إنشاؤها',
    validRows: 'صفوف جاهزة',
    warningRows: 'صفوف بتحذيرات',
    invalidRows: 'صفوف ممنوعة',
    duplicateRows: 'صفوف سيتم تخطيها',
    sampleRows: 'صفوف تحتاج مراجعة',
    row: 'الصف',
    status: 'الحالة',
    issues: 'المشكلات',
    issueCsv: 'تحميل ملف المشكلات CSV',
    importComplete: 'اكتمل الاستيراد',
    importedMembers: 'العملاء المستوردون',
    importedSubscriptions: 'الاشتراكات المستوردة',
    skippedRows: 'صفوف تم تخطيها بأمان',
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
    successPreview: 'تم إنشاء المعاينة بنجاح.',
    successImport: 'تم الاستيراد بنجاح.',
    fileRequired: 'اختر ملف CSV أو XLSX أولاً.',
    sampleColumnsTitle: 'أعمدة القالب',
    sampleColumnsHint: 'هذه هي الأعمدة التي يفهمها GymFlow في مسار الاستيراد هذا.',
    manualTitle: 'ابدأ يدوياً الآن',
    manualHint:
      'يمكنك تشغيل الجيم اليوم ببضع خطوات سريعة، ثم استيراد قائمتك القديمة لاحقاً عندما تكون جاهزاً.',
    manualLaterHint:
      'تجاوز الاستيراد الآن ليس قراراً نهائياً. يمكنك فتح الإعدادات > استيراد البيانات لاحقاً في أي وقت.',
    manualActionAddMemberTitle: 'أضف أول عميل',
    manualActionAddMemberBody:
      'أنشئ عميلاً حقيقياً واحداً ليبدأ الاستقبال العمل مباشرة.',
    manualActionWhatsappTitle: 'وصّل واتساب من الإعدادات',
    manualActionWhatsappBody:
      'سجّل دخول واتساب قبل الاعتماد على التذكيرات أو الأتمتة.',
    manualActionTeamTitle: 'أضف PT أو Staff',
    manualActionTeamBody:
      'جهّز الأشخاص الذين سيستخدمون هذا الفرع معك فعلياً.',
    manualActionCheckInTitle: 'اختبر تسجيل دخول واحد',
    manualActionCheckInBody:
      'نفّذ تسجيل دخول تجريبياً واحداً حتى تتأكد أن البحث والاسكانر يعملان بشكل طبيعي.',
    manualContinue: 'انتقل إلى قائمة التشغيل',
    backToImport: 'ارجع إلى الاستيراد',
    checklistTitleImported: 'قائمة التشغيل',
    checklistHintImported:
      'أكمل هذه المراجعات قبل تشغيل الفرع بالكامل على GymFlow.',
    checklistTitleManual: 'أنهِ الإعداد اليدوي',
    checklistHintManual:
      'استخدم هذه القائمة لتتأكد أن الفرع قابل للاستخدام الآن مع بقاء الاستيراد متاحاً لاحقاً.',
    checklistReviewMembers: 'راجع العملاء الذين تم استيرادهم',
    checklistAddFirstMember: 'أضف أول عميل',
    checklistConnectWhatsapp: 'وصّل واتساب من الإعدادات',
    checklistAddTeam: 'أضف PT/Staff الذين سيستخدمون الفرع',
    checklistTestCheckIn: 'اختبر تسجيل دخول حقيقياً واحداً',
    checklistReviewReminders: 'راجع أتمتة التذكيرات قبل استخدامها فعلياً',
    checklistImportLater:
      'تذكّر أنك تستطيع استيراد قائمتك القديمة لاحقاً من الإعدادات في أي وقت',
    completeOnboarding: 'أنهِ الإعداد',
    completingOnboarding: 'جاري الحفظ...',
    onboardingCompleteImported: 'جيمك جاهز.',
    onboardingCompleteManual: 'يمكنك البدء يدوياً الآن.',
    onboardingAlreadyComplete: 'تم إكمال الإعداد لهذا الفرع بالفعل.',
    importedSuccessBody: (count: number) => `${count} عميلاً مستورداً في انتظارك.`,
    manualSuccessBody:
      'ابدأ بإضافة العملاء الآن، وتذكّر أنك تستطيع استيراد قائمتك القديمة لاحقاً من الإعدادات في أي وقت.',
    goToMembers: 'افتح العملاء',
    goToDashboard: 'افتح الداشبورد',
    openMembers: 'افتح العملاء',
    openAddMember: 'افتح العملاء',
    openWhatsappSettings: 'افتح واتساب',
    openTeamSetup: 'افتح PT/Staff',
    openCheckIn: 'افتح الماسح',
    openReminders: 'افتح التذكيرات',
    importSafetyTitle: 'قواعد الأمان في الاستيراد',
    importSafety1:
      'العملاء المستوردون يتم تعليمهم كبيانات قديمة حتى لا تُرسل لهم رسائل الترحيب التلقائية.',
    importSafety2:
      'الاشتراكات النشطة المستوردة يمكنها استقبال تذكيرات التجديد لاحقاً بعد الاستيراد.',
    importSafety3:
      'التكرارات المطابقة للهاتف أو الكارت يتم تخطيها بأمان بدلاً من استيرادها مرة أخرى.',
    importSafety4:
      'قيمة amount_paid تحفظ للمرجعية ولا تُحسب كإيراد حي جديد.',
    templateDownloaded: 'تم تحميل القالب.',
    issueDownloadFailed: 'تعذر تحميل ملف المشكلات.',
    onboardingSaveFailed: 'تعذر تعليم الإعداد كمكتمل.',
    onboardingSaved: 'تم تعليم الإعداد كمكتمل.',
    format: 'الصيغة',
    preImportSafetyNote: 'GymFlow يضيف العملاء الجدد فقط من هذا الملف. العملاء الحاليون في أمان.',
    dateFormatLabel: 'صيغة التاريخ في ملفك',
    dateFormatHint: 'اختر الصيغة المستخدمة في أعمدة التواريخ.',
confirmTitle: (count: number) => `استورد ${count} عميلاً؟`,
    confirmBody: 'راجع بياناتك مرة أخرى. يمكنك تعديل أو حذف أي عميل بعد الاستيراد.',
    confirmCancel: 'إلغاء',
    confirmExecute: 'استورد العملاء',
    welcomeTitle: 'لنجلب عملاءك.',
    welcomeSub: 'ملفك لن يتغير. ستراجع كل شيء قبل أي إضافة.',
    dropHint: 'أسقط الملف هنا، أو',
    browse: 'اختر ملفاً',
    accept: 'Excel أو CSV',
    skipLink: 'سأضيف العملاء يدوياً',
    removeFile: 'حذف',
    back: 'رجوع',
    continueBtn: 'تابع',
    moreFields: 'حقول إضافية (اختيارية)',
    hideFields: 'إخفاء الحقول الإضافية',
    importOptions: 'خيارات الاستيراد',
    errNamePhone: 'اسم العميل ورقم الهاتف مطلوبان.',
    errUploadFail: 'فشل الرفع. حاول مجدداً.',
    errPreviewFail: 'تعذر التحقق من الملف. حاول مجدداً.',
    errImportFail: 'فشل الاستيراد. حاول مجدداً.',
    downloadedTemplate: 'تم تحميل القالب.',
    membersReady: 'جاهز للاستيراد',
    importingLabel: 'جاري الاستيراد...',
    stepReview: 'مراجعة',
    stepReviewAlt: 'إصلاح الصفوف الممنوعة',
    safetyNote: 'GymFlow يضيف العملاء الجدد فقط. العملاء الحاليون في أمان.',
    showSafety: 'عرض قواعد الأمان',
    hideSafety: 'إخفاء قواعد الأمان',
    showTemplate: 'عرض أعمدة القالب',
    hideTemplate: 'إخفاء أعمدة القالب',
  },
} as const;

const FIELD_CONFIG: Array<{
  key: keyof MappingState;
  required: boolean;
  label: { en: string; ar: string };
}> = [
  { key: 'member_name', required: true, label: { en: 'Client name', ar: 'اسم العميل' } },
  { key: 'phone', required: true, label: { en: 'Phone', ar: 'الهاتف' } },
  { key: 'gender', required: false, label: { en: 'Gender', ar: 'النوع' } },
  { key: 'joined_at', required: false, label: { en: 'Join date', ar: 'تاريخ الانضمام' } },
  { key: 'date_of_birth', required: false, label: { en: 'Date of birth', ar: 'تاريخ الميلاد' } },
  { key: 'notes', required: false, label: { en: 'Notes', ar: 'ملاحظات' } },
  { key: 'card_code', required: false, label: { en: 'Card code', ar: 'كود الكارت' } },
  { key: 'subscription_start', required: false, label: { en: 'Subscription start', ar: 'بداية الاشتراك' } },
  { key: 'subscription_end', required: false, label: { en: 'Subscription end', ar: 'نهاية الاشتراك' } },
  { key: 'plan_months', required: false, label: { en: 'Plan months', ar: 'عدد الشهور' } },
  { key: 'sessions_per_month', required: false, label: { en: 'Sessions per month', ar: 'الجلسات لكل شهر' } },
  { key: 'amount_paid', required: false, label: { en: 'Amount paid', ar: 'المبلغ المدفوع' } },
];

const TEMPLATE_HEADERS = [
  'member_name', 'phone', 'gender', 'joined_at', 'date_of_birth',
  'card_code', 'subscription_start', 'subscription_end', 'plan_months',
  'sessions_per_month', 'amount_paid', 'notes',
];

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[_\-\s]+/g, ' ').trim();
}

function setMappingFieldValue(current: MappingState, field: keyof MappingState, value?: string): MappingState {
  const nextValue = value ?? (field === 'member_name' || field === 'phone' ? '' : undefined);
  return { ...current, [field]: nextValue } as MappingState;
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
    amount_paid: ['amount paid', 'paid', 'price', 'amount'],
  };

  const byNormalized = new Map(headers.map((header) => [normalizeHeader(header), header]));
  let mapping: ImportMapping = { member_name: '', phone: '' };

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

const IMPORT_STEPS = [
  { key: 'upload', labelKey: 'stepUpload' as const },
  { key: 'map', labelKey: 'stepMap' as const },
  { key: 'review', labelKey: 'stepFix' as const },
  { key: 'import', labelKey: 'stepImport' as const },
  { key: 'golive', labelKey: 'stepGoLive' as const },
];

const MANUAL_STEPS = [
  { key: 'setup', labelKey: 'stepManual' as const },
  { key: 'checklist', labelKey: 'stepGoLive' as const },
];

export default function ImportOnboardingFlow({ variant = 'onboarding' }: ImportOnboardingFlowProps) {
  const { lang } = useLang();
  const labels = copy[lang];
  const router = useRouter();
  const resumeStorageKeyRef = useRef<string | null>(null);

  const [step, setStep] = useState<Step>('upload');
  const [fading, setFading] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>('import');
  const [completionMode, setCompletionMode] = useState<OnboardingCompletionMode | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [artifact, setArtifact] = useState<ImportUploadResponse | null>(null);
  const [mapping, setMapping] = useState<MappingState>({ member_name: '', phone: '' });
  const [genderDefault, setGenderDefault] = useState<'male' | 'female'>('male');
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [execution, setExecution] = useState<ImportExecuteResponse | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [executeChecks, setExecuteChecks] = useState({
    reviewedRows: false,
    understoodSafety: false,
  });
  const [checklist, setChecklist] = useState<Record<ChecklistKey, boolean>>({
    reviewImportedMembers: false,
    addFirstMember: false,
    connectWhatsapp: false,
    addTeam: false,
    testCheckIn: false,
    reviewReminders: false,
    rememberImportLater: false,
  });
  const [dateFormat, setDateFormat] = useState<'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'>('DD/MM/YYYY');
  
  const [dragging, setDragging] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [step4Visible, setStep4Visible] = useState(false);
  const [previewPhase, setPreviewPhase] = useState(0);
  const [resumeReady, setResumeReady] = useState(false);

  const PREVIEW_PHASES = useMemo(() => [
    { key: 'parsing', label: lang === 'ar' ? 'جاري تحليل الملف...' : 'Parsing your spreadsheet...' },
    { key: 'matching', label: lang === 'ar' ? 'جاري مطابقة الأعمدة...' : 'Matching columns to fields...' },
    { key: 'validating', label: lang === 'ar' ? 'جاري التحقق من بيانات العملاء...' : 'Validating client data...' },
    { key: 'checking', label: lang === 'ar' ? 'جاري فحص التكرارات...' : 'Checking for duplicates...' },
  ], [lang]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storageKey = getResumeStorageKey(variant);
    resumeStorageKeyRef.current = storageKey;

    const persisted = storageKey ? readPersistedOnboardingState(storageKey) : null;
    if (persisted) {
      setStep(persisted.step);
      setEntryMode(persisted.entryMode);
      setCompletionMode(persisted.completionMode);
      setArtifact(persisted.artifact);
      setMapping(persisted.mapping);
      setGenderDefault(persisted.genderDefault);
      setPreview(persisted.preview);
      setExecution(persisted.execution);
      setOnboardingCompleted(persisted.onboardingCompleted);
      setExecuteChecks(persisted.executeChecks);
      setChecklist(persisted.checklist);
      setDateFormat(persisted.dateFormat);
    }

    setResumeReady(true);
  }, [variant]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await api.get<Record<string, unknown>>('/api/settings').catch(() => null);
      if (cancelled || !res?.success || !res.data) return;
      setOnboardingCompleted(Boolean(res.data.onboarding_completed));
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!resumeReady) return;

    const storageKey = resumeStorageKeyRef.current;
    const hasProgressToPersist =
      step !== 'upload' ||
      entryMode !== 'import' ||
      completionMode !== null ||
      Boolean(artifact) ||
      Boolean(preview) ||
      Boolean(execution);

    if (!hasProgressToPersist || onboardingCompleted) {
      clearPersistedOnboardingState(storageKey);
      return;
    }

    persistOnboardingState(storageKey, {
      version: ONBOARDING_RESUME_STATE_VERSION,
      step,
      entryMode,
      completionMode,
      artifact,
      mapping,
      genderDefault,
      preview,
      execution,
      onboardingCompleted,
      executeChecks,
      checklist,
      dateFormat,
    });
  }, [
    artifact,
    checklist,
    completionMode,
    dateFormat,
    entryMode,
    executeChecks,
    execution,
    genderDefault,
    mapping,
    onboardingCompleted,
    preview,
    resumeReady,
    step,
  ]);

  useEffect(() => {
    if (step === 'success') {
      const t = setTimeout(() => { setSuccessVisible(true); }, 80);
      return () => clearTimeout(t);
    }
    setSuccessVisible(false);
  }, [step]);

  useEffect(() => {
    if (step === 'checklist') {
      const t = setTimeout(() => { setStep4Visible(true); }, 80);
      return () => clearTimeout(t);
    }
    setStep4Visible(false);
  }, [step]);

  useEffect(() => {
    if (!previewing) {
      setPreviewPhase(0);
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const phaseDurations = [2000, 3000, 2500];
    let cumulative = 0;
    for (let i = 0; i < PREVIEW_PHASES.length; i++) {
      const delay = cumulative;
      timers.push(setTimeout(() => { setPreviewPhase(i); }, delay));
      cumulative += phaseDurations[i] || 2000;
    }
    return () => { timers.forEach(clearTimeout); };
  }, [previewing, PREVIEW_PHASES]);

  const canPreview = Boolean(
    artifact && mapping.member_name && mapping.phone && (mapping.gender || genderDefault),
  );

  const readiness = useMemo(
    () => ({
      hasBlockingInvalidRows: hasBlockingInvalidRows(preview),
      hasBlockingWarningRows: hasBlockingWarningRows(preview),
      hasBlockingRows: hasBlockingRows(preview),
      canExecuteImport: canExecuteImportedMembers(preview, executeChecks),
    }),
    [preview, executeChecks],
  );

  const checklistMode = completionMode ?? (execution ? 'imported' : null);
  const issueRows = useMemo(
    () => preview?.rows.filter((row) => row.status !== 'valid') ?? [],
    [preview],
  );

  const checklistItems = useMemo(() => {
    if (checklistMode === 'imported') {
      return [
        { key: 'reviewImportedMembers' as const, label: labels.checklistReviewMembers, href: '/dashboard/members', actionLabel: labels.openMembers },
        { key: 'connectWhatsapp' as const, label: labels.checklistConnectWhatsapp, href: '/dashboard/settings?tab=whatsapp', actionLabel: labels.openWhatsappSettings },
        { key: 'addTeam' as const, label: labels.checklistAddTeam, href: '/dashboard/pt?tab=staff', actionLabel: labels.openTeamSetup },
        { key: 'testCheckIn' as const, label: labels.checklistTestCheckIn, href: '/dashboard', actionLabel: labels.openCheckIn },
        { key: 'reviewReminders' as const, label: labels.checklistReviewReminders, href: '/dashboard/whatsapp', actionLabel: labels.openReminders },
      ];
    }
    if (checklistMode === 'manual') {
      return [
        { key: 'addFirstMember' as const, label: labels.checklistAddFirstMember, href: '/dashboard/members', actionLabel: labels.openAddMember },
        { key: 'connectWhatsapp' as const, label: labels.checklistConnectWhatsapp, href: '/dashboard/settings?tab=whatsapp', actionLabel: labels.openWhatsappSettings },
        { key: 'addTeam' as const, label: labels.checklistAddTeam, href: '/dashboard/pt?tab=staff', actionLabel: labels.openTeamSetup },
        { key: 'testCheckIn' as const, label: labels.checklistTestCheckIn, href: '/dashboard', actionLabel: labels.openCheckIn },
        { key: 'rememberImportLater' as const, label: labels.checklistImportLater, href: '/dashboard/settings?tab=import', actionLabel: labels.openImportSettings },
      ];
    }
    return [];
  }, [checklistMode, labels]);

  const requiredChecklistKeys = useMemo(() => {
    if (checklistMode === 'manual') {
      return ['addFirstMember', 'connectWhatsapp', 'addTeam'] as const;
    }
    if (checklistMode === 'imported') {
      return ['reviewImportedMembers', 'connectWhatsapp', 'addTeam'] as const;
    }
    return [] as const;
  }, [checklistMode]);

  const autoTrackedChecklistKeys = useMemo(
    () => new Set<ChecklistKey>(['reviewImportedMembers', 'addFirstMember', 'connectWhatsapp', 'addTeam']),
    []
  );

  const readyToFinishOnboarding =
    requiredChecklistKeys.length > 0 &&
    requiredChecklistKeys.every((key) => checklist[key]);

  function handleChecklistActionClick(item: (typeof checklistItems)[number]) {
    navigateToChecklistTarget(item.href);
  }

  function navigate(to: Step) {
    setFading(true);
    setTimeout(() => {
      setStep(to);
      setFading(false);
    }, 180);
  }

  async function handleUpload() {
    if (!file) {
      toast.error(labels.fileRequired);
      return;
    }
    setEntryMode('import');
    setCompletionMode(null);
    setUploading(true);
    setPreview(null);
    setExecution(null);
    setExecuteChecks({ reviewedRows: false, understoodSafety: false });
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
      navigate('map');
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
    setCompletionMode(null);
    setExecuteChecks({ reviewedRows: false, understoodSafety: false });
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
        toast.error(res.message || labels.fixIssuesHint);
        return;
      }
      setPreview(res.data);
      toast.success(labels.successPreview);
      navigate('review');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleExecute() {
    if (!artifact || !preview) return;
    setShowConfirmModal(false);
    setExecuting(true);
    try {
      const res = await api.post<ImportExecuteResponse>('/api/imports/execute', {
        artifactId: artifact.id,
        duplicate_mode: 'skip_duplicates',
        suppressImportedAutomations: true,
        dateFormat,
      });
      if (!res.success || !res.data) {
        toast.error(res.message || labels.executeHint);
        return;
      }
      setExecution(res.data);
      setCompletionMode('imported');
      toast.success(labels.successImport);
      navigate('success');
    } finally {
      setExecuting(false);
    }
  }

  async function handleCompleteOnboarding() {
    if (!readyToFinishOnboarding || !checklistMode) return;
    setSavingOnboarding(true);
    try {
      const res = await api.put('/api/settings', {
        values: {
          onboarding_completed: true,
          onboarding_mode: checklistMode === 'manual' ? 'manual_setup' : 'spreadsheet_import',
          onboarding_completed_at: new Date().toISOString(),
        },
      });
      if (!res.success) {
        toast.error(res.message || labels.onboardingSaveFailed);
        return;
      }
      clearOnboardingNavigationBypass();
      clearOnboardingChecklistNavLock();
      setOnboardingCompleted(true);
      toast.success(labels.onboardingSaved);
    } finally {
      setSavingOnboarding(false);
    }
  }

  function navigateFromOnboarding(href: string) {
    setOnboardingNavigationBypass();
    router.push(href);
  }

  function navigateToChecklistTarget(href: string) {
    setOnboardingNavigationBypass();
    setOnboardingChecklistNavLock(href);
    router.push(href);
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
          ...(branchId ? { 'x-branch-id': branchId } : {}),
        },
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

  function handleStartFresh() {
    setEntryMode('manual_setup');
    navigate('setup');
  }

  function handleBackToImport() {
    setEntryMode('import');
    setCompletionMode(null);
    navigate('upload');
  }

  const isDarkStep = step === 'upload';
  const title = variant === 'onboarding' ? labels.titleOnboarding : labels.titleImport;
  const subtitle = variant === 'onboarding' ? labels.subtitleOnboarding : labels.subtitleImport;

  const importStepIndex = useMemo(() => {
    if (step === 'upload') return 0;
    if (step === 'map') return 1;
    if (step === 'review') return 2;
    if (executing) return 3;
    if (step === 'success') return 4;
    return 0;
  }, [step, executing]);

  const importStepComplete = useMemo(() => [
    Boolean(artifact),
    Boolean(preview || execution),
    Boolean((preview && !readiness.hasBlockingRows) || execution),
    Boolean(execution),
    onboardingCompleted,
  ], [artifact, preview, execution, readiness.hasBlockingRows, onboardingCompleted]);

  const manualStepComplete = useMemo(() => [
    completionMode === 'manual' || onboardingCompleted,
    onboardingCompleted,
  ], [completionMode, onboardingCompleted]);

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
        @keyframes gf-check-in {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes gf-slide-up {
          0% { transform: translateY(12px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes gf-slide-up-delay-1 {
          0%, 20% { transform: translateY(12px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes gf-slide-up-delay-2 {
          0%, 40% { transform: translateY(12px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes gf-slide-up-delay-3 {
          0%, 60% { transform: translateY(12px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .gf-deco, .gf-animate { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div
        className={cn(
          'relative min-h-screen overflow-hidden transition-colors duration-500',
          isDarkStep ? 'bg-[#0a0a0a]' : 'bg-background',
        )}
        style={isDarkStep ? {
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        } : undefined}
      >
        {isDarkStep && (
          <>
            <div aria-hidden="true" className="gf-deco pointer-events-none select-none absolute top-[7%] left-[5%] h-36 w-36 border border-white/[0.06]" style={{ animation: 'gf-drift-a 11s ease-in-out infinite' }} />
            <div aria-hidden="true" className="gf-deco pointer-events-none select-none absolute top-[38%] right-[4%] h-20 w-14 border border-white/[0.04]" style={{ animation: 'gf-drift-b 14s ease-in-out infinite 1.5s' }} />
            <div aria-hidden="true" className="gf-deco pointer-events-none select-none absolute bottom-[18%] left-[8%] h-12 w-12 bg-destructive/[0.12]" style={{ animation: 'gf-drift-c 9s ease-in-out infinite 3s' }} />
            <div aria-hidden="true" className="gf-deco pointer-events-none select-none absolute top-[22%] right-[22%] h-6 w-6 bg-destructive/[0.18]" style={{ animation: 'gf-drift-a 7s ease-in-out infinite 0.8s' }} />
            <div aria-hidden="true" className="gf-deco pointer-events-none select-none absolute bottom-[30%] right-[8%] h-8 w-20 border border-white/[0.03]" style={{ animation: 'gf-drift-b 12s ease-in-out infinite 2s' }} />
            <div
              aria-hidden="true"
              className="pointer-events-none select-none absolute -bottom-16 -right-10 font-heading leading-none"
              style={{ fontSize: '22rem', fontWeight: 900, color: 'hsl(var(--destructive))', opacity: 0.04, letterSpacing: '-0.04em' }}
            >
              GF
            </div>
          </>
        )}

        <div
          className={cn(
            'relative flex min-h-screen flex-col items-center justify-center px-6 py-16 transition-opacity duration-200',
            fading && 'opacity-0',
          )}
        >
          <div className={cn('w-full', isDarkStep ? 'max-w-lg' : step === 'review' ? 'max-w-2xl' : 'max-w-lg')}>

            {/* ── GymFlow wordmark (upload step only) ── */}
            {isDarkStep && (
              <div className="mb-12 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center bg-destructive shrink-0">
                  <span className="font-heading text-white leading-none" style={{ fontSize: '28px', letterSpacing: '3px', fontWeight: 900 }}>GF</span>
                </div>
                <span className="font-heading font-black text-white tracking-tight" style={{ fontSize: '2rem', letterSpacing: '-0.02em' }}>GymFlow</span>
              </div>
            )}

            {/* ── Stepper (not on upload step) ── */}
            {!isDarkStep && entryMode === 'import' && step !== 'success' && (
              <nav
                role="navigation"
                aria-label={lang === 'ar' ? 'خطوات الاستيراد' : 'Import steps'}
                className="mb-10"
              >
                <ol className="flex items-start">
                  {IMPORT_STEPS.map((s, i) => {
                    const isComplete = importStepComplete[i];
                    const isActive = i === importStepIndex;
                    const connectorColor = isComplete ? 'bg-destructive' : 'bg-border';
                    return (
                      <li
                        key={s.key}
                        aria-current={isActive ? 'step' : undefined}
                        aria-label={`${lang === 'ar' ? 'الخطوة' : 'Step'} ${i + 1} ${lang === 'ar' ? 'من' : 'of'} ${IMPORT_STEPS.length}: ${labels[s.labelKey]}${isComplete ? (lang === 'ar' ? ' — مكتملة' : ' — completed') : isActive ? (lang === 'ar' ? ' — الحالية' : ' — current') : ''}`}
                        className={cn('flex flex-col items-center', i < IMPORT_STEPS.length - 1 && 'flex-1')}
                      >
                        <div className="flex w-full items-center">
                          {i > 0 && (
                            <div className={cn('h-0.5 flex-1 min-w-4', isComplete || isActive ? 'bg-destructive' : 'bg-border')} />
                          )}
                          <div
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center text-xs font-bold transition-colors',
                              isComplete
                                ? 'bg-destructive text-white'
                                : isActive
                                ? 'border-2 border-destructive text-destructive'
                                : 'border-2 border-border text-muted-foreground',
                            )}
                          >
                            {isComplete ? <Check className="h-4 w-4" /> : i + 1}
                          </div>
                          {i < IMPORT_STEPS.length - 1 && (
                            <div className={cn('h-0.5 flex-1 min-w-4', connectorColor)} />
                          )}
                        </div>
                        <p className={cn('mt-2 text-center text-xs whitespace-nowrap', isActive ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                          {labels[s.labelKey]}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            )}

            {/* ── Manual stepper ── */}
            {!isDarkStep && entryMode === 'manual_setup' && step !== 'checklist' && (
              <nav
                role="navigation"
                aria-label={lang === 'ar' ? 'خطوات الإعداد' : 'Setup steps'}
                className="mb-10"
              >
                <ol className="flex items-start">
                  {MANUAL_STEPS.map((s, i) => {
                    const isComplete = manualStepComplete[i];
                    const isActive = i === (step === 'setup' ? 0 : 1);
                    const connectorColor = isComplete ? 'bg-destructive' : 'bg-border';
                    return (
                      <li
                        key={s.key}
                        aria-current={isActive ? 'step' : undefined}
                        className={cn('flex flex-col items-center', i < MANUAL_STEPS.length - 1 && 'flex-1')}
                      >
                        <div className="flex w-full items-center">
                          {i > 0 && (
                            <div className={cn('h-0.5 flex-1 min-w-4', isComplete || isActive ? 'bg-destructive' : 'bg-border')} />
                          )}
                          <div
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center text-xs font-bold transition-colors',
                              isComplete ? 'bg-destructive text-white' : isActive ? 'border-2 border-destructive text-destructive' : 'border-2 border-border text-muted-foreground',
                            )}
                          >
                            {isComplete ? <Check className="h-4 w-4" /> : i + 1}
                          </div>
                          {i < MANUAL_STEPS.length - 1 && (
                            <div className={cn('h-0.5 flex-1 min-w-4', connectorColor)} />
                          )}
                        </div>
                        <p className={cn('mt-2 text-center text-xs whitespace-nowrap', isActive ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                          {labels[s.labelKey]}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            )}

            {/* ── Confirmation modal ── */}
            {showConfirmModal && preview && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                <div
                  className="absolute inset-0 bg-black/60"
                  onClick={executing ? undefined : (() => setShowConfirmModal(false))}
                />
                <div
                  className="relative w-full max-w-sm border-2 border-border bg-background"
                  style={{ boxShadow: '6px 6px 0 hsl(var(--foreground) / 0.15)' }}
                >
                  <div className="h-1 w-full bg-destructive" />
                  <div className="p-6 space-y-4">
                    <h2 className="font-heading text-xl font-bold tracking-tight">
                      {labels.confirmTitle(preview.summary.estimatedMembersToCreate)}
                    </h2>
                    <p className="text-sm text-muted-foreground">{labels.confirmBody}</p>
                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        onClick={handleExecute}
                        disabled={executing}
                        className={cn('w-full py-4 text-base', executing && 'animate-pulse')}
                      >
                        {executing ? labels.importingLabel : labels.confirmExecute}
                      </Button>
                      <button
                        type="button"
                        onClick={executing ? undefined : (() => setShowConfirmModal(false))}
                        disabled={executing}
                        className={cn('w-full border-2 border-border py-2 text-sm transition-colors', executing ? 'text-muted-foreground/50 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground')}
                      >
                        {labels.confirmCancel}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* STEP: UPLOAD (dark background)                           */}
            {/* ══════════════════════════════════════════════════════════ */}
            {step === 'upload' && (
              <div className="space-y-6">
                <div>
                  <h1 className={cn(
                    'font-heading font-bold tracking-tight',
                    isDarkStep ? 'text-3xl text-white' : 'text-2xl text-foreground',
                  )}>
                    {variant === 'onboarding' ? labels.welcomeTitle : labels.uploadTitle}
                  </h1>
                  <p className={cn('mt-2 text-sm', isDarkStep ? 'text-[#aaaaaa]' : 'text-muted-foreground')}>
                    {variant === 'onboarding' ? labels.welcomeSub : labels.uploadHint}
                  </p>
                </div>

                {/* Drop zone */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={lang === 'ar' ? 'منطقة رفع الملف' : 'File upload area'}
                  className={cn(
                    'border-2 border-dashed flex flex-col items-center justify-center gap-3 py-14 px-6 text-center cursor-pointer transition-colors',
                    isDarkStep
                      ? cn('border-white/20', dragging && 'border-white/40 bg-white/5', file && 'py-10')
                      : cn('border-border', dragging && 'border-foreground/40 bg-muted/30', file && 'py-10'),
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
                      <FileSpreadsheet className={cn('h-8 w-8', isDarkStep ? 'text-[#888888]' : 'text-muted-foreground')} />
                      <p className={cn('text-sm font-medium break-all max-w-xs', isDarkStep ? 'text-white' : 'text-foreground')}>
                        {file.name}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className={cn('flex items-center gap-1 text-xs transition-colors', isDarkStep ? 'text-[#666666] hover:text-[#aaaaaa]' : 'text-muted-foreground hover:text-foreground')}
                      >
                        <X className="h-3 w-3" />
                        {labels.removeFile}
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className={cn('h-7 w-7', isDarkStep ? 'text-[#555555]' : 'text-muted-foreground')} />
                      <p className={cn('text-sm', isDarkStep ? 'text-[#888888]' : 'text-muted-foreground')}>
                        {labels.dropHint}{' '}
                        <span className={cn('underline underline-offset-2', isDarkStep ? 'text-white' : 'text-foreground')}>
                          {labels.browse}
                        </span>
                      </p>
                      <p className={cn('text-xs', isDarkStep ? 'text-[#555555]' : 'text-muted-foreground')}>
                        {labels.accept}
                      </p>
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
                    className={cn('w-full py-6 text-base', isDarkStep && 'bg-destructive text-white hover:bg-destructive/90')}
                  >
                    {uploading ? labels.uploading : labels.upload}
                  </Button>
                )}

                {/* Template link */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className={cn('text-xs underline underline-offset-2 transition-colors', isDarkStep ? 'text-[#555555] hover:text-[#888888]' : 'text-muted-foreground hover:text-foreground')}
                  >
                    {labels.templateButton}
                  </button>
                </div>

                {/* Skip link (onboarding only) */}
                {variant === 'onboarding' && (
                  <div className={cn('pt-4 text-center border-t', isDarkStep ? 'border-white/10' : 'border-border')}>
                    <button
                      type="button"
                      onClick={handleStartFresh}
                      className={cn('text-xs transition-colors', isDarkStep ? 'text-[#444444] hover:text-[#777777]' : 'text-muted-foreground hover:text-foreground')}
                    >
                      {labels.skipLink}
                    </button>
                  </div>
                )}

                {/* Non-onboarding skip link (import variant) */}
                {variant === 'import' && (
                  <div className={cn('pt-4 text-center border-t', isDarkStep ? 'border-white/10' : 'border-border')}>
                    <button
                      type="button"
                      onClick={handleStartFresh}
                      className={cn('text-xs transition-colors', isDarkStep ? 'text-[#444444] hover:text-[#777777]' : 'text-muted-foreground hover:text-foreground')}
                    >
                      {labels.secondaryCta}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* STEP: MAP COLUMNS                                       */}
            {/* ══════════════════════════════════════════════════════════ */}
            {step === 'map' && artifact && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-heading text-3xl font-bold tracking-tight">{labels.mappingTitle}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">{labels.mappingHint}</p>
                </div>

                {/* Required fields */}
                <div className="space-y-0 divide-y divide-border border border-border">
                  {FIELD_CONFIG.filter((f) => f.required).map((field) => (
                    <div key={field.key} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-foreground truncate">{field.label[lang]}</span>
                        <span className="shrink-0 text-xs font-medium text-destructive">{labels.required}</span>
                      </div>
                      <Select
                        value={mapping[field.key] || NONE}
                        onValueChange={(v) => setMapping((current) => setMappingFieldValue(current, field.key, v === NONE ? undefined : v))}
                      >
                        <SelectTrigger className="w-40 shrink-0">
                          <SelectValue placeholder={labels.sourceColumn} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>{labels.doNotImport}</SelectItem>
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
                    {labels.importOptions}
                  </p>
                  <div className="space-y-0 divide-y divide-border border border-border">
                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                      <span className="text-sm text-foreground truncate">{labels.dateFormatLabel}</span>
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
                    {!mapping.gender && (
                      <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <span className="text-sm text-foreground truncate">{labels.genderDefault}</span>
                        <Select value={genderDefault} onValueChange={(v: 'male' | 'female') => setGenderDefault(v)}>
                          <SelectTrigger className="w-40 shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">{labels.male}</SelectItem>
                            <SelectItem value="female">{labels.female}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional fields toggle */}
                <button
                  type="button"
                  onClick={() => setShowOptionalFields(!showOptionalFields)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showOptionalFields ? labels.hideFields : labels.moreFields}
                </button>

                {showOptionalFields && (
                  <div className="space-y-0 divide-y divide-border border border-border">
                    {FIELD_CONFIG.filter((f) => !f.required).map((field) => (
                      <div key={field.key} className="flex items-center justify-between gap-4 px-4 py-3">
                        <span className="text-sm text-muted-foreground truncate">{field.label[lang]}</span>
                        <Select
                          value={mapping[field.key] || NONE}
                          onValueChange={(v) => setMapping((current) => setMappingFieldValue(current, field.key, v === NONE ? undefined : v))}
                        >
                          <SelectTrigger className="w-40 shrink-0">
                            <SelectValue placeholder={labels.doNotImport} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>{labels.doNotImport}</SelectItem>
                            {artifact.headers.map((h) => (
                              <SelectItem key={`${field.key}-${h}`} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}

                {/* Safety note — progressive disclosure */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowSafety(!showSafety)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSafety ? labels.hideSafety : labels.showSafety}
                  </button>
                  {showSafety && (
                    <div className="mt-2 border border-border p-4 space-y-1 text-sm text-muted-foreground">
                      <p>1. {labels.importSafety1}</p>
                      <p>2. {labels.importSafety2}</p>
                      <p>3. {labels.importSafety3}</p>
                      <p>4. {labels.importSafety4}</p>
                    </div>
                  )}
                </div>

                {/* Template columns toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowTemplate(!showTemplate)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showTemplate ? labels.hideTemplate : labels.showTemplate}
                  </button>
                  {showTemplate && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {TEMPLATE_HEADERS.map((column) => (
                        <Badge key={column} className="bg-muted text-muted-foreground border border-border">
                          {column}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {previewing ? (
                  <div className="border-2 border-border p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-destructive animate-pulse shrink-0" />
                      <p className="font-heading font-bold tracking-tight">{labels.previewing}</p>
                    </div>
                    <div className="space-y-3">
                      {PREVIEW_PHASES.map((phase, i) => (
                        <div
                          key={phase.key}
                          className={cn(
                            'flex items-center gap-3 transition-all duration-300',
                            i <= previewPhase ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden',
                          )}
                        >
                          <div className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center',
                            i < previewPhase
                              ? 'text-destructive'
                              : i === previewPhase
                              ? 'text-foreground'
                              : 'text-muted-foreground',
                          )}>
                            {i < previewPhase ? (
                              <Check className="h-4 w-4" />
                            ) : i === previewPhase ? (
                              <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                            ) : (
                              <div className="h-2 w-2 rounded-full bg-border" />
                            )}
                          </div>
                          <span className={cn(
                            'text-sm',
                            i < previewPhase ? 'text-muted-foreground line-through' : i === previewPhase ? 'text-foreground font-medium' : 'text-muted-foreground',
                          )}>
                            {phase.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handlePreview}
                    disabled={!canPreview}
                    className="w-full py-6 text-base"
                  >
                    {labels.previewButton}
                  </Button>
                )}

                {!previewing && (
                  <button
                    type="button"
                    onClick={() => navigate('upload')}
                    className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {lang === 'ar' ? '→' : '←'} {labels.back}
                  </button>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* STEP: REVIEW                                             */}
            {/* ══════════════════════════════════════════════════════════ */}
            {step === 'review' && preview && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-heading text-3xl font-bold tracking-tight">
                    {readiness.hasBlockingRows ? labels.fixIssuesTitle : labels.stepReview}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {readiness.hasBlockingRows ? labels.fixIssuesHint : labels.preImportSafetyNote}
                  </p>
                </div>

                {/* Alerts */}
                {readiness.hasBlockingRows ? (
                  <Alert variant="warning">
                    <CircleAlert className="h-4 w-4" />
                    <AlertTitle>{labels.previewBlockedTitle}</AlertTitle>
                    <AlertDescription>{labels.previewBlockedBody}</AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="success">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>{labels.previewCleanTitle}</AlertTitle>
                    <AlertDescription>{labels.previewCleanBody}</AlertDescription>
                  </Alert>
                )}

                {preview.summary.duplicateRows > 0 && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>{labels.duplicatesSafeTitle}</AlertTitle>
                    <AlertDescription>{labels.duplicatesSafeBody}</AlertDescription>
                  </Alert>
                )}

                {preview.summary.estimatedMembersToCreate <= 0 && (
                  <Alert variant="warning">
                    <CircleAlert className="h-4 w-4" />
                    <AlertTitle>{labels.noNewMembersTitle}</AlertTitle>
                    <AlertDescription>{labels.noNewMembersBody}</AlertDescription>
                  </Alert>
                )}

                {/* Hero stat */}
                <div className="py-4">
                  <p className="font-stat tracking-wide text-8xl tabular-nums text-foreground leading-none">
                    {preview.summary.estimatedMembersToCreate}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{labels.membersReady}</p>
                </div>

                {/* Supporting stats */}
                <div className="grid grid-cols-3 divide-x divide-border border border-border">
                  <div className="px-4 py-3 text-center">
                    <p className="font-stat tracking-wide text-2xl tabular-nums">
                      {preview.summary.estimatedSubscriptionsToCreate}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{labels.subscriptionsToCreate}</p>
                  </div>
                  <div className="px-4 py-3 text-center">
                    <p className="font-stat tracking-wide text-2xl tabular-nums">
                      {preview.summary.duplicateRows}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{labels.duplicateRows}</p>
                  </div>
                  <div className="px-4 py-3 text-center">
                    <p className={cn('font-stat tracking-wide text-2xl tabular-nums', preview.summary.warningRows > 0 && 'text-warning')}>
                      {preview.summary.warningRows + preview.summary.invalidRows}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{labels.issues}</p>
                  </div>
                </div>

                {/* Issue table */}
                {issueRows.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-semibold">{labels.sampleRows}</h3>
                      <Button variant="outline" onClick={handleDownloadIssuesCsv} className="gap-2">
                        <Download className="h-4 w-4" />
                        {labels.issueCsv}
                      </Button>
                    </div>
                    <Table aria-label={lang === 'ar' ? 'صفوف تحتاج مراجعة' : 'Rows that need review'}>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{labels.row}</TableHead>
                          <TableHead>{labels.status}</TableHead>
                          <TableHead>{labels.issues}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {issueRows.map((row) => (
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
                  </div>
                )}

                {/* Execute section */}
                {!readiness.hasBlockingRows && (
                  <>
                    <div className="border border-border p-4 space-y-3">
                      <p className="text-sm font-medium text-foreground">{labels.executeChecklistTitle}</p>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="confirm-import-rows"
                          checked={executeChecks.reviewedRows}
                          onCheckedChange={(checked) =>
                            setExecuteChecks((current) => ({ ...current, reviewedRows: Boolean(checked) }))
                          }
                        />
                        <Label htmlFor="confirm-import-rows" className="cursor-pointer font-normal leading-6">
                          {labels.executeCheckRows}
                        </Label>
                      </div>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="confirm-import-safety"
                          checked={executeChecks.understoodSafety}
                          onCheckedChange={(checked) =>
                            setExecuteChecks((current) => ({ ...current, understoodSafety: Boolean(checked) }))
                          }
                        />
                        <Label htmlFor="confirm-import-safety" className="cursor-pointer font-normal leading-6">
                          {labels.executeCheckSafety}
                        </Label>
                      </div>
                    </div>

                    <Button
                      onClick={() => setShowConfirmModal(true)}
                      disabled={!readiness.canExecuteImport || executing}
                      className={cn('w-full py-6 text-base', executing && 'animate-pulse')}
                    >
                      {executing ? labels.importingLabel : labels.executeButton(preview.summary.estimatedMembersToCreate)}
                    </Button>
                    {executing && (
                      <div className="border-2 border-border p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full bg-destructive animate-pulse shrink-0" />
                          <p className="font-heading font-bold tracking-tight text-sm">{labels.importingLabel}</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center text-destructive">
                              <Check className="h-4 w-4" />
                            </div>
                            <span className="text-sm text-muted-foreground line-through">
                              {lang === 'ar' ? 'إرسال البيانات...' : 'Sending data...'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                            <span className="text-sm font-medium text-foreground">
                              {lang === 'ar' ? 'جاري الاستيراد...' : 'Importing clients...'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => navigate('map')}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {lang === 'ar' ? '→' : '←'} {labels.back}
                </button>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* STEP: SUCCESS + GO-LIVE CHECKLIST                        */}
            {/* ══════════════════════════════════════════════════════════ */}
            {step === 'success' && (
              <div
                className={cn(
                  'space-y-6 transition-all duration-500 ease-out',
                  successVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
                )}
              >
                {/* Import results */}
                {execution && (
                  <>
                    <div className="gf-animate" style={{ animation: successVisible ? 'gf-check-in 0.4s cubic-bezier(0.25, 1, 0.5, 1) both' : 'none' }}>
                      <div className="flex h-20 w-20 items-center justify-center bg-destructive">
                        <Check className="h-10 w-10 text-white" />
                      </div>
                    </div>

                    <div className="gf-animate" style={{ animation: successVisible ? 'gf-slide-up 0.4s cubic-bezier(0.25, 1, 0.5, 1) 0.15s both' : 'none' }}>
                      <h1 className="font-heading text-3xl font-bold tracking-tight">{labels.importComplete}</h1>
                      <p className="mt-2 text-muted-foreground">
                        {labels.importedSuccessBody(execution.importedMembers)}
                      </p>
                    </div>

                    <div
                      className="grid grid-cols-3 divide-x divide-border border border-border gf-animate"
                      style={{ animation: successVisible ? 'gf-slide-up-delay-1 0.4s cubic-bezier(0.25, 1, 0.5, 1) both' : 'none' }}
                    >
                      <div className="px-4 py-3 text-center">
                        <p className="font-stat tracking-wide text-2xl tabular-nums text-foreground">
                          {execution.importedMembers}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{labels.importedMembers}</p>
                      </div>
                      <div className="px-4 py-3 text-center">
                        <p className="font-stat tracking-wide text-2xl tabular-nums">
                          {execution.skippedRows}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{labels.skippedRows}</p>
                      </div>
                      <div className="px-4 py-3 text-center">
                        <p className={cn('font-stat tracking-wide text-2xl tabular-nums', execution.failedRows > 0 && 'text-warning')}>
                          {execution.failedRows}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{labels.failedRows}</p>
                      </div>
                    </div>

                    {execution.failedRows > 0 && (
                      <div className="border-2 border-border p-4 space-y-2">
                        <p className="text-sm text-foreground">{labels.importedSuccessBody(execution.failedRows)}</p>
                        <button
                          type="button"
                          onClick={handleDownloadIssuesCsv}
                          className="text-xs text-foreground underline underline-offset-2 hover:text-muted-foreground transition-colors"
                        >
                          {labels.issueCsv}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Go-live checklist */}
                {checklistMode && (
                  <Card className={cn('gf-animate', !onboardingCompleted && 'mt-2')} style={{ animation: successVisible ? 'gf-slide-up-delay-2 0.4s cubic-bezier(0.25, 1, 0.5, 1) both' : 'none' }}>
                    <CardHeader>
                      <CardTitle>
                        {checklistMode === 'imported' ? labels.checklistTitleImported : labels.checklistTitleManual}
                      </CardTitle>
                      <CardDescription>
                        {checklistMode === 'imported' ? labels.checklistHintImported : labels.checklistHintManual}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {checklistItems.map((item) => (
                          <div key={item.key} className="border border-border p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  id={`checklist-${item.key}`}
                                  checked={checklist[item.key]}
                                  disabled={autoTrackedChecklistKeys.has(item.key)}
                                  onCheckedChange={(checked) => {
                                    if (autoTrackedChecklistKeys.has(item.key)) return;
                                    setChecklist((current) => ({ ...current, [item.key]: Boolean(checked) }));
                                  }}
                                  className="mt-0.5"
                                />
                                <Label
                                  htmlFor={`checklist-${item.key}`}
                                  className="text-sm text-foreground cursor-pointer font-normal leading-6"
                                >
                                  {item.label}
                                </Label>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleChecklistActionClick(item)}
                              >
                                {item.actionLabel}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {!onboardingCompleted && readyToFinishOnboarding && (
                        <Button onClick={handleCompleteOnboarding} disabled={savingOnboarding} className="w-full py-6 text-base">
                          {savingOnboarding ? labels.completingOnboarding : labels.completeOnboarding}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {checklistMode && onboardingCompleted && (
                  <Card className="border-destructive/40 bg-destructive/5 gf-animate" style={{ animation: successVisible ? 'gf-slide-up-delay-3 0.4s cubic-bezier(0.25, 1, 0.5, 1) both' : 'none' }}>
                    <CardContent className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-destructive" />
                        <div className="space-y-1">
                          <p className="font-heading text-xl font-bold tracking-tight text-foreground">
                            {checklistMode === 'manual' ? labels.onboardingCompleteManual : labels.onboardingCompleteImported}
                          </p>
                          {checklistMode === 'imported' && execution ? (
                            <p className="text-muted-foreground">{labels.importedSuccessBody(execution.importedMembers)}</p>
                          ) : checklistMode === 'manual' ? (
                            <p className="text-sm text-muted-foreground">{labels.manualSuccessBody}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground">{labels.onboardingAlreadyComplete}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => router.push(checklistMode === 'manual' ? '/dashboard' : '/dashboard/members')}
                        className="shrink-0"
                      >
                        {checklistMode === 'manual' ? labels.goToDashboard : labels.goToMembers}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* STEP: MANUAL SETUP                                       */}
            {/* ══════════════════════════════════════════════════════════ */}
            {step === 'setup' && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-heading text-2xl font-bold tracking-tight">{labels.manualTitle}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">{labels.manualHint}</p>
                </div>

                <Alert>
                  <CircleAlert className="h-4 w-4" />
                  <AlertTitle>{labels.secondaryCta}</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>{labels.manualLaterHint}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigateFromOnboarding('/dashboard/settings?tab=import')}
                    >
                      {labels.openImportSettings}
                    </Button>
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { icon: UserPlus, title: labels.manualActionAddMemberTitle, body: labels.manualActionAddMemberBody, href: '/dashboard/members', actionLabel: labels.openAddMember },
                    { icon: Settings2, title: labels.manualActionWhatsappTitle, body: labels.manualActionWhatsappBody, href: '/dashboard/settings?tab=whatsapp', actionLabel: labels.openWhatsappSettings },
                    { icon: Users, title: labels.manualActionTeamTitle, body: labels.manualActionTeamBody, href: '/dashboard/pt?tab=staff', actionLabel: labels.openTeamSetup },
                    { icon: ScanLine, title: labels.manualActionCheckInTitle, body: labels.manualActionCheckInBody, href: '/dashboard', actionLabel: labels.openCheckIn },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="border border-border p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-none bg-primary/10 p-2 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">{item.title}</p>
                              <p className="text-sm text-muted-foreground">{item.body}</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => navigateFromOnboarding(item.href)}
                            >
                              {item.actionLabel}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!checklistMode && (
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() => { setCompletionMode('manual'); navigate('checklist'); }}
                      className="gap-2"
                    >
                      {labels.manualContinue}
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleBackToImport}
                    >
                      {labels.backToImport}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* STEP: MANUAL CHECKLIST                                   */}
            {/* ══════════════════════════════════════════════════════════ */}
            {step === 'checklist' && (
              <div
                className={cn(
                  'space-y-6 transition-all duration-500 ease-out',
                  step4Visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
                )}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>{labels.checklistTitleManual}</CardTitle>
                    <CardDescription>{labels.checklistHintManual}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {checklistItems.map((item) => (
                        <div key={item.key} className="border border-border p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={`checklist-${item.key}`}
                                checked={checklist[item.key]}
                                disabled={autoTrackedChecklistKeys.has(item.key)}
                                onCheckedChange={(checked) => {
                                  if (autoTrackedChecklistKeys.has(item.key)) return;
                                  setChecklist((current) => ({ ...current, [item.key]: Boolean(checked) }));
                                }}
                                className="mt-0.5"
                              />
                              <Label
                                htmlFor={`checklist-${item.key}`}
                                className="text-sm text-foreground cursor-pointer font-normal leading-6"
                              >
                                {item.label}
                              </Label>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleChecklistActionClick(item)}
                            >
                              {item.actionLabel}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!onboardingCompleted && readyToFinishOnboarding && (
                      <Button onClick={handleCompleteOnboarding} disabled={savingOnboarding} className="w-full py-6 text-base">
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
                            {labels.onboardingCompleteManual}
                          </p>
                          <p className="text-sm text-muted-foreground">{labels.manualSuccessBody}</p>
                        </div>
                      </div>
                      <Button onClick={() => router.push('/dashboard')} className="shrink-0">
                        {labels.goToDashboard}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
