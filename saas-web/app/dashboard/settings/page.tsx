'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { useAuth } from '@/lib/use-auth';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

// All bilingual UI strings in one place — update here, propagates everywhere
const copy = {
  en: {
    // Tab labels
    tab_general: 'General',
    tab_whatsapp: 'WhatsApp',
    tab_backup: 'Backup & Restore',
    tab_import: 'Import Data',
    tab_pt: 'PT',

    // Language toggle
    lang_en: 'English',
    lang_ar: 'العربية',
    lang_save_error: 'Failed to save language',

    // Scanner settings card
    scanner_card_title: 'Scanner Settings',
    scanner_card_description: 'Controls how quickly the scanner accepts back-to-back check-ins for the same member.',
    scanner_cooldown_label: 'Time Between Scans (seconds)',

    // Card code maintenance card
    card_code_card_title: 'Sync Card Codes',
    card_code_card_description: 'Run card-code sync manually only after importing legacy data.',
    card_code_button_running: 'Running...',
    card_code_button_idle: 'Run Sync Now',
    card_code_no_artifact: 'No imported artifact found to backfill.',
    card_code_success: (updated: number, skipped: number) =>
      `Sync complete. Updated ${updated}, skipped ${skipped}.`,
    card_code_error: 'Failed to run sync.',

    // PT Settings card
    pt_card_title: 'PT Settings',
    pt_card_description: 'Control the default session length, reminder timing, and deduction rules.',
    pt_session_minutes: 'Default session minutes',
    pt_low_balance: 'Low balance threshold (sessions)',
    pt_expiry_warning: 'Package expiry warning (days)',
    pt_reminder_hours: 'Session reminder (hours before)',
    pt_no_show_deducts: 'Deduct a session on no-show',
    pt_late_cancel_deducts: 'Deduct a session on late cancel',
  },
  ar: {
    // Tab labels
    tab_general: 'عام',
    tab_whatsapp: 'واتساب',
    tab_backup: 'النسخ الاحتياطي',
    tab_import: 'استيراد البيانات',
    tab_pt: 'التدريب الشخصي',

    // Language toggle
    lang_en: 'English',
    lang_ar: 'العربية',
    lang_save_error: 'فشل حفظ اللغة',

    // Scanner settings card
    scanner_card_title: 'إعدادات الماسح',
    scanner_card_description: 'يتحكم في مدى سرعة قبول الماسح للتسجيلات المتتالية لنفس العضو.',
    scanner_cooldown_label: 'الوقت بين التسجيلات (ثوان)',

    // Card code maintenance card
    card_code_card_title: 'مزامنة رموز البطاقات',
    card_code_card_description: 'تشغيل مزامنة رموز البطاقات يدويًا بعد استيراد بيانات قديمة فقط.',
    card_code_button_running: 'جاري التنفيذ...',
    card_code_button_idle: 'تشغيل المزامنة الآن',
    card_code_no_artifact: 'لا توجد بيانات استيراد سابقة للمزامنة.',
    card_code_success: (updated: number, skipped: number) =>
      `تمت المزامنة. تم تحديث ${updated} سجل، وتخطي ${skipped}.`,
    card_code_error: 'فشل تنفيذ المزامنة.',

    // PT Settings card
    pt_card_title: 'إعدادات التدريب الشخصي',
    pt_card_description: 'حدد مدة الجلسة الافتراضية والتنبيهات وسلوك خصم الجلسات.',
    pt_session_minutes: 'مدة الجلسة الافتراضية بالدقائق',
    pt_low_balance: 'حد تنبيه الجلسات المتبقية',
    pt_expiry_warning: 'أيام تنبيه قرب انتهاء الباقة',
    pt_reminder_hours: 'ساعات تذكير الجلسة قبل الموعد',
    pt_no_show_deducts: 'خصم جلسة عند عدم الحضور',
    pt_late_cancel_deducts: 'خصم جلسة عند الإلغاء المتأخر',
  },
} as const;

