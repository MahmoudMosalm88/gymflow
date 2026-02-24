'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/format';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeftIcon, Pencil1Icon, PlusIcon, DotsHorizontalIcon } from '@radix-ui/react-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MemberAvatar from '@/components/dashboard/MemberAvatar';
import FreezeDialog from '@/components/dashboard/FreezeDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { addCalendarMonths, toUnixSeconds } from '@/lib/subscription-dates';
import { UpdateIcon } from '@radix-ui/react-icons';

type Member = {
  id: string;
  name: string;
  phone: string;
  gender?: 'male' | 'female';
  photo_path?: string;
  access_tier: string;
  card_code?: string;
  address?: string;
  created_at: number;
  updated_at: number;
};

type SubscriptionRaw = {
  id: number;
  plan_name?: string;
  start_date: number;
  end_date: number;
  price_paid: number | null;
  is_active: boolean;
  plan_months: number;
  sessions_per_month: number | null;
};

type Subscription = SubscriptionRaw & {
  status: 'active' | 'expired' | 'pending';
};

function deriveStatus(sub: SubscriptionRaw): 'active' | 'expired' | 'pending' {
  // Compare at day level — timestamps are anchored to 12:00 UTC so
  // comparing raw seconds against Date.now() can cause off-by-half-day issues
  const nowDate = new Date();
  const todayStart = Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()) / 1000;
  const todayEnd = todayStart + 86400;
  if (!sub.is_active) return 'expired';
  if (sub.end_date < todayStart) return 'expired';
  if (sub.start_date >= todayEnd) return 'pending';
  return 'active';
}

type AttendanceLog = {
  id: number;
  timestamp: number;
  method: string;
};

type Payment = {
  id: number;
  amount: string;
  type: string;
  note: string | null;
  created_at: string;
  subscription_id: number | null;
  guest_pass_id: string | null;
  plan_months: number | null;
  sessions_per_month: number | null;
};

