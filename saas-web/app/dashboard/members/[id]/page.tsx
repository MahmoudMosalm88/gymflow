'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { useAuth } from '@/lib/use-auth';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/format';
import { getCachedMemberDetail } from '@/lib/offline/read-model';
import { saveSubscriptionRenew } from '@/lib/offline/actions';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UpdateIcon } from '@radix-ui/react-icons';

const MemberAvatar = dynamic(() => import('@/components/dashboard/MemberAvatar'));
const MemberGuestInvitesCard = dynamic(() => import('@/components/dashboard/MemberGuestInvitesCard'), {
  loading: () => <LoadingSpinner />,
});
const FreezeDialog = dynamic(() => import('@/components/dashboard/FreezeDialog'));

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
  trainer_staff_user_id?: string | null;
  trainer_name?: string | null;
  trainer_phone?: string | null;
  trainer_email?: string | null;
  trainer_assigned_at?: string | null;
};

type TrainerOption = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  accepted_at: string | null;
  is_active: boolean;
  gender: 'male' | 'female' | null;
  languages: string[];
  specialties: string[];
  beginner_friendly: boolean;
};

type SubscriptionRaw = {
  id: number;
  plan_name?: string;
  renewed_from_subscription_id?: number | null;
  start_date: number;
  end_date: number;
  price_paid: number | null;
  is_active: boolean;
  plan_months: number;
  sessions_per_month: number | null;
};

type Subscription = SubscriptionRaw & {
  status: 'active' | 'expired' | 'pending';
  sync_status?: string;
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
  id: number | string;
  timestamp: number;
  method: string;
  sync_status?: string;
};

