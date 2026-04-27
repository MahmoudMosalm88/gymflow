'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  FileSpreadsheet,
  FileUp,
  Rocket,
  ScanLine,
  Settings2,
  UserPlus,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import {
  canExecuteImportedMembers,
  hasBlockingInvalidRows,
  hasBlockingRows,
  hasBlockingWarningRows,
} from '@/lib/import-onboarding';
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

type ImportOnboardingFlowProps = {
  variant?: 'import' | 'onboarding';
};

const NONE = '__none__';

const copy = {
  en: {
    titleOnboarding: 'Set up your gym in GymFlow',
    titleImport: 'Import your member list',
    subtitleOnboarding:
      'Start by bringing over your current members. If you prefer to begin manually, you can still import later from Settings at any time.',
    subtitleImport:
      'Bring over your current members, review exactly what GymFlow will add, then finish a short go-live checklist.',
    recommended: 'Recommended',
    modeTitle: 'The fastest way to start is to import your member list',
    modeHint:
      'If you already have members in another sheet or system, bring them in first so this branch starts with the right people and subscriptions.',
    modeSpreadsheetHint:
      'Upload a CSV or Excel file, match the columns, fix blocked rows, and import only the clean rows.',
    primaryCta: 'Import your member list',
    secondaryCta: 'Start without importing',
    secondaryHint: 'If you want to begin manually today, that is fine.',
    secondaryRecovery:
      'You can keep setting up now and import your old member list later from Settings at any time.',
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
    uploadTitle: 'Upload your member list',
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
      'GymFlow did not find any new members to create from this file. Check the duplicate rows and your column mapping.',
    executeTitle: 'Import the clean rows',
    executeHint:
      'Once the sheet is clean, GymFlow will add only the new members shown here. Existing members stay untouched.',
    executeChecklistTitle: 'Before you import',
    executeCheckRows:
      'I reviewed the preview and understand which rows will be created versus safely skipped.',
    executeCheckSafety:
      'I understand GymFlow will add only new members and skip exact phone or card duplicates.',
    executeButton: (count: number) => `Import ${count} clean members`,
    executing: 'Importing...',
    membersToCreate: 'Members to create',
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
    importedMembers: 'Imported members',
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
    manualActionAddMemberTitle: 'Add your first member',
    manualActionAddMemberBody:
      'Create one real member so the front desk has something to work with immediately.',
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
    checklistReviewMembers: 'Review your imported members',
    checklistAddFirstMember: 'Add your first member',
    checklistConnectWhatsapp: 'Connect WhatsApp from Settings',
    checklistAddTeam: 'Add PT/staff who will use this branch',
    checklistTestCheckIn: 'Test one real check-in',
    checklistReviewReminders: 'Review reminder automation before using it live',
    checklistImportLater:
      'Remember you can import your old member list later from Settings at any time',
    completeOnboarding: 'Finish onboarding',
    completingOnboarding: 'Saving...',
    onboardingCompleteImported: 'Your gym is ready.',
    onboardingCompleteManual: 'You can start manually now.',
    onboardingAlreadyComplete: 'Onboarding is already completed for this branch.',
    importedSuccessBody: (count: number) => `${count} imported members are waiting for you.`,
    manualSuccessBody:
      'Keep adding members now, and remember you can import your old member list later from Settings at any time.',
    goToMembers: 'Open members',
    goToDashboard: 'Open dashboard',
    openMembers: 'Open members',
    openAddMember: 'Add member',
    openWhatsappSettings: 'Open WhatsApp settings',
    openTeamSetup: 'Open PT/staff setup',
    openCheckIn: 'Open dashboard scanner',
    openReminders: 'Open reminder settings',
    importSafetyTitle: 'Import safety rules',
    importSafety1:
      'Imported legacy members are marked so onboarding automations do not send welcome sequences.',
    importSafety2:
      'Imported active subscriptions can still receive future renewal reminders after import.',
    importSafety3: 'Exact phone or card duplicates are skipped safely instead of being imported again.',
    importSafety4: 'Imported amount_paid is kept for context but not posted as new live revenue.',
    templateDownloaded: 'Template downloaded.',
    issueDownloadFailed: 'Could not download the issues CSV.',
    onboardingSaveFailed: 'Could not mark onboarding complete.',
    onboardingSaved: 'Onboarding marked complete.',
    format: 'Format',
    preImportSafetyNote: 'GymFlow adds only new members from this file. Existing members stay safe.',
    dateFormatLabel: 'Date format in your file',
    dateFormatHint: 'Choose the format used in your date columns.',
    sendWelcomeEmailLabel: 'Send a welcome email to imported members',
    sendWelcomeEmailHint:
      'Members will receive an email to set their password. Turn this off if you want to tell them yourself.',
    importProgress: 'Importing your members...',
    active: 'Active',
  },
  ar: {
    titleOnboarding: 'جهّز جيمك على GymFlow',
    titleImport: 'استورد قائمة الأعضاء',
    subtitleOnboarding:
      'ابدأ بنقل الأعضاء الحاليين أولاً. وإذا فضّلت البدء يدوياً، يمكنك الاستيراد لاحقاً من الإعدادات في أي وقت.',
    subtitleImport:
      'انقل أعضاءك الحاليين، راجع ما سيضيفه GymFlow بالضبط، ثم أنهِ قائمة تشغيل قصيرة قبل البدء.',
    recommended: 'الاختيار المقترح',
    modeTitle: 'أسرع طريقة للبدء هي استيراد قائمة الأعضاء',
    modeHint:
      'إذا كان لديك أعضاء في ملف أو نظام آخر، استوردهم أولاً ليبدأ هذا الفرع بالأشخاص والاشتراكات الصحيحة.',
    modeSpreadsheetHint:
      'ارفع ملف CSV أو Excel، طابق الأعمدة، أصلح الصفوف الممنوعة، ثم استورد الصفوف النظيفة فقط.',
    primaryCta: 'استورد قائمة الأعضاء',
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
    uploadTitle: 'ارفع قائمة الأعضاء',
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
    noNewMembersTitle: 'لا يوجد أعضاء جدد للاستيراد حالياً.',
    noNewMembersBody:
      'GymFlow لم يجد أعضاء جدداً لإنشائهم من هذا الملف. راجع الصفوف المكررة ومطابقة الأعمدة.',
    executeTitle: 'استورد الصفوف النظيفة',
    executeHint:
      'بعد تنظيف الملف، سيضيف GymFlow الأعضاء الجدد الظاهرين هنا فقط. الأعضاء الحاليون لن يتأثروا.',
    executeChecklistTitle: 'قبل الاستيراد',
    executeCheckRows:
      'راجعت المعاينة وأفهم أي الصفوف سيتم إنشاؤها وأي الصفوف سيتم تخطيها بأمان.',
    executeCheckSafety:
      'أفهم أن GymFlow سيضيف الأعضاء الجدد فقط وسيتخطى التكرارات المطابقة للهاتف أو الكارت.',
    executeButton: (count: number) => `استورد ${count} عضواً نظيفاً`,
    executing: 'جاري الاستيراد...',
    membersToCreate: 'الأعضاء الذين سيتم إنشاؤهم',
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
    importedMembers: 'الأعضاء المستوردون',
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
    manualActionAddMemberTitle: 'أضف أول عضو',
    manualActionAddMemberBody:
      'أنشئ عضواً حقيقياً واحداً ليبدأ الاستقبال العمل مباشرة.',
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
    checklistReviewMembers: 'راجع الأعضاء الذين تم استيرادهم',
    checklistAddFirstMember: 'أضف أول عضو',
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
    importedSuccessBody: (count: number) => `${count} عضواً مستورداً في انتظارك.`,
    manualSuccessBody:
      'ابدأ بإضافة الأعضاء الآن، وتذكّر أنك تستطيع استيراد قائمتك القديمة لاحقاً من الإعدادات في أي وقت.',
    goToMembers: 'افتح الأعضاء',
    goToDashboard: 'افتح الداشبورد',
    openMembers: 'افتح الأعضاء',
    openAddMember: 'أضف عضواً',
    openWhatsappSettings: 'افتح واتساب',
    openTeamSetup: 'افتح PT/Staff',
    openCheckIn: 'افتح الماسح',
    openReminders: 'افتح التذكيرات',
    importSafetyTitle: 'قواعد الأمان في الاستيراد',
    importSafety1:
      'الأعضاء المستوردون يتم تعليمهم كبيانات قديمة حتى لا تُرسل لهم رسائل الترحيب التلقائية.',
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
    preImportSafetyNote: 'GymFlow يضيف الأعضاء الجدد فقط من هذا الملف. الأعضاء الحاليون في أمان.',
    dateFormatLabel: 'صيغة التاريخ في ملفك',
    dateFormatHint: 'اختر الصيغة المستخدمة في أعمدة التواريخ.',
    sendWelcomeEmailLabel: 'إرسال بريد ترحيب للأعضاء المستوردين',
    sendWelcomeEmailHint:
      'سيستقبل الأعضاء بريداً إلكترونياً لتفعيل حسابهم. أوقف هذا إذا أردت إخبارهم بنفسك.',
    importProgress: 'جاري استيراد أعضائك...',
    active: 'نشط',
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

  const [entryMode, setEntryMode] = useState<EntryMode>('import');
  const [completionMode, setCompletionMode] = useState<OnboardingCompletionMode | null>(null);
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
    artifact &&
      mapping.member_name &&
      mapping.phone &&
      (mapping.gender || genderDefault)
  );

  const readiness = useMemo(
    () => ({
      hasBlockingInvalidRows: hasBlockingInvalidRows(preview),
      hasBlockingWarningRows: hasBlockingWarningRows(preview),
      hasBlockingRows: hasBlockingRows(preview),
      canExecuteImport: canExecuteImportedMembers(preview, executeChecks),
    }),
    [preview, executeChecks]
  );

  const checklistMode = completionMode ?? (execution ? 'imported' : null);
  const issueRows = useMemo(
    () => preview?.rows.filter((row) => row.status !== 'valid') ?? [],
    [preview]
  );

  const checklistItems = useMemo(() => {
    if (checklistMode === 'imported') {
      return [
        {
          key: 'reviewImportedMembers' as const,
          label: labels.checklistReviewMembers,
          href: '/dashboard/members',
          actionLabel: labels.openMembers,
        },
        {
          key: 'connectWhatsapp' as const,
          label: labels.checklistConnectWhatsapp,
          href: '/dashboard/settings?tab=whatsapp',
          actionLabel: labels.openWhatsappSettings,
        },
        {
          key: 'addTeam' as const,
          label: labels.checklistAddTeam,
          href: '/dashboard/pt?tab=staff',
          actionLabel: labels.openTeamSetup,
        },
        {
          key: 'testCheckIn' as const,
          label: labels.checklistTestCheckIn,
          href: '/dashboard',
          actionLabel: labels.openCheckIn,
        },
        {
          key: 'reviewReminders' as const,
          label: labels.checklistReviewReminders,
          href: '/dashboard/whatsapp',
          actionLabel: labels.openReminders,
        },
      ];
    }

    if (checklistMode === 'manual') {
      return [
        {
          key: 'addFirstMember' as const,
          label: labels.checklistAddFirstMember,
          href: '/dashboard/members/new',
          actionLabel: labels.openAddMember,
        },
        {
          key: 'connectWhatsapp' as const,
          label: labels.checklistConnectWhatsapp,
          href: '/dashboard/settings?tab=whatsapp',
          actionLabel: labels.openWhatsappSettings,
        },
        {
          key: 'addTeam' as const,
          label: labels.checklistAddTeam,
          href: '/dashboard/pt?tab=staff',
          actionLabel: labels.openTeamSetup,
        },
        {
          key: 'testCheckIn' as const,
          label: labels.checklistTestCheckIn,
          href: '/dashboard',
          actionLabel: labels.openCheckIn,
        },
        {
          key: 'rememberImportLater' as const,
          label: labels.checklistImportLater,
          href: '/dashboard/settings?tab=import',
          actionLabel: labels.openImportSettings,
        },
      ];
    }

    return [];
  }, [checklistMode, labels]);

  const allChecklistChecked = checklistItems.length > 0 && checklistItems.every((item) => checklist[item.key]);

  const steps = useMemo(() => {
    if (entryMode === 'manual_setup') {
      return [
        { key: 'manual', label: labels.stepManual, complete: checklistMode === 'manual' || onboardingCompleted },
        { key: 'goLive', label: labels.stepGoLive, complete: onboardingCompleted },
      ];
    }

    return [
      { key: 'upload', label: labels.stepUpload, complete: Boolean(artifact) },
      { key: 'map', label: labels.stepMap, complete: Boolean(preview || execution) },
      { key: 'fix', label: labels.stepFix, complete: Boolean((preview && !readiness.hasBlockingRows) || execution) },
      { key: 'execute', label: labels.stepImport, complete: Boolean(execution) },
      { key: 'goLive', label: labels.stepGoLive, complete: onboardingCompleted },
    ];
  }, [artifact, entryMode, execution, labels, onboardingCompleted, preview, readiness.hasBlockingRows, checklistMode]);

  const activeStepIndex = useMemo(() => {
    const firstIncomplete = steps.findIndex((step) => !step.complete);
    return firstIncomplete === -1 ? steps.length - 1 : firstIncomplete;
  }, [steps]);

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
          duplicate_mode: 'skip_duplicates'
        }
      });
      if (!res.success || !res.data) {
        toast.error(res.message || labels.fixIssuesHint);
        return;
      }
      setPreview(res.data);
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
      setExecution(res.data);
      setCompletionMode('imported');
      toast.success(labels.successImport);
    } finally {
      setExecuting(false);
      setImportingStatus('');
    }
  }

  async function handleCompleteOnboarding() {
    if (!allChecklistChecked || !checklistMode) return;
    setSavingOnboarding(true);
    try {
      const res = await api.put('/api/settings', {
        values: {
          onboarding_completed: true,
          onboarding_mode: checklistMode === 'manual' ? 'manual_setup' : 'spreadsheet_import',
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

  const title = variant === 'onboarding' ? labels.titleOnboarding : labels.titleImport;
  const subtitle = variant === 'onboarding' ? labels.subtitleOnboarding : labels.subtitleImport;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-heading font-bold tracking-tight">{title}</h1>
          {variant === 'onboarding' && (
            <Badge className="bg-primary/10 text-primary border border-primary/30">Onboarding</Badge>
          )}
          {onboardingCompleted && (
            <Badge className="bg-success/10 text-success border border-success/30">{labels.done}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
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
                  <p className={cn('w-20 text-center text-xs', isActive ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                    {step.label}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">{labels.recommended}</Badge>
            {entryMode === 'import' && !execution && (
              <Badge className="bg-background text-foreground border border-border">{labels.active}</Badge>
            )}
          </div>
          <CardTitle>{labels.modeTitle}</CardTitle>
          <CardDescription>{labels.modeHint}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-4 border border-primary/20 bg-background p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">{labels.primaryCta}</p>
                <p className="text-sm text-muted-foreground">{labels.modeSpreadsheetHint}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  setEntryMode('import');
                  if (!execution) setCompletionMode(null);
                }}
                className="gap-2"
              >
                {labels.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                {labels.templateButton}
              </Button>
            </div>
          </div>

          {!execution && (
            <div className={cn(
              'space-y-4 border border-dashed p-5',
              entryMode === 'manual_setup' ? 'border-foreground/30 bg-background' : 'border-border bg-background/60'
            )}>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-muted p-2 text-muted-foreground">
                  <Rocket className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{labels.secondaryCta}</p>
                  <p className="text-sm text-muted-foreground">{labels.secondaryHint}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{labels.secondaryRecovery}</p>
              <Button
                variant={entryMode === 'manual_setup' ? 'default' : 'outline'}
                onClick={() => {
                  setEntryMode('manual_setup');
                  setCompletionMode(null);
                }}
              >
                {labels.secondaryCta}
              </Button>
            </div>
          )}
        </CardContent>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            {labels.desktopRestoreHint}{' '}
            <button
              type="button"
              onClick={() => router.push('/dashboard/settings?tab=backup')}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {labels.openBackupSettings}
            </button>
          </p>
        </CardContent>
      </Card>

      {entryMode === 'manual_setup' && !execution && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{labels.manualTitle}</CardTitle>
              <CardDescription>{labels.manualHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <Alert>
                <CircleAlert className="h-4 w-4" />
                <AlertTitle>{labels.secondaryCta}</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>{labels.manualLaterHint}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/dashboard/settings?tab=import')}
                  >
                    {labels.openImportSettings}
                  </Button>
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    icon: UserPlus,
                    title: labels.manualActionAddMemberTitle,
                    body: labels.manualActionAddMemberBody,
                    href: '/dashboard/members/new',
                    actionLabel: labels.openAddMember,
                  },
                  {
                    icon: Settings2,
                    title: labels.manualActionWhatsappTitle,
                    body: labels.manualActionWhatsappBody,
                    href: '/dashboard/settings?tab=whatsapp',
                    actionLabel: labels.openWhatsappSettings,
                  },
                  {
                    icon: Users,
                    title: labels.manualActionTeamTitle,
                    body: labels.manualActionTeamBody,
                    href: '/dashboard/pt?tab=staff',
                    actionLabel: labels.openTeamSetup,
                  },
                  {
                    icon: ScanLine,
                    title: labels.manualActionCheckInTitle,
                    body: labels.manualActionCheckInBody,
                    href: '/dashboard',
                    actionLabel: labels.openCheckIn,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="border border-border p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-primary/10 p-2 text-primary">
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
                            onClick={() => router.push(item.href)}
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
                    onClick={() => setCompletionMode('manual')}
                  >
                    {labels.manualContinue}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEntryMode('import');
                      setCompletionMode(null);
                    }}
                  >
                    {labels.backToImport}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {entryMode === 'import' && !execution && (
        <>
          <Card id="import-upload">
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
                <Input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
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
            <div className="grid gap-4 xl:grid-cols-2">
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
            </div>
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
                  <CardTitle>{labels.fixIssuesTitle}</CardTitle>
                  <CardDescription>{labels.fixIssuesHint}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  {issueRows.length > 0 ? (
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
                  ) : (
                    <p className="text-sm text-muted-foreground">{labels.previewCleanBody}</p>
                  )}
                </CardContent>
              </Card>

              {readiness.hasBlockingRows ? null : (
                <Card>
                  <CardHeader>
                    <CardTitle>{labels.executeTitle}</CardTitle>
                    <CardDescription>{labels.executeHint}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {preview.summary.estimatedMembersToCreate <= 0 ? (
                      <Alert variant="warning">
                        <CircleAlert className="h-4 w-4" />
                        <AlertTitle>{labels.noNewMembersTitle}</AlertTitle>
                        <AlertDescription>{labels.noNewMembersBody}</AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        <div className="space-y-3 border border-border bg-muted/20 p-4">
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
                            disabled={executing || !readiness.canExecuteImport}
                          >
                            {executing ? labels.executing : labels.executeButton(preview.summary.estimatedMembersToCreate)}
                          </Button>
                          {executing && importingStatus && (
                            <p className="text-sm text-muted-foreground animate-pulse">{importingStatus}</p>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {execution && (
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
      )}

      {checklistMode && (
        <Card>
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
                        className="text-sm text-foreground cursor-pointer font-normal leading-6"
                      >
                        {item.label}
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(item.href)}
                    >
                      {item.actionLabel}
                    </Button>
                  </div>
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
      )}

      {checklistMode && onboardingCompleted && (
        <Card className="border-destructive/40 bg-destructive/5">
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
  );
}