const TabLoading = () => (
  <div className="flex min-h-[240px] items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

// Heavy tabs load only when staff open them.
const WhatsAppTab = dynamic(() => import('@/components/dashboard/settings/WhatsAppTab'), {
  loading: () => <TabLoading />,
});
const BackupTab = dynamic(() => import('@/components/dashboard/settings/BackupTab'), {
  loading: () => <TabLoading />,
});
const ImportTab = dynamic(() => import('@/components/dashboard/settings/ImportTab'), {
  loading: () => <TabLoading />,
});

type Tab = 'general' | 'whatsapp' | 'backup' | 'import' | 'pt';

export default function SettingsPage() {
  const { lang } = useLang();
  const { profile } = useAuth();
  const labels = t[lang];
  const c = copy[lang];
  const [activeTab, setActiveTab] = useState<Tab>('general');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: c.tab_general },
    { key: 'whatsapp', label: c.tab_whatsapp },
    { key: 'backup', label: c.tab_backup },
    { key: 'import', label: c.tab_import },
    { key: 'pt', label: c.tab_pt },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-heading font-bold tracking-tight">{labels.settings}</h1>

      {/* Tab bar — role="tablist" for screen-reader accessibility */}
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-border pb-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            variant={activeTab === tab.key ? 'default' : 'ghost'}
            className="min-w-[100px]"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === 'general' && <GeneralTab />}
      {activeTab === 'whatsapp' && <WhatsAppTab />}
      {activeTab === 'backup' && <BackupTab />}
      {activeTab === 'import' && <ImportTab />}
      {activeTab === 'pt' && <PtSettingsTab />}
    </div>
  );
}