function getMethodLabels(labels: Record<string, string>): Record<string, string> {
  return {
    qr_code: labels.method_qr_code,
    card_scan: labels.method_card_scan,
    manual: labels.method_manual,
    admin_override: labels.method_admin,
    scan: labels.method_scan,
  };
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const labels = t[lang];
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  const [member, setMember] = useState<Member | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [waFeedback, setWaFeedback] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);
  const [sendingWaType, setSendingWaType] = useState<'welcome' | 'qr_code' | null>(null);
  const [freezeSubId, setFreezeSubId] = useState<string | null>(null);
  const [renewSub, setRenewSub] = useState<Subscription | null>(null);
  const [renewForm, setRenewForm] = useState({ plan_months: '1', sessions_per_month: '', price_paid: '' });
  const [renewing, setRenewing] = useState(false);
  const [renewError, setRenewError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const membersRes = await api.get<Member[]>('/api/members');
        const found = (membersRes.data ?? []).find((m) => m.id === id);
        if (found) {
          setMember(found);
          const [subsRes, attRes, payRes] = await Promise.all([
            api.get<SubscriptionRaw[]>(`/api/subscriptions?member_id=${id}`),
            api.get<AttendanceLog[]>(`/api/attendance/logs?member_id=${id}&limit=20`),
            api.get<Payment[]>(`/api/payments?member_id=${id}`),
          ]);
          setSubs((subsRes.data ?? []).map((s) => ({ ...s, status: deriveStatus(s) })));
          setAttendance(attRes.data ?? []);
          setPayments(payRes.data ?? []);
        } else {
          setMember(null);
        }
      } catch {
        setMember(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <LoadingSpinner size="lg" />;

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <h2 className="text-xl font-semibold">{labels.member_not_found}</h2>
        <Button variant="link" onClick={() => router.push('/dashboard/members')}>
          &larr; {labels.back_to_members}
        </Button>
      </div>
    );
  }

  const InfoRow = ({ label, value }: { label: string; value: string | JSX.Element }) => (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-normal text-foreground">{value || '—'}</span>
    </div>
  );

  async function sendWhatsApp(type: 'welcome' | 'qr_code') {
    if (!member) return;
    try {
      setSendingWaType(type);
      setWaFeedback(null);
      const res = await api.post('/api/whatsapp/send', { memberId: member.id, type });
      if (!res.success) {
        setWaFeedback({ type: 'destructive', text: res.message || (lang === 'ar' ? 'حدث خطأ غير متوقع.' : 'Something went wrong.') });
        return;
      }
      setWaFeedback({
        type: 'success',
        text:
          type === 'qr_code'
            ? (lang === 'ar' ? 'تمت إضافة رسالة رمز الدخول إلى قائمة الإرسال.' : 'Check-in code message queued.')
            : (lang === 'ar' ? 'تمت إضافة رسالة الترحيب إلى قائمة الإرسال.' : 'Welcome message queued.'),
      });
    } catch (error) {
      setWaFeedback({
        type: 'destructive',
        text: error instanceof Error ? error.message : (lang === 'ar' ? 'حدث خطأ غير متوقع.' : 'Something went wrong.'),
      });
    } finally {
      setSendingWaType(null);
    }
  }

  function openRenewModal(sub: Subscription) {
    setRenewSub(sub);
    setRenewForm({
      plan_months: String(sub.plan_months || 1),
      sessions_per_month: sub.sessions_per_month != null ? String(sub.sessions_per_month) : '',
      price_paid: '',
    });
    setRenewError('');
  }

  async function handleRenew() {
    if (!member || !renewSub || renewing) return;
    setRenewing(true);
    setRenewError('');
    try {
      const additionalMonths = parseInt(renewForm.plan_months, 10) || 1;
      const existingMonths = typeof renewSub.plan_months === 'string' ? parseInt(renewSub.plan_months, 10) : (renewSub.plan_months || 0);
      const newTotalMonths = existingMonths + additionalMonths;

      // Add renewal amount to existing price so income tracking stays accurate
      const renewalAmount = renewForm.price_paid ? parseFloat(renewForm.price_paid) : 0;
      const existingPrice = typeof renewSub.price_paid === 'string' ? parseFloat(renewSub.price_paid) : (renewSub.price_paid ?? 0);
      const newTotalPrice = existingPrice + renewalAmount;

      const res = await api.patch('/api/subscriptions', {
        id: Number(renewSub.id),
        plan_months: newTotalMonths,
        price_paid: newTotalPrice,
        sessions_per_month: renewForm.sessions_per_month ? parseInt(renewForm.sessions_per_month, 10) : null,
        is_active: true,
      });

      if (!res.success) throw new Error(res.message || labels.error);

      // Record the payment
      if (renewalAmount > 0) {
        await api.post('/api/payments', {
          member_id: member.id,
          amount: renewalAmount,
          type: 'renewal',
          subscription_id: Number(renewSub.id),
        });
      }

      // Refresh subs list and payment history
      const [subsRes, payRes] = await Promise.all([
        api.get<SubscriptionRaw[]>(`/api/subscriptions?member_id=${id}`),
        api.get<Payment[]>(`/api/payments?member_id=${id}`),
      ]);
      setSubs((subsRes.data ?? []).map((s) => ({ ...s, status: deriveStatus(s) })));
      setPayments(payRes.data ?? []);
      setRenewSub(null);
    } catch (err: any) {
      setRenewError(err?.message || labels.error);
    } finally {
      setRenewing(false);
    }
  }

  const planOptions = ['1', '3', '6', '12', '18', '24'];
  const radioOption = (selected: boolean) =>
    `flex-1 py-2 px-3 text-sm font-medium border-2 cursor-pointer text-center transition-colors ${
      selected
        ? 'border-[#e63946] bg-[#2b0d0d] text-[#e63946]'
        : 'border-[#2a2a2a] bg-[#1e1e1e] text-[#8a8578] hover:border-[#3a3a3a]'
    }`;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header with name and action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/members')}>
            <ChevronLeftIcon className="h-5 w-5" />
            <span className="sr-only">{labels.back}</span>
          </Button>
          <h1 className="text-3xl font-bold">{member.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push(`/dashboard/members/${id}/edit`)} variant="outline">
            <Pencil1Icon className="me-2 h-4 w-4" />
            {labels.edit}
          </Button>
          <Button onClick={() => router.push(`/dashboard/subscriptions?member_id=${id}&new=1`)}>
            <PlusIcon className="me-2 h-4 w-4" />
            {labels.add_subscription}
          </Button>
          <DropdownMenu dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{labels.open_menu}</span>
                <DotsHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={lang === 'ar' ? 'start' : 'end'}>
              <DropdownMenuLabel>{labels.member_actions}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => sendWhatsApp('qr_code')} disabled={sendingWaType !== null}>
                {lang === 'ar' ? 'إرسال رمز الدخول' : 'Send Check-in Code'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => sendWhatsApp('welcome')} disabled={sendingWaType !== null}>
                {lang === 'ar' ? 'إرسال رسالة ترحيب' : 'Send Welcome Message'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => router.push('/dashboard/members')}
              >
                {labels.delete_member}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {waFeedback && (
        <Alert variant={waFeedback.type}>
          <AlertTitle>{waFeedback.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
          <AlertDescription>{waFeedback.text}</AlertDescription>
        </Alert>
      )}

      {/* Member info card */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.member_information}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-center">
            <MemberAvatar
              memberId={member.id}
              name={member.name}
              photoPath={member.photo_path}
              onPhotoChange={(url) => setMember({ ...member, photo_path: url })}
            />
          </div>
          <InfoRow label={labels.name} value={member.name} />
          <InfoRow label={labels.phone} value={<span dir="ltr">{member.phone}</span>} />
          <InfoRow label={labels.access_tier} value={member.access_tier} />
          <InfoRow label={labels.card_code} value={member.card_code ?? ''} />
          <InfoRow label={labels.address} value={member.address ?? ''} />
          <InfoRow label={labels.created_at} value={formatDate(member.created_at, locale)} />
          <InfoRow label={labels.updated_at} value={formatDate(member.updated_at, locale)} />
        </CardContent>
      </Card>

      {/* Subscriptions section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">{labels.subscriptions}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/subscriptions?member_id=${id}&new=1`)}>
            <PlusIcon className="me-2 h-4 w-4" />
            {labels.add_new}
          </Button>
        </CardHeader>
        <CardContent>
          {subs.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">{labels.no_subscriptions_found}</p>
          ) : (
            <div className="space-y-3">
              {subs.map((sub) => (
                <Card key={sub.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {sub.plan_name || labels.subscription}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(sub.start_date, locale)} — {formatDate(sub.end_date, locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(sub.price_paid ?? 0)}</p>
                      <Badge
                        className={
                          sub.status === 'active'
                            ? 'bg-success hover:bg-success/90'
                            : sub.status === 'expired'
                            ? 'bg-destructive hover:bg-destructive/90'
                            : 'bg-info hover:bg-info/90'
                        }
                      >
                        {sub.status === 'active' ? labels.active : sub.status === 'expired' ? labels.expired : labels.pending}
                      </Badge>
                      {sub.status === 'active' && (
                        <Button size="sm" className="bg-[#3b82f6] hover:bg-[#2563eb] text-white" onClick={() => setFreezeSubId(String(sub.id))}>
                          {labels.freeze_subscription}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openRenewModal(sub)}>
                        <UpdateIcon className="me-1 h-3 w-3" />
                        {lang === 'ar' ? 'تجديد' : 'Renew'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Freeze subscription dialog */}
      <FreezeDialog
        subscriptionId={freezeSubId || ''}
        open={!!freezeSubId}
        onOpenChange={(o) => { if (!o) setFreezeSubId(null); }}
        onFrozen={() => { setFreezeSubId(null); window.location.reload(); }}
      />

      {/* Renew subscription modal */}
      <Dialog open={!!renewSub} onOpenChange={(o) => { if (!o) setRenewSub(null); }}>
        <DialogContent className="max-w-md" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{lang === 'ar' ? 'تجديد الاشتراك' : 'Renew Subscription'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Warning if subscription still has days left */}
            {renewSub && renewSub.status === 'active' && (() => {
              const nowDate = new Date();
              const todayStart = Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()) / 1000;
              const daysLeft = Math.ceil((renewSub.end_date - todayStart) / 86400);
              if (daysLeft <= 0) return null;
              return (
                <div className="border-2 border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
                  {lang === 'ar'
                    ? `⚠ هذا الاشتراك لا يزال نشطاً ومتبقي عليه ${daysLeft} يوم. التجديد سيمدد تاريخ الانتهاء.`
                    : `⚠ This subscription is still active with ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining. Renewing will extend the end date.`}
                </div>
              );
            })()}
            {/* Plan Duration — radio buttons */}
            <div className="space-y-2">
              <Label>{lang === 'ar' ? 'إضافة مدة' : 'Add Duration'}</Label>
              <div className="flex flex-wrap gap-0">
                {planOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={radioOption(renewForm.plan_months === m)}
                    onClick={() => setRenewForm((f) => ({ ...f, plan_months: m }))}
                  >
                    {labels[`month_${m}` as keyof typeof labels]}
                  </button>
                ))}
              </div>
            </div>

            {/* Sessions per month */}
            <div className="space-y-2">
              <Label>{labels.sessionsPerMonth}</Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 12"
                value={renewForm.sessions_per_month}
                onChange={(e) => setRenewForm((f) => ({ ...f, sessions_per_month: e.target.value }))}
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label>{labels.pricePaid}</Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 500"
                value={renewForm.price_paid}
                onChange={(e) => setRenewForm((f) => ({ ...f, price_paid: e.target.value }))}
              />
            </div>

            {renewError && (
              <p className="text-sm text-[#e63946] border border-[#5c2a2a] bg-[#2b0d0d] px-3 py-2">{renewError}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setRenewSub(null)} disabled={renewing}>
                {labels.cancel}
              </Button>
              <Button onClick={handleRenew} disabled={renewing}>
                {renewing ? labels.loading : (lang === 'ar' ? 'تجديد' : 'Renew')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment History section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {lang === 'ar' ? 'سجل المدفوعات' : 'Payment History'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              {lang === 'ar' ? 'لا توجد مدفوعات مسجلة.' : 'No payments recorded.'}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((pay) => {
                const typeLabel = {
                  subscription: lang === 'ar' ? 'اشتراك جديد' : 'New Subscription',
                  renewal: lang === 'ar' ? 'تجديد' : 'Renewal',
                  guest_pass: lang === 'ar' ? 'تذكرة زائر' : 'Guest Pass',
                  other: lang === 'ar' ? 'أخرى' : 'Other',
                }[pay.type] || pay.type;

                const planInfo = pay.plan_months
                  ? `${pay.plan_months} ${lang === 'ar' ? 'شهر' : 'mo'}`
                  : '';

                return (
                  <div key={pay.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{typeLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(pay.created_at).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })}
                        {planInfo && ` · ${planInfo}`}
                        {pay.note && ` · ${pay.note}`}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-success">{formatCurrency(parseFloat(pay.amount))}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{labels.attendance_history}</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">{labels.no_attendance_records}</p>
          ) : (
            <div className="divide-y divide-border">
              {attendance.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between py-3">
                  <span className="text-sm">{formatDateTime(rec.timestamp, locale)}</span>
                  <span className="text-xs text-muted-foreground">{getMethodLabels(labels)[rec.method] ?? rec.method.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