type Payment = {
  id: number | string;
  amount: string;
  type: string;
  note: string | null;
  created_at: string;
  subscription_id: number | null;
  guest_pass_id: string | null;
  plan_months: number | null;
  sessions_per_month: number | null;
  sync_status?: string;
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
  const { profile, loading: authLoading } = useAuth();
  const labels = t[lang];
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  const isTrainer = profile?.role === 'trainer';
  const canManageTrainer = profile?.role !== 'trainer';

  const [member, setMember] = useState<Member | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [assigningTrainer, setAssigningTrainer] = useState(false);
  const [trainerMessage, setTrainerMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [waFeedback, setWaFeedback] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);
  const [sendingWaType, setSendingWaType] = useState<'welcome' | 'qr_code' | null>(null);
  const [freezeSubId, setFreezeSubId] = useState<string | null>(null);
  const [renewSub, setRenewSub] = useState<Subscription | null>(null);
  const [renewForm, setRenewForm] = useState({ plan_months: '1', sessions_per_month: '', price_paid: '' });
  const [renewing, setRenewing] = useState(false);
  const [renewError, setRenewError] = useState('');
  const [showSubscriptionHistory, setShowSubscriptionHistory] = useState(false);

  const loadMemberData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      if (navigator.onLine) {
        const [memberRes, subsRes, attRes, payRes, trainersRes] = await Promise.all([
          api.get<Member>(`/api/members/${id}`),
          isTrainer ? Promise.resolve({ success: true, data: [] as SubscriptionRaw[] }) : api.get<SubscriptionRaw[]>(`/api/subscriptions?member_id=${id}`),
          api.get<AttendanceLog[]>(`/api/attendance/logs?member_id=${id}&limit=20`),
          isTrainer ? Promise.resolve({ success: true, data: [] as Payment[] }) : api.get<Payment[]>(`/api/payments?member_id=${id}`),
          canManageTrainer ? api.get<TrainerOption[]>('/api/trainers') : Promise.resolve({ success: true, data: [] as TrainerOption[] }),
        ]);

        if (memberRes.success && memberRes.data) {
          setMember(memberRes.data);
          setSubs((subsRes.data ?? []).map((subscription) => ({ ...subscription, status: deriveStatus(subscription) })));
          setAttendance(attRes.data ?? []);
          setPayments(payRes.data ?? []);
          setTrainers(trainersRes.data ?? []);
          return;
        }
      }

      const cached = await getCachedMemberDetail(id);
      if (!cached) {
        setMember(null);
        setSubs([]);
        setAttendance([]);
        setPayments([]);
        setTrainers([]);
        return;
      }

      setMember(cached.member as Member);
      setSubs((cached.subscriptions ?? []).map((subscription) => ({ ...subscription, status: deriveStatus(subscription) } as Subscription)));
      setAttendance((cached.attendance ?? []) as AttendanceLog[]);
      setPayments((cached.payments ?? []) as Payment[]);
      setTrainers([]);
    } catch {
      const cached = await getCachedMemberDetail(id);
      setMember((cached?.member as Member) ?? null);
      setSubs(((cached?.subscriptions ?? []) as Subscription[]).map((subscription) => ({ ...subscription, status: deriveStatus(subscription) })));
      setAttendance((cached?.attendance ?? []) as AttendanceLog[]);
      setPayments((cached?.payments ?? []) as Payment[]);
      setTrainers([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, canManageTrainer, id, isTrainer]);

  useEffect(() => {
    void loadMemberData();
  }, [loadMemberData]);

  if (loading || authLoading) return <LoadingSpinner size="lg" />;

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

  async function assignTrainer(trainerStaffUserId: string | null) {
    if (!member || assigningTrainer || !canManageTrainer) return;
    setAssigningTrainer(true);
    setTrainerMessage('');
    try {
      const res = await api.patch(`/api/members/${member.id}/trainer`, {
        trainer_staff_user_id: trainerStaffUserId,
      });
      if (!res.success) {
        setTrainerMessage(res.message || (lang === 'ar' ? 'تعذر تحديث المدرب.' : 'Could not update trainer assignment.'));
        return;
      }
      await loadMemberData();
      setTrainerMessage(
        trainerStaffUserId
          ? (lang === 'ar' ? 'تم تحديث إسناد المدرب.' : 'Trainer assignment updated.')
          : (lang === 'ar' ? 'تم إزالة المدرب من هذا العميل.' : 'Trainer removed from this client.')
      );
    } finally {
      setAssigningTrainer(false);
    }
  }

  const primarySubs = subs.filter((sub) => sub.status === 'active' || sub.status === 'pending');
  const fallbackExpiredSub = primarySubs.length === 0 ? subs.find((sub) => sub.status === 'expired') ?? null : null;
  const visibleSubs = fallbackExpiredSub ? [fallbackExpiredSub] : primarySubs;
  const historicalSubs = subs.filter((sub) => sub.status === 'expired' && sub.id !== fallbackExpiredSub?.id);

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
      const renewalAmount = renewForm.price_paid ? parseFloat(renewForm.price_paid) : 0;
      const res = await saveSubscriptionRenew({
        memberId: member.id,
        memberName: member.name,
        previousSubscriptionId: Number(renewSub.id),
        expectedPreviousEndDate: renewSub.end_date,
        expectedPreviousIsActive: renewSub.is_active,
        planMonths: parseInt(renewForm.plan_months, 10) || 1,
        pricePaid: renewalAmount,
        sessionsPerMonth: renewForm.sessions_per_month ? parseInt(renewForm.sessions_per_month, 10) : null,
      });

      if (!res.success) throw new Error(labels.error);

      await loadMemberData();
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
        {!isTrainer ? (
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
        ) : null}
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
              updatedAt={member.updated_at}
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

      <Card>
        <CardHeader>
          <CardTitle>{lang === 'ar' ? 'المدرب المسؤول' : 'Assigned Trainer'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {member.trainer_name ? (
            <div className="rounded-md border border-border p-4">
              <div className="flex flex-col gap-1">
                <p className="font-medium text-foreground">{member.trainer_name}</p>
                <p className="text-sm text-muted-foreground" dir="ltr">{member.trainer_phone || ''}</p>
                {member.trainer_email ? <p className="text-sm text-muted-foreground">{member.trainer_email}</p> : null}
                {member.trainer_assigned_at ? (
                  <p className="text-xs text-muted-foreground">
                    {lang === 'ar' ? 'تاريخ الإسناد:' : 'Assigned:'} {formatDate(Date.parse(member.trainer_assigned_at) / 1000, locale)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {lang === 'ar' ? 'لا يوجد مدرب مسند لهذا العميل حالياً.' : 'No trainer is assigned to this client yet.'}
            </p>
          )}

          {canManageTrainer ? (
            <div className="space-y-2">
              <Label htmlFor="trainer-assignment">{lang === 'ar' ? 'تغيير المدرب' : 'Assign trainer'}</Label>
              <select
                id="trainer-assignment"
                className="flex h-10 w-full border border-input bg-background px-3 py-2 text-sm"
                value={member.trainer_staff_user_id || ''}
                onChange={(event) => {
                  const value = event.target.value || null;
                  void assignTrainer(value);
                }}
                disabled={assigningTrainer}
              >
                <option value="">{lang === 'ar' ? 'بدون مدرب' : 'No trainer'}</option>
                {trainers
                  .filter((trainer) => trainer.is_active)
                  .map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.name}
                    </option>
                  ))}
              </select>
              {trainerMessage ? <p className="text-sm text-muted-foreground">{trainerMessage}</p> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!isTrainer ? <MemberGuestInvitesCard memberId={member.id} /> : null}

      {/* Subscriptions section */}
      {!isTrainer ? (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">{labels.subscriptions}</CardTitle>
          <div className="flex items-center gap-2">
            {historicalSubs.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowSubscriptionHistory((value) => !value)}>
                {showSubscriptionHistory
                  ? (lang === 'ar' ? 'إخفاء السجل' : 'Hide History')
                  : (lang === 'ar' ? 'عرض السجل' : 'Show History')}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/subscriptions?member_id=${id}&new=1`)}>
              <PlusIcon className="me-2 h-4 w-4" />
              {labels.add_new}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {visibleSubs.length === 0 && historicalSubs.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">{labels.no_subscriptions_found}</p>
          ) : (
            <div className="space-y-3">
              {visibleSubs.map((sub) => (
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
                      {sub.sync_status && sub.sync_status !== 'synced' ? (
                        <Badge variant="outline" className="border-warning/30 text-warning">
                          {lang === 'ar' ? 'بانتظار المزامنة' : 'Pending sync'}
                        </Badge>
                      ) : null}
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
              {showSubscriptionHistory && historicalSubs.length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    {lang === 'ar' ? 'السجل السابق' : 'Previous Cycles'}
                  </p>
                  {historicalSubs.map((sub) => (
                    <Card key={sub.id} className="p-3 opacity-90">
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
                          <Badge className="bg-destructive hover:bg-destructive/90">
                            {labels.expired}
                          </Badge>
                          {sub.sync_status && sub.sync_status !== 'synced' ? (
                            <Badge variant="outline" className="border-warning/30 text-warning">
                              {lang === 'ar' ? 'بانتظار المزامنة' : 'Pending sync'}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      ) : null}

      {/* Freeze subscription dialog */}
      {!isTrainer && freezeSubId ? (
        <FreezeDialog
          subscriptionId={freezeSubId}
          expectedEndDate={subs.find((item) => String(item.id) === freezeSubId)?.end_date}
          open={!!freezeSubId}
          onOpenChange={(open) => {
            if (!open) setFreezeSubId(null);
          }}
          onFrozen={() => {
            setFreezeSubId(null);
            void loadMemberData();
          }}
        />
      ) : null}

      {/* Renew subscription modal */}
      {!isTrainer ? (
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
                    ? `⚠ هذا الاشتراك لا يزال نشطاً ومتبقي عليه ${daysLeft} يوم. سيُنشئ التجديد دورة جديدة تبدأ بعد انتهاء الحالية.`
                    : `⚠ This subscription is still active with ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining. Renewing will create the next cycle after the current one ends.`}
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
      ) : null}

      {/* Payment History section */}
      {!isTrainer ? (
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
                    <div className="flex items-center gap-2">
                      {pay.sync_status && pay.sync_status !== 'synced' ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 border border-warning/30 text-warning bg-warning/10">
                          {lang === 'ar' ? 'بانتظار المزامنة' : 'Pending sync'}
                        </span>
                      ) : null}
                      <p className="text-sm font-semibold text-success">{formatCurrency(parseFloat(pay.amount))}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      ) : null}

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
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{formatDateTime(rec.timestamp, locale)}</span>
                    {rec.sync_status && rec.sync_status !== 'synced' ? (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 border border-warning/30 text-warning bg-warning/10">
                        {lang === 'ar' ? 'بانتظار المزامنة' : 'Pending sync'}
                      </span>
                    ) : null}
                  </div>
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