function PtSettingsTab() {
  const { lang } = useLang();
  const labels = t[lang];
  const c = copy[lang];
  const [ptSessionMinutes, setPtSessionMinutes] = useState('60');
  const [ptLowBalanceThreshold, setPtLowBalanceThreshold] = useState('2');
  const [ptExpiryWarningDays, setPtExpiryWarningDays] = useState('3');
  const [ptReminderHoursBefore, setPtReminderHoursBefore] = useState('24');
  const [ptNoShowDeducts, setPtNoShowDeducts] = useState(true);
  const [ptLateCancelDeducts, setPtLateCancelDeducts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);

  useEffect(() => {
    api.get<Record<string, string>>('/api/settings')
      .then((res) => {
        if (res.success && res.data) {
          setPtSessionMinutes(res.data.pt_session_default_minutes ?? '60');
          setPtLowBalanceThreshold(res.data.pt_low_balance_threshold_sessions ?? '2');
          setPtExpiryWarningDays(res.data.pt_expiry_warning_days ?? '3');
          setPtReminderHoursBefore(res.data.pt_reminder_hours_before ?? '24');
          setPtNoShowDeducts(String(res.data.pt_no_show_deducts ?? 'true') !== 'false');
          setPtLateCancelDeducts(String(res.data.pt_late_cancel_deducts ?? 'true') !== 'false');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put('/api/settings', {
        values: {
          pt_session_default_minutes: ptSessionMinutes,
          pt_low_balance_threshold_sessions: ptLowBalanceThreshold,
          pt_expiry_warning_days: ptExpiryWarningDays,
          pt_reminder_hours_before: ptReminderHoursBefore,
          pt_no_show_deducts: ptNoShowDeducts,
          pt_late_cancel_deducts: ptLateCancelDeducts,
        },
      });
      setMessage(res.success
        ? { type: 'success', text: labels.saved_successfully }
        : { type: 'destructive', text: res.message || labels.failed_to_save }
      );
    } catch {
      setMessage({ type: 'destructive', text: labels.failed_to_save });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Card className="shadow-[6px_6px_0_#000000]">
      <CardHeader>
        <CardTitle>{c.pt_card_title}</CardTitle>
        <CardDescription>{c.pt_card_description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="pt-session-minutes">{c.pt_session_minutes}</Label>
            <Input id="pt-session-minutes" type="number" min={15} step={15} value={ptSessionMinutes} onChange={(e) => setPtSessionMinutes(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="pt-low-balance">{c.pt_low_balance}</Label>
            <Input id="pt-low-balance" type="number" min={1} value={ptLowBalanceThreshold} onChange={(e) => setPtLowBalanceThreshold(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="pt-expiry">{c.pt_expiry_warning}</Label>
            <Input id="pt-expiry" type="number" min={1} value={ptExpiryWarningDays} onChange={(e) => setPtExpiryWarningDays(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="pt-reminder-hours">{c.pt_reminder_hours}</Label>
            <Input id="pt-reminder-hours" type="number" min={1} value={ptReminderHoursBefore} onChange={(e) => setPtReminderHoursBefore(e.target.value)} className="mt-1" />
          </div>
        </div>
        <Separator />
        {/* Styled toggle checkboxes using accent-destructive */}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ptNoShowDeducts}
              onChange={(e) => setPtNoShowDeducts(e.target.checked)}
              className="h-4 w-4 accent-destructive cursor-pointer"
            />
            <span>{c.pt_no_show_deducts}</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ptLateCancelDeducts}
              onChange={(e) => setPtLateCancelDeducts(e.target.checked)}
              className="h-4 w-4 accent-destructive cursor-pointer"
            />
            <span>{c.pt_late_cancel_deducts}</span>
          </label>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
            {saving ? labels.saving : labels.save}
          </Button>
          {message && (
            <Alert variant={message.type} className="max-w-md">
              {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{message.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function GeneralTab() {
  const { lang, setLang } = useLang();
  const labels = t[lang];
  const c = copy[lang];
  const [cooldown, setCooldown] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);

  useEffect(() => {
    api.get<Record<string, string>>('/api/settings')
      .then((res) => {
        if (res.success && res.data) {
          setCooldown(res.data.scan_cooldown_seconds ?? '');
        }
        setLoading(false);
      })
      .catch(() => {
        setMessage({ type: 'destructive', text: labels.error_loading_settings });
        setLoading(false);
      });
  }, [labels.error_loading_settings]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.put('/api/settings', {
        values: {
          scan_cooldown_seconds: cooldown,
        },
      });
      if (res.success) {
        setMessage({ type: 'success', text: labels.saved_successfully });
      } else {
        setMessage({ type: 'destructive', text: res.message || labels.failed_to_save });
      }
    } catch {
      setMessage({ type: 'destructive', text: labels.failed_to_save });
    } finally {
      setSaving(false);
    }
  };

  const handleCardCodeBackfill = async () => {
    setBackfillRunning(true);
    setBackfillMessage(null);
    try {
      const res = await api.post<{ updated?: number; skipped?: number; notFound?: number; noArtifact?: boolean }>(
        '/api/migration/backfill-card-codes',
        {}
      );
      if (!res.success || !res.data) {
        setBackfillMessage({
          type: 'destructive',
          text: res.message || c.card_code_error,
        });
        return;
      }

      if (res.data.noArtifact) {
        setBackfillMessage({ type: 'success', text: c.card_code_no_artifact });
        return;
      }

      setBackfillMessage({
        type: 'success',
        text: c.card_code_success(res.data.updated ?? 0, res.data.skipped ?? 0),
      });
    } catch {
      setBackfillMessage({ type: 'destructive', text: c.card_code_error });
    } finally {
      setBackfillRunning(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6">
      {/* Card 1: Language */}
      <Card className="shadow-[6px_6px_0_#000000]">
        <CardHeader>
          <CardTitle>{labels.general_settings}</CardTitle>
          <CardDescription>{labels.general_settings_description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Label>{labels.language}</Label>
          {/* Language toggle — design tokens instead of hardcoded hex */}
          <div className="mt-2 flex w-fit border-2 border-border">
            <button
              onClick={() => {
                setLang('en');
                api.put('/api/settings', { values: { system_language: 'en' } }).catch(() => {
                  toast.error(c.lang_save_error);
                });
              }}
              className={`px-4 py-2 text-sm font-bold transition-colors ${
                lang === 'en'
                  ? 'bg-destructive text-white'
                  : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.lang_en}
            </button>
            <button
              onClick={() => {
                setLang('ar');
                api.put('/api/settings', { values: { system_language: 'ar' } }).catch(() => {
                  toast.error(c.lang_save_error);
                });
              }}
              className={`px-4 py-2 text-sm font-bold transition-colors ${
                lang === 'ar'
                  ? 'bg-destructive text-white'
                  : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.lang_ar}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Scanner Settings */}
      <Card className="shadow-[6px_6px_0_#000000]">
        <CardHeader>
          <CardTitle>{c.scanner_card_title}</CardTitle>
          <CardDescription>{c.scanner_card_description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="scan-cooldown">{c.scanner_cooldown_label}</Label>
            <Input
              id="scan-cooldown"
              type="number"
              min={0}
              value={cooldown}
              onChange={(e) => setCooldown(e.target.value)}
              className="mt-1 max-w-xs"
            />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
              {saving ? labels.saving : labels.save}
            </Button>
            {message && (
              <Alert variant={message.type} className="max-w-md">
                {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{message.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Card Code Maintenance */}
      <Card className="shadow-[6px_6px_0_#000000]">
        <CardHeader>
          <CardTitle>{c.card_code_card_title}</CardTitle>
          <CardDescription>{c.card_code_card_description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button onClick={handleCardCodeBackfill} disabled={backfillRunning} variant="outline">
              {backfillRunning ? c.card_code_button_running : c.card_code_button_idle}
            </Button>
            {backfillMessage && (
              <Alert variant={backfillMessage.type} className="max-w-md">
                {backfillMessage.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{backfillMessage.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
                <AlertDescription>{backfillMessage.text}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
