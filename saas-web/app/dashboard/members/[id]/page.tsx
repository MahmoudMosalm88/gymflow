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
import { DEFAULT_PAYMENT_METHOD } from '@/lib/payment-method-ui';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UpdateIcon } from '@radix-ui/react-icons';

const MemberAvatar = dynamic(() => import('@/components/dashboard/MemberAvatar'));
const MemberGuestInvitesCard = dynamic(() => import('@/components/dashboard/MemberGuestInvitesCard'), {
  loading: () => <LoadingSpinner />,
});
const FreezeDialog = dynamic(() => import('@/components/dashboard/FreezeDialog'));

/* ─── Bilingual copy ─── */
const copy = {
  en: {
    something_went_wrong: 'Something went wrong.',
    qr_code_queued: 'Check-in code message queued.',
    welcome_queued: 'Welcome message queued.',
    trainer_update_failed: 'Could not update trainer assignment.',
    trainer_updated: 'Trainer assignment updated.',
    trainer_removed: 'Trainer removed from this client.',
    whatsapp_dnc_enabled: 'WhatsApp automation is blocked for this member.',
    whatsapp_dnc_disabled: 'WhatsApp automation is allowed for this member.',
    whatsapp_dnc_enable_action: 'Block WhatsApp',
    whatsapp_dnc_disable_action: 'Allow WhatsApp',
    whatsapp_dnc_label: 'WhatsApp contact',
    whatsapp_dnc_on: 'Blocked',
    whatsapp_dnc_off: 'Allowed',
    whatsapp_dnc_save_failed: 'Could not update WhatsApp contact preference.',
    send_checkin_code: 'Send Check-in Code',
    send_welcome: 'Send Welcome Message',
    assigned_trainer: 'Assigned Trainer',
    assigned_date: 'Assigned:',
    no_trainer: 'No trainer is assigned to this client yet.',
    assign_trainer: 'Assign trainer',
    no_trainer_option: 'No trainer',
    saving: '...',
    save: 'Save',
    hide_history: 'Hide History',
    show_history: 'Show History',
    pending_sync: 'Pending sync',
    renew: 'Renew',
    previous_cycles: 'Previous Cycles',
    delete_confirm_prefix: 'Are you sure you want to delete "',
    delete_confirm_fallback: 'this member',
    delete_confirm_suffix: '"? This cannot be undone.',
    deleting: 'Deleting...',
    renew_subscription: 'Renew Subscription',
    active_sub_warning_prefix: '⚠ This subscription is still active with ',
    active_sub_warning_suffix_one: ' day remaining. Renewing will create the next cycle after the current one ends.',
    active_sub_warning_suffix_many: ' days remaining. Renewing will create the next cycle after the current one ends.',
    add_duration: 'Add Duration',
    payment_history: 'Payment History',
    no_payments: 'No payments recorded.',
    type_subscription: 'New Subscription',
    type_renewal: 'Renewal',
    type_guest: 'Guest Pass',
    type_other: 'Other',
    months_short: 'mo',
    show_more: 'Show more',
    show_less: 'Show less',
    health_membership: 'Membership',
    health_last_payment: 'Last Payment',
    health_engagement: 'Engagement',
    whatsapp_actions: 'WhatsApp',
  },
  ar: {
    something_went_wrong: 'حدث خطأ غير متوقع.',
    qr_code_queued: 'تمت إضافة رسالة رمز الدخول إلى قائمة الإرسال.',
    welcome_queued: 'تمت إضافة رسالة الترحيب إلى قائمة الإرسال.',
    trainer_update_failed: 'تعذر تحديث المدرب.',
    trainer_updated: 'تم تحديث إسناد المدرب.',
    trainer_removed: 'تم إزالة المدرب من هذا العميل.',
    whatsapp_dnc_enabled: 'تم حظر أتمتة واتساب لهذا العضو.',
    whatsapp_dnc_disabled: 'تم السماح بأتمتة واتساب لهذا العضو.',
    whatsapp_dnc_enable_action: 'حظر واتساب',
    whatsapp_dnc_disable_action: 'السماح بواتساب',
    whatsapp_dnc_label: 'التواصل عبر واتساب',
    whatsapp_dnc_on: 'محظور',
    whatsapp_dnc_off: 'مسموح',
    whatsapp_dnc_save_failed: 'تعذر تحديث تفضيل التواصل عبر واتساب.',
    send_checkin_code: 'إرسال رمز الدخول',
    send_welcome: 'إرسال رسالة ترحيب',
    assigned_trainer: 'المدرب المسؤول',
    assigned_date: 'تاريخ الإسناد:',
    no_trainer: 'لا يوجد مدرب مسند لهذا العميل حالياً.',
    assign_trainer: 'تغيير المدرب',
    no_trainer_option: 'بدون مدرب',
    saving: 'جارٍ...',
    save: 'حفظ',
    hide_history: 'إخفاء السجل',
    show_history: 'عرض السجل',
    pending_sync: 'بانتظار المزامنة',
    renew: 'تجديد',
    previous_cycles: 'السجل السابق',
    delete_confirm_prefix: 'هل أنت متأكد من حذف "',
    delete_confirm_fallback: 'هذا العميل',
    delete_confirm_suffix: '"؟ لا يمكن التراجع عن هذا الإجراء.',
    deleting: 'جارٍ الحذف...',
    renew_subscription: 'تجديد الاشتراك',
    active_sub_warning_prefix: '⚠ هذا الاشتراك لا يزال نشطاً ومتبقي عليه ',
    active_sub_warning_suffix_one: ' يوم. سيُنشئ التجديد دورة جديدة تبدأ بعد انتهاء الحالية.',
    active_sub_warning_suffix_many: ' يوم. سيُنشئ التجديد دورة جديدة تبدأ بعد انتهاء الحالية.',
    add_duration: 'إضافة مدة',
    payment_history: 'سجل المدفوعات',
    no_payments: 'لا توجد مدفوعات مسجلة.',
    type_subscription: 'اشتراك جديد',
    type_renewal: 'تجديد',
    type_guest: 'تذكرة زائر',
    type_other: 'أخرى',
    months_short: 'شهر',
    show_more: 'المزيد من التفاصيل',
    show_less: 'إخفاء التفاصيل',
    health_membership: 'العضوية',
    health_last_payment: 'آخر دفعة',
    health_engagement: 'التفاعل',
    whatsapp_actions: 'واتساب',
  },
} as const;

