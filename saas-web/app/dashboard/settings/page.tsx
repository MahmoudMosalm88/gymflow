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
const TeamTab = dynamic(() => import('@/components/dashboard/settings/TeamTab'), {
  loading: () => <TabLoading />,
});

type Tab = 'general' | 'team' | 'whatsapp' | 'backup' | 'import' | 'pt';

export default function SettingsPage() {
  const { lang } = useLang();
  const { profile } = useAuth();
  const labels = t[lang];
  const [activeTab, setActiveTab] = useState<Tab>('general');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: labels.general_settings || 'General' },
    // Team management moved to PT & Staff hub (/dashboard/pt?tab=staff)
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'backup', label: labels.backup_and_restore || 'Backup & Restore' },
    { key: 'import', label: labels.import_data || 'Import Data' },
    { key: 'pt' as const, label: lang === 'ar' ? 'التدريب الشخصي' : 'PT' },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-heading font-bold tracking-tight">{labels.settings}</h1>

      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            variant={activeTab === tab.key ? 'default' : 'ghost'}
            className="min-w-[100px]"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === 'general' && <GeneralTab />}
      {/* Team tab moved to PT & Staff hub */}
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
    <Card>
      <CardHeader>
        <CardTitle>{lang === 'ar' ? 'إعدادات التدريب الشخصي' : 'PT Settings'}</CardTitle>
        <CardDescription>
          {lang === 'ar'
            ? 'حدد مدة الجلسة الافتراضية والتنبيهات وسلوك خصم الجلسات.'
            : 'Control the default session length, reminder timing, and deduction rules.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="pt-session-minutes">{lang === 'ar' ? 'مدة الجلسة الافتراضية بالدقائق' : 'Default session minutes'}</Label>
            <Input id="pt-session-minutes" type="number" min={15} step={15} value={ptSessionMinutes} onChange={(e) => setPtSessionMinutes(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="pt-low-balance">{lang === 'ar' ? 'حد تنبيه الجلسات المتبقية' : 'Low balance threshold (sessions)'}</Label>
            <Input id="pt-low-balance" type="number" min={1} value={ptLowBalanceThreshold} onChange={(e) => setPtLowBalanceThreshold(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="pt-expiry">{lang === 'ar' ? 'أيام تنبيه قرب انتهاء الباقة' : 'Package expiry warning (days)'}</Label>
            <Input id="pt-expiry" type="number" min={1} value={ptExpiryWarningDays} onChange={(e) => setPtExpiryWarningDays(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="pt-reminder-hours">{lang === 'ar' ? 'ساعات تذكير الجلسة قبل الموعد' : 'Session reminder (hours before)'}</Label>
            <Input id="pt-reminder-hours" type="number" min={1} value={ptReminderHoursBefore} onChange={(e) => setPtReminderHoursBefore(e.target.value)} className="mt-1" />
          </div>
        </div>
        <Separator />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ptNoShowDeducts} onChange={(e) => setPtNoShowDeducts(e.target.checked)} />
            <span>{lang === 'ar' ? 'خصم جلسة عند عدم الحضور' : 'Deduct a session on no-show'}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ptLateCancelDeducts} onChange={(e) => setPtLateCancelDeducts(e.target.checked)} />
            <span>{lang === 'ar' ? 'خصم جلسة عند الإلغاء المتأخر' : 'Deduct a session on late cancel'}</span>
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
          text: res.message || (lang === 'ar' ? 'فشل تنفيذ المزامنة.' : 'Failed to run backfill.'),
        });
        return;
      }

      if (res.data.noArtifact) {
        setBackfillMessage({
          type: 'success',
          text: lang === 'ar' ? 'لا توجد بيانات استيراد سابقة للمزامنة.' : 'No imported artifact found to backfill.',
        });
        return;
      }

      setBackfillMessage({
        type: 'success',
        text:
          lang === 'ar'
            ? `تمت المزامنة. تم تحديث ${res.data.updated ?? 0} سجل، وتخطي ${res.data.skipped ?? 0}.`
            : `Backfill complete. Updated ${res.data.updated ?? 0}, skipped ${res.data.skipped ?? 0}.`,
      });
    } catch {
      setBackfillMessage({
        type: 'destructive',
        text: lang === 'ar' ? 'فشل تنفيذ المزامنة.' : 'Failed to run backfill.',
      });
    } finally {
      setBackfillRunning(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.general_settings}</CardTitle>
        <CardDescription>{labels.general_settings_description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label>{labels.language}</Label>
          <div className="mt-1 flex w-fit border border-[#2a2a2a]">
            <button
              onClick={() => {
                setLang('en');
                api.put('/api/settings', { values: { system_language: 'en' } }).catch(() => {
                  toast.error(lang === 'ar' ? 'فشل حفظ اللغة' : 'Failed to save language');
                });
              }}
              className={`px-4 py-2 text-sm font-bold transition-colors ${
                lang === 'en' ? 'bg-[#e63946] text-white' : 'bg-[#1e1e1e] text-[#888888] hover:text-[#e8e4df]'
              }`}
            >
              English
            </button>
            <button
              onClick={() => {
                setLang('ar');
                api.put('/api/settings', { values: { system_language: 'ar' } }).catch(() => {
                  toast.error(lang === 'ar' ? 'فشل حفظ اللغة' : 'Failed to save language');
                });
              }}
              className={`px-4 py-2 text-sm font-bold transition-colors ${
                lang === 'ar' ? 'bg-[#e63946] text-white' : 'bg-[#1e1e1e] text-[#888888] hover:text-[#e8e4df]'
              }`}
            >
              العربية
            </button>
          </div>
        </div>
        <Separator />
        <div>
          <Label htmlFor="scan-cooldown">{labels.scan_cooldown_seconds}</Label>
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
        <Separator />
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">
              {lang === 'ar' ? 'صيانة رموز بطاقات العملاء' : 'Client Card Code Maintenance'}
            </p>
            <p className="text-xs text-muted-foreground">
              {lang === 'ar'
                ? 'تشغيل مزامنة رموز البطاقات يدويًا بعد استيراد بيانات قديمة فقط.'
                : 'Run card-code backfill manually only after importing legacy data.'}
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button onClick={handleCardCodeBackfill} disabled={backfillRunning} variant="outline">
              {backfillRunning
                ? (lang === 'ar' ? 'جاري التنفيذ...' : 'Running...')
                : (lang === 'ar' ? 'تشغيل المزامنة الآن' : 'Run Backfill Now')}
            </Button>
            {backfillMessage && (
              <Alert variant={backfillMessage.type} className="max-w-md">
                {backfillMessage.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{backfillMessage.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
                <AlertDescription>{backfillMessage.text}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