type Member = {
  id: string;
  name: string;
  phone: string;
  gender?: 'male' | 'female';
  photo_path?: string;
  access_tier: string;
  card_code?: string;
  address?: string;
  whatsapp_do_not_contact?: boolean;
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
  payment_method?: 'cash' | 'digital' | null;
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
  payment_method?: 'cash' | 'digital' | null;
  note: string | null;
  created_at: string;
  subscription_id: number | null;
  guest_pass_id: string | null;
  plan_months: number | null;
  sessions_per_month: number | null;
  sync_status?: string;
};

const NO_TRAINER_VALUE = "__none__";

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
  const c = copy[lang];
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
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [trainersLoading, setTrainersLoading] = useState(true);
  const [waFeedback, setWaFeedback] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);
  const [sendingWaType, setSendingWaType] = useState<'welcome' | 'qr_code' | null>(null);
  const [updatingWhatsappDnc, setUpdatingWhatsappDnc] = useState(false);
  const [freezeSubId, setFreezeSubId] = useState<string | null>(null);
  const [renewSub, setRenewSub] = useState<Subscription | null>(null);
  const [renewForm, setRenewForm] = useState({ plan_months: '1', sessions_per_month: '', price_paid: '' });
  const [renewing, setRenewing] = useState(false);
  const [renewError, setRenewError] = useState('');
  const [showSubscriptionHistory, setShowSubscriptionHistory] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingTrainerId, setPendingTrainerId] = useState<string | null | undefined>(undefined);

  const loadMemberData = useCallback(async () => {
    if (authLoading) return;

    setLoading(true);
    setSubscriptionsLoading(true);
    setAttendanceLoading(true);
    setPaymentsLoading(true);
    setTrainersLoading(canManageTrainer);

    let loadedOnlineCore = false;

    try {
      if (navigator.onLine) {
        const memberRes = await api.get<Member>(`/api/members/${id}`);

        if (memberRes.success && memberRes.data) {
          setMember(memberRes.data);
          setLoading(false);
          loadedOnlineCore = true;

          void (async () => {
            const [subsRes, attRes, payRes, trainersRes] = await Promise.allSettled([
              isTrainer ? Promise.resolve({ success: true, data: [] as SubscriptionRaw[] }) : api.get<SubscriptionRaw[]>(`/api/subscriptions?member_id=${id}`),
              api.get<AttendanceLog[]>(`/api/attendance/logs?member_id=${id}&limit=20`),
              isTrainer ? Promise.resolve({ success: true, data: [] as Payment[] }) : api.get<Payment[]>(`/api/payments?member_id=${id}&limit=50`),
              canManageTrainer ? api.get<TrainerOption[]>('/api/trainers') : Promise.resolve({ success: true, data: [] as TrainerOption[] }),
            ]);

            if (subsRes.status === 'fulfilled' && subsRes.value.success) {
              setSubs((subsRes.value.data ?? []).map((subscription) => ({ ...subscription, status: deriveStatus(subscription) })));
            }
            setSubscriptionsLoading(false);

            if (attRes.status === 'fulfilled' && attRes.value.success) {
              setAttendance(attRes.value.data ?? []);
            }
            setAttendanceLoading(false);

            if (payRes.status === 'fulfilled' && payRes.value.success) {
              setPayments(payRes.value.data ?? []);
            }
            setPaymentsLoading(false);

            if (trainersRes.status === 'fulfilled' && trainersRes.value.success) {
              setTrainers(trainersRes.value.data ?? []);
            }
            setTrainersLoading(false);
          })();

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
      if (!loadedOnlineCore) {
        setSubscriptionsLoading(false);
        setAttendanceLoading(false);
        setPaymentsLoading(false);
        setTrainersLoading(false);
      } else if (!canManageTrainer) {
        setTrainersLoading(false);
      }
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
        setWaFeedback({ type: 'destructive', text: res.message || c.something_went_wrong });
        return;
      }
      setWaFeedback({
        type: 'success',
        text: type === 'qr_code' ? c.qr_code_queued : c.welcome_queued,
      });
    } catch (error) {
      setWaFeedback({
        type: 'destructive',
        text: error instanceof Error ? error.message : c.something_went_wrong,
      });
    } finally {
      setSendingWaType(null);
    }
  }

  async function toggleWhatsAppDnc() {
    if (!member || updatingWhatsappDnc) return;
    try {
      setUpdatingWhatsappDnc(true);
      setWaFeedback(null);
      const nextValue = !member.whatsapp_do_not_contact;
      const res = await api.patch(`/api/members/${member.id}`, {
        whatsapp_do_not_contact: nextValue,
      });
      if (!res.success) {
        setWaFeedback({ type: 'destructive', text: res.message || c.whatsapp_dnc_save_failed });
        return;
      }
      await loadMemberData();
      setWaFeedback({
        type: 'success',
        text: nextValue ? c.whatsapp_dnc_enabled : c.whatsapp_dnc_disabled,
      });
    } catch (error) {
      setWaFeedback({
        type: 'destructive',
        text: error instanceof Error ? error.message : c.whatsapp_dnc_save_failed,
      });
    } finally {
      setUpdatingWhatsappDnc(false);
    }
  }

  async function deleteMember() {
    if (!member || deleting) return;
    setDeleting(true);
    try {
      const res = await api.delete('/api/members', { id: member.id });
      if (!res.success) {
        setDeleteConfirmOpen(false);
        return;
      }
      router.push('/dashboard/members');
    } finally {
      setDeleting(false);
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
        setTrainerMessage(res.message || c.trainer_update_failed);
        return;
      }
      await loadMemberData();
      setTrainerMessage(trainerStaffUserId ? c.trainer_updated : c.trainer_removed);
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
        paymentMethod: DEFAULT_PAYMENT_METHOD,
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
        ? 'border-destructive bg-destructive/10 text-destructive'
        : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40'
    }`;

  // Derive health signals from existing data
  const activeSub = subs.find(s => s.status === 'active');
  const lastVisitTimestamp = attendance.length > 0 ? attendance[0].timestamp : null;
  const daysSinceLastVisit = lastVisitTimestamp
    ? Math.floor((Date.now() / 1000 - lastVisitTimestamp) / 86400)
    : null;
  const engagementColor = daysSinceLastVisit === null ? 'text-muted-foreground' : daysSinceLastVisit <= 7 ? 'text-success' : daysSinceLastVisit <= 14 ? 'text-warning' : 'text-destructive';
  const engagementBg = daysSinceLastVisit === null ? 'bg-muted' : daysSinceLastVisit <= 7 ? 'bg-success/10' : daysSinceLastVisit <= 14 ? 'bg-warning/10' : 'bg-destructive/10';
  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header: back button + name */}
      <div className="flex items-center gap-2 mb-5">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/members')}>
          <ChevronLeftIcon className={`h-5 w-5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          <span className="sr-only">{labels.back}</span>
        </Button>
        <h1 className="text-2xl font-heading font-bold truncate min-w-0 tracking-tight">{member.name}</h1>
      </div>

      {/* WhatsApp feedback alert */}
      {waFeedback && (
        <Alert variant={waFeedback.type} className="mb-5">
          <AlertTitle>{waFeedback.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
          <AlertDescription>{waFeedback.text}</AlertDescription>
        </Alert>
      )}

      {/* 2-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── LEFT SIDEBAR ── */}
        <div className="lg:w-[300px] shrink-0 space-y-4">

          {/* Identity card */}
          <Card className="shadow-[6px_6px_0_#000000]">
            <CardContent className="pt-5 space-y-4">
              {/* Avatar */}
              <div className="flex justify-center">
                <MemberAvatar
                  memberId={member.id}
                  name={member.name}
                  photoPath={member.photo_path}
                  updatedAt={member.updated_at}
                  onPhotoChange={(url) => setMember({ ...member, photo_path: url })}
                />
              </div>
              {/* Name, phone, access tier */}
              <div className="text-center">
                <p className="font-heading font-bold text-lg text-foreground tracking-tight">{member.name}</p>
                <p className="text-sm text-muted-foreground tabular-nums" dir="ltr">{member.phone}</p>
                <Badge variant="outline" className="mt-1 text-[10px]">{member.access_tier}</Badge>
              </div>
              {/* Expandable extra info */}
              {showMoreInfo && (
                <div className="space-y-2 text-sm border-t border-border pt-3">
                  {member.card_code && <InfoRow label={labels.card_code} value={member.card_code} />}
                  {member.address && <InfoRow label={labels.address} value={member.address} />}
                  <InfoRow label={c.whatsapp_dnc_label} value={member.whatsapp_do_not_contact ? c.whatsapp_dnc_on : c.whatsapp_dnc_off} />
                  <InfoRow label={labels.created_at} value={formatDate(member.created_at, locale)} />
                  <InfoRow label={labels.updated_at} value={formatDate(member.updated_at, locale)} />
                </div>
              )}
              <button
                className="w-full text-[10px] text-muted-foreground hover:text-foreground transition-colors text-center"
                onClick={() => setShowMoreInfo(!showMoreInfo)}
              >
                {showMoreInfo ? c.show_less : c.show_more}
              </button>
            </CardContent>
          </Card>

          {/* Quick actions (non-trainer only) */}
          {!isTrainer && (
            <div className="space-y-2">
              <Button className="w-full justify-start gap-2" variant="outline" onClick={() => router.push(`/dashboard/members/${id}/edit`)}>
                <Pencil1Icon className="h-4 w-4" />{labels.edit}
              </Button>
              <Button className="w-full justify-start gap-2" variant="outline" onClick={() => router.push(`/dashboard/subscriptions?member_id=${id}&new=1`)}>
                <PlusIcon className="h-4 w-4" />
                {labels.add_subscription}
              </Button>
              {activeSub && (
                <Button className="w-full justify-start gap-2 bg-info hover:bg-info/90 text-white" onClick={() => setFreezeSubId(String(activeSub.id))}>
                  {labels.freeze_subscription}
                </Button>
              )}
              {subs.length > 0 && (
                <Button className="w-full justify-start gap-2" variant="outline" onClick={() => openRenewModal(subs[0])}>
                  <UpdateIcon className="h-4 w-4" />
                  {c.renew}
                </Button>
              )}
              {/* WhatsApp dropdown */}
              <DropdownMenu dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <DotsHorizontalIcon className="h-4 w-4" />
                    {c.whatsapp_actions}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={lang === 'ar' ? 'start' : 'end'}>
                  <DropdownMenuLabel>{labels.member_actions}</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => void toggleWhatsAppDnc()} disabled={updatingWhatsappDnc || sendingWaType !== null}>
                    {member.whatsapp_do_not_contact ? c.whatsapp_dnc_disable_action : c.whatsapp_dnc_enable_action}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => sendWhatsApp('qr_code')} disabled={sendingWaType !== null}>
                    {c.send_checkin_code}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => sendWhatsApp('welcome')} disabled={sendingWaType !== null}>
                    {c.send_welcome}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {/* Delete link */}
              <button
                className="w-full text-xs text-destructive hover:underline text-center pt-2"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                {labels.delete_member}
              </button>
            </div>
          )}

          {/* Trainer assignment card */}
          <Card className="shadow-[6px_6px_0_#000000]">
            <CardHeader>
              <CardTitle className="text-sm">{c.assigned_trainer}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {member.trainer_name ? (
                <div className="border-2 border-border p-4">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-foreground">{member.trainer_name}</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">{member.trainer_phone || ''}</p>
                    {member.trainer_email ? <p className="text-sm text-muted-foreground">{member.trainer_email}</p> : null}
                    {member.trainer_assigned_at ? (
                      <p className="text-xs text-muted-foreground">
                        {c.assigned_date} {formatDate(Date.parse(member.trainer_assigned_at) / 1000, locale)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{c.no_trainer}</p>
              )}

              {canManageTrainer ? (
                <div className="space-y-2">
                  <Label htmlFor="trainer-assignment">{c.assign_trainer}</Label>
                  <div className="flex gap-2">
                    <Select
                      value={pendingTrainerId !== undefined ? (pendingTrainerId ?? NO_TRAINER_VALUE) : (member.trainer_staff_user_id ?? NO_TRAINER_VALUE)}
                      onValueChange={(val) => setPendingTrainerId(val === NO_TRAINER_VALUE ? null : val)}
                      dir={lang === 'ar' ? 'rtl' : 'ltr'}
                      disabled={assigningTrainer}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={c.no_trainer_option} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_TRAINER_VALUE}>{c.no_trainer_option}</SelectItem>
                        {trainers
                          .filter((trainer) => trainer.is_active)
                          .map((trainer) => (
                            <SelectItem key={trainer.id} value={trainer.id}>
                              {trainer.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {pendingTrainerId !== undefined && (
                      <Button
                        size="sm"
                        disabled={assigningTrainer}
                        onClick={() => {
                          void assignTrainer(pendingTrainerId).then(() => setPendingTrainerId(undefined));
                        }}
                      >
                        {assigningTrainer ? c.saving : c.save}
                      </Button>
                    )}
                  </div>
                  {trainersLoading ? <p className="text-sm text-muted-foreground">{labels.loading}</p> : null}
                  {trainerMessage ? <p className="text-sm text-muted-foreground">{trainerMessage}</p> : null}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT MAIN ── */}
        <div className="flex-1 space-y-5">

          {/* Health strip: 3 status badges */}
          <div className="grid grid-cols-3 gap-2 lg:gap-3">
            {/* Subscription status */}
            <div className={`border-2 p-3 lg:p-3 text-center ${activeSub ? 'border-success/30 bg-success/10' : subs.length > 0 ? 'border-destructive/30 bg-destructive/10' : 'border-border bg-muted'}`}>
              <p className="text-[9px] lg:text-[10px] uppercase tracking-wider text-muted-foreground">
                {c.health_membership}
              </p>
              <p className={`font-stat text-base lg:text-lg tracking-wide mt-1 ${activeSub ? 'text-success' : subs.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {activeSub ? labels.active : subs.length > 0 ? labels.expired : '—'}
              </p>
            </div>
            {/* Last payment */}
            <div className="border-2 border-border bg-muted p-3 lg:p-3 text-center">
              <p className="text-[9px] lg:text-[10px] uppercase tracking-wider text-muted-foreground">
                {c.health_last_payment}
              </p>
              <p className="font-stat text-base lg:text-lg tracking-wide mt-1 text-foreground">
                {payments.length > 0 ? formatCurrency(parseFloat(payments[0].amount)) : '—'}
              </p>
            </div>
            {/* Engagement */}
            <div className={`border-2 p-3 text-center ${engagementBg} ${daysSinceLastVisit === null ? 'border-border' : daysSinceLastVisit <= 7 ? 'border-success/30' : daysSinceLastVisit <= 14 ? 'border-warning/30' : 'border-destructive/30'}`}>
              <p className="text-[9px] lg:text-[10px] uppercase tracking-wider text-muted-foreground">
                {c.health_engagement}
              </p>
              {daysSinceLastVisit !== null ? (
                <div className="mt-1">
                  <span className={`font-stat text-lg tracking-wide ${engagementColor}`}>{daysSinceLastVisit}</span>
                  <span className="text-[10px] text-muted-foreground ms-1">{lang === 'ar' ? 'يوم' : 'd ago'}</span>
                </div>
              ) : (
                <p className="font-stat text-lg tracking-wide mt-1 text-muted-foreground">—</p>
              )}
            </div>
          </div>

          {/* Subscriptions card (non-trainer only) */}
          {!isTrainer ? (
            <Card className="shadow-[6px_6px_0_#000000]">
              <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between space-y-0 pb-2">
                <CardTitle className="text-sm">{labels.subscriptions}</CardTitle>
                <div className="flex items-center gap-2">
                  {historicalSubs.length > 0 && (
                    <Button variant="outline" size="sm" className="h-9 lg:h-8 text-xs" onClick={() => setShowSubscriptionHistory((v) => !v)}>
                      {showSubscriptionHistory ? c.hide_history : c.show_history}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-9 lg:h-8 text-xs" onClick={() => router.push(`/dashboard/subscriptions?member_id=${id}&new=1`)}>
                    <PlusIcon className="me-2 h-4 w-4" />
                    {labels.add_new}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {subscriptionsLoading ? (
                  <p className="py-4 text-center text-muted-foreground">{labels.loading}</p>
                ) : visibleSubs.length === 0 && historicalSubs.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground">{labels.no_subscriptions_found}</p>
                ) : (
                  <div className="divide-y divide-border">
                    {visibleSubs.map((sub) => (
                      <div key={sub.id} className="flex flex-col gap-3 py-4 lg:py-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{sub.plan_name || labels.subscription}</span>
                            <Badge variant="outline" className={`text-[10px] ${
                              sub.status === 'active' ? 'bg-success/20 text-success border-success/30'
                              : sub.status === 'expired' ? 'bg-destructive/20 text-destructive border-destructive/30'
                              : 'bg-info/20 text-info border-info/30'
                            }`}>
                              {sub.status === 'active' ? labels.active : sub.status === 'expired' ? labels.expired : labels.pending}
                            </Badge>
                            {sub.sync_status && sub.sync_status !== 'synced' && (
                              <Badge variant="outline" className="text-[10px] border-warning/30 text-warning bg-warning/10">{c.pending_sync}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5 lg:mt-0.5">
                            {formatDate(sub.start_date, locale)} — {formatDate(sub.end_date, locale)} · {formatCurrency(sub.price_paid ?? 0)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {sub.status === 'active' && (
                            <Button size="sm" variant="outline" className="h-9 lg:h-7 text-xs flex-1 lg:flex-none" onClick={() => setFreezeSubId(String(sub.id))}>
                              {labels.freeze_subscription}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-9 lg:h-7 text-xs flex-1 lg:flex-none" onClick={() => openRenewModal(sub)}>
                            <UpdateIcon className="me-1 h-3 w-3" />{c.renew}
                          </Button>
                        </div>
                      </div>
                    ))}
                    {showSubscriptionHistory && historicalSubs.length > 0 && (
                      <>
                        <div className="pt-3 pb-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{c.previous_cycles}</p>
                        </div>
                        {historicalSubs.map((sub) => (
                          <div key={sub.id} className="flex items-center justify-between py-2 opacity-60">
                            <div className="min-w-0">
                              <span className="text-sm text-foreground">{sub.plan_name || labels.subscription}</span>
                              <span className="text-xs text-muted-foreground ms-2">
                                {formatDate(sub.start_date, locale)} — {formatDate(sub.end_date, locale)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm text-muted-foreground">{formatCurrency(sub.price_paid ?? 0)}</span>
                              <Badge variant="outline" className="text-[10px] bg-destructive/20 text-destructive border-destructive/30">{labels.expired}</Badge>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Guest invites card (non-trainer only) */}
          {!isTrainer ? <MemberGuestInvitesCard memberId={member.id} /> : null}

          {/* Payment history card (non-trainer only) */}
          {!isTrainer ? (
            <Card className="shadow-[6px_6px_0_#000000]">
              <CardHeader>
                <CardTitle className="text-sm">{c.payment_history}</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <p className="py-4 text-center text-muted-foreground">{labels.loading}</p>
                ) : payments.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground">{c.no_payments}</p>
                ) : (
                  <div className="divide-y divide-border">
                    {payments.map((pay) => {
                      const typeLabel = {
                        subscription: c.type_subscription,
                        renewal: c.type_renewal,
                        guest_pass: c.type_guest,
                        other: c.type_other,
                      }[pay.type] || pay.type;

                      const planInfo = pay.plan_months
                        ? `${pay.plan_months} ${c.months_short}`
                        : '';
                      return (
                        <div key={pay.id} className="flex items-center justify-between py-2">
                          <div className="min-w-0">
                            <span className="text-sm text-foreground">{typeLabel}</span>
                            <span className="text-xs text-muted-foreground ms-2">
                              {new Date(pay.created_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                              {planInfo && ` · ${planInfo}`}
                            </span>
                            {pay.sync_status && pay.sync_status !== 'synced' && (
                              <Badge variant="outline" className="text-[10px] border-warning/30 text-warning bg-warning/10 ms-1">{c.pending_sync}</Badge>
                            )}
                          </div>
                          <span className="text-sm font-stat text-success shrink-0 ms-2 tabular-nums">{formatCurrency(parseFloat(pay.amount))}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Attendance card */}
          <Card className="shadow-[6px_6px_0_#000000]">
            <CardHeader>
              <CardTitle className="text-sm">{labels.attendance_history}</CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <p className="py-4 text-center text-muted-foreground">{labels.loading}</p>
              ) : attendance.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">{labels.no_attendance_records}</p>
              ) : (
                <div className="divide-y divide-border">
                  {attendance.map((rec) => (
                    <div key={rec.id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">{formatDateTime(rec.timestamp, locale)}</span>
                        {rec.sync_status && rec.sync_status !== 'synced' && (
                          <Badge variant="outline" className="text-[10px] border-warning/30 text-warning bg-warning/10">{c.pending_sync}</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{getMethodLabels(labels)[rec.method] ?? rec.method.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Dialogs (outside 2-col layout) ── */}

      {/* Delete member confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={(open) => { if (!open) setDeleteConfirmOpen(false); }}>
        <DialogContent className="max-w-sm" role="dialog" aria-modal="true">
          <DialogHeader>
            <DialogTitle>{labels.delete_member}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {c.delete_confirm_prefix}{member?.name || c.delete_confirm_fallback}{c.delete_confirm_suffix}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              {labels.cancel}
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={() => void deleteMember()}>
              {deleting ? c.deleting : labels.delete_member}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              <DialogTitle>{c.renew_subscription}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Warning if subscription still has days left */}
              {renewSub && renewSub.status === 'active' && (() => {
                const nowDate = new Date();
                const todayStart = Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()) / 1000;
                const daysLeft = Math.ceil((renewSub.end_date - todayStart) / 86400);
                if (daysLeft <= 0) return null;
                return (
                  <Alert className="border-warning/40 bg-warning/10 text-warning">
                    <AlertDescription>
                      {c.active_sub_warning_prefix}{daysLeft}{daysLeft !== 1 ? c.active_sub_warning_suffix_many : c.active_sub_warning_suffix_one}
                    </AlertDescription>
                  </Alert>
                );
              })()}
              {/* Plan duration radio buttons */}
              <div className="space-y-2">
                <Label>{c.add_duration}</Label>
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
                <Alert variant="destructive">
                  <AlertDescription>{renewError}</AlertDescription>
                </Alert>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setRenewSub(null)} disabled={renewing}>
                  {labels.cancel}
                </Button>
                <Button onClick={handleRenew} disabled={renewing}>
                  {renewing ? labels.loading : c.renew}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
