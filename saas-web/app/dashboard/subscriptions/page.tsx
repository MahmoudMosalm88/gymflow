'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDate, formatCurrency } from '@/lib/format';
import { getCachedMembers, getCachedSubscriptions } from '@/lib/offline/read-model';
import { saveSubscriptionCreate } from '@/lib/offline/actions';
import { DEFAULT_PAYMENT_METHOD } from '@/lib/payment-method-ui';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import StatCard from '@/components/dashboard/StatCard';
import type { SubscriptionSubmitData } from '@/components/dashboard/SubscriptionForm';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DotsHorizontalIcon, PlusIcon } from '@radix-ui/react-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { EntityRef } from '@/lib/entities';

// The full subscription form is only needed when staff open the new-subscription dialog.
const SubscriptionForm = dynamic(() => import('@/components/dashboard/SubscriptionForm'));

// Types
type Subscription = {
  id: number;
  member_id: string;
  member_name?: string;
  renewed_from_subscription_id?: number | null;
  start_date: number;
  end_date: number;
  plan_months: number;
  price_paid: number;
  payment_method?: 'cash' | 'digital' | null;
  sessions_per_month: number;
  is_active: boolean;
  freeze_status?: string | null;
  created_at: number;
  sync_status?: string;
};

type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'inactive';
type StatusFilter = 'all' | 'active' | 'expiring' | 'frozen' | 'inactive';

type EditDraft = {
  id: number;
  start_date: string;
  plan_months: string;
  price_paid: string;
  sessions_per_month: string;
};

// Page-specific labels
const pageLabels = {
  en: {
    newSubscription: 'New Subscription',
    member: 'Client',
    startDate: 'Start Date',
    endDate: 'End Date',
    planMonths: 'Months',
    price: 'Price',
    deactivate: 'Deactivate',
    deactivateConfirm: 'Deactivate this subscription?',
    subscription_active: 'Active',
    subscription_expired: 'Expired',
    subscription_inactive: 'Inactive',
    status: 'Status',
    no_subscriptions_found: 'No subscriptions found.',
    view: 'View',
    edit: 'Edit',
    editSubscription: 'Edit Subscription',
    saveChanges: 'Save Changes',
    open_menu: 'Open menu',
    subscription_actions: 'Subscription Actions',
    currentCycles: 'Current Cycles',
    showHistory: 'Show History',
    hideHistory: 'Hide History',
    upcoming: 'Upcoming',
    historical_cycle: 'History',
    payment_method: 'Payment Method',
    payment_method_cash: 'Cash',
    payment_method_digital: 'Digital',
    // Stat card labels
    stat_active: 'Active',
    stat_expiring: 'Expiring This Week',
    stat_frozen: 'Frozen',
    stat_total: 'Total',
    // Filter labels
    filter_expiring: 'Expiring',
    filter_frozen: 'Frozen',
    filter_ended: 'Ended',
    // Table caption copy
    caption_with_history: 'Showing current cycles with historical subscription cycles.',
    caption_default: 'Default view focuses on the current or upcoming cycle for each client.',
    // Sessions edit label
    sessions_per_month: 'Sessions / month',
    days_left: 'Days Left',
  },
  ar: {
    newSubscription: 'اشتراك جديد',
    member: 'العميل',
    startDate: 'تاريخ البدء',
    endDate: 'تاريخ الانتهاء',
    planMonths: 'الأشهر',
    price: 'السعر',
    deactivate: 'إلغاء التفعيل',
    deactivateConfirm: 'إلغاء تفعيل هذا الاشتراك؟',
    subscription_active: 'نشط',
    subscription_expired: 'منتهي',
    subscription_inactive: 'غير نشط',
    status: 'الحالة',
    no_subscriptions_found: 'لم يتم العثور على اشتراكات.',
    view: 'عرض',
    edit: 'تعديل',
    editSubscription: 'تعديل الاشتراك',
    saveChanges: 'حفظ التغييرات',
    open_menu: 'فتح القائمة',
    subscription_actions: 'إجراءات الاشتراك',
    currentCycles: 'الدورات الحالية',
    showHistory: 'عرض السجل',
    hideHistory: 'إخفاء السجل',
    upcoming: 'قادمة',
    historical_cycle: 'سجل',
    payment_method: 'طريقة الدفع',
    payment_method_cash: 'نقدي',
    payment_method_digital: 'رقمي',
    // Stat card labels
    stat_active: 'نشط',
    stat_expiring: 'تنتهي هذا الأسبوع',
    stat_frozen: 'مجمّد',
    stat_total: 'الإجمالي',
    // Filter labels
    filter_expiring: 'تنتهي قريباً',
    filter_frozen: 'مجمّد',
    filter_ended: 'منتهي',
    // Table caption copy
    caption_with_history: 'يتم الآن عرض الدورات الحالية مع السجل السابق.',
    caption_default: 'يتم التركيز افتراضياً على الدورة الحالية أو القادمة لكل عميل.',
    // Sessions edit label
    sessions_per_month: 'جلسات / شهر',
    days_left: 'متبقي',
  },
} as const;

function deriveStatus(sub: Subscription): SubscriptionStatus {
  const nowDate = new Date();
  const todayStart = Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()) / 1000;
  const todayEnd = todayStart + 86400;
  if (!sub.is_active) return 'inactive';
  if (sub.end_date < todayStart) return 'expired';
  if (sub.start_date >= todayEnd) return 'pending';
  return 'active';
}

// Returns true if the subscription's end_date falls within the next 7 days
function isExpiringThisWeek(sub: Subscription): boolean {
  const nowDate = new Date();
  const todayStart = Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()) / 1000;
  const weekEnd = todayStart + 7 * 86400;
  return sub.is_active && sub.end_date >= todayStart && sub.end_date < weekEnd;
}

export default function SubscriptionsPage() {
  const { lang } = useLang();
  const router = useRouter();
  const labels = { ...t[lang], ...pageLabels[lang] };
  const searchParams = useSearchParams();
  const memberIdFilter = searchParams.get('member_id') || '';
  const shouldOpenNewFromQuery = searchParams.get('new') === '1';

  // State
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [members, setMembers] = useState<EntityRef[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  // Search + filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showHistory, setShowHistory] = useState(false);

  // Confirm dialog for activate/deactivate
  const [confirmTarget, setConfirmTarget] = useState<{ sub: Subscription; action: 'activate' | 'deactivate' } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Fetch subscriptions
  const fetchSubs = useCallback(async () => {
    setLoading(true);
    let loadedFromServer = false;
    try {
      const url = memberIdFilter
        ? `/api/subscriptions?member_id=${memberIdFilter}`
        : '/api/subscriptions';
      const res = await api.get<Subscription[]>(url);

      if (res.success && res.data) {
        const subsWithNames = res.data.map((sub) => ({
          ...sub,
          member_name: sub.member_name || sub.member_id.slice(0, 8),
        }));
        setSubs(subsWithNames);
        loadedFromServer = true;
      }
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
    } finally {
      if (!loadedFromServer) {
        try {
          const cached = await getCachedSubscriptions(memberIdFilter || undefined);
          setSubs(cached.map((sub) => ({
            ...sub,
            member_name: sub.member_name || sub.member_id.slice(0, 8),
            price_paid: sub.price_paid ?? 0,
            created_at: sub.created_at,
          } as Subscription)));
        } catch {
          // Ignore cache load errors.
        }
      }
      setLoading(false);
    }
  }, [memberIdFilter]);

  // Fetch members for dropdown
  const fetchMembers = useCallback(async () => {
    if (membersLoaded || membersLoading) return;
    setMembersLoading(true);
    let loadedFromServer = false;
    try {
      const res = await api.get<EntityRef[]>('/api/members?q=');
      if (res.success && res.data) {
        setMembers(res.data);
        setMembersLoaded(true);
        loadedFromServer = true;
      }
    } catch (error) {
      console.error("Failed to fetch members for dropdown:", error);
    } finally {
      if (!loadedFromServer) {
        try {
          const cachedMembers = await getCachedMembers('');
          setMembers(cachedMembers.map((member) => ({ id: member.id, name: member.name })));
          setMembersLoaded(true);
        } catch {
          // Ignore cache load errors.
        }
      }
      setMembersLoading(false);
    }
  }, [membersLoaded, membersLoading]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    void fetchSubs();
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [fetchSubs]);

  useEffect(() => {
    if (modalOpen) {
      void fetchMembers();
    }
  }, [modalOpen, fetchMembers]);

  useEffect(() => {
    if (shouldOpenNewFromQuery) {
      setModalOpen(true);
    }
  }, [shouldOpenNewFromQuery]);

  // Create subscription
  async function handleCreate(data: SubscriptionSubmitData) {
    setSubmitting(true);
    setCreateError('');
    try {
      const current = subs.find((item) => item.member_id === data.member_id && (deriveStatus(item) === 'active' || deriveStatus(item) === 'pending'));
      const res = await saveSubscriptionCreate({
        memberId: data.member_id,
        memberName: members.find((member) => member.id === data.member_id)?.name || null,
        startDate: data.start_date,
        planMonths: data.plan_months,
        pricePaid: data.price_paid ?? null,
        paymentMethod: DEFAULT_PAYMENT_METHOD,
        sessionsPerMonth: data.sessions_per_month ?? null,
        expectedActiveSubscriptionId: current?.id ?? null,
      });
      if (res.success) {
        setModalOpen(false);
        await fetchSubs();
      }
    } catch (error) {
      console.error("Failed to create subscription:", error);
      setCreateError(error instanceof Error ? error.message : labels.error);
    } finally {
      setSubmitting(false);
    }
  }

  // Activate or deactivate subscription (called from confirm dialog)
  async function handleToggleActive() {
    if (!confirmTarget || confirmLoading) return;
    setConfirmLoading(true);
    try {
      const newActive = confirmTarget.action === 'activate';
      const res = await api.patch('/api/subscriptions', { id: confirmTarget.sub.id, is_active: newActive });
      if (res.success) {
        setConfirmTarget(null);
        await fetchSubs();
      }
    } catch (error) {
      console.error("Failed to update subscription:", error);
    } finally {
      setConfirmLoading(false);
    }
  }

  function openEditDialog(sub: Subscription) {
    const isoDate = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);
    setEditingId(sub.id);
    setEditDraft({
      id: sub.id,
      start_date: isoDate(sub.start_date),
      plan_months: String(sub.plan_months ?? 1),
      price_paid: String(sub.price_paid ?? 0),
      sessions_per_month: String(sub.sessions_per_month ?? ''),
    });
    setEditOpen(true);
  }

  async function handleEditSave() {
    if (!editDraft || editSaving) return;
    const startDateUnix = Math.floor(new Date(`${editDraft.start_date}T00:00:00`).getTime() / 1000);
    const planMonths = Number(editDraft.plan_months);
    const pricePaid = Number(editDraft.price_paid);
    const sessionsPerMonth = editDraft.sessions_per_month.trim() === ''
      ? null
      : Number(editDraft.sessions_per_month);

    if (!Number.isFinite(startDateUnix) || startDateUnix <= 0) return;
    if (!Number.isFinite(planMonths) || planMonths <= 0) return;
    if (!Number.isFinite(pricePaid) || pricePaid < 0) return;
    if (sessionsPerMonth !== null && (!Number.isFinite(sessionsPerMonth) || sessionsPerMonth <= 0)) return;

    setEditSaving(true);
    try {
      const res = await api.patch('/api/subscriptions', {
        id: editDraft.id,
        start_date: startDateUnix,
        plan_months: planMonths,
        price_paid: pricePaid,
        sessions_per_month: sessionsPerMonth,
      });
      if (res.success) {
        setEditOpen(false);
        setEditDraft(null);
        setEditingId(null);
        await fetchSubs();
      }
    } catch (error) {
      console.error("Failed to edit subscription:", error);
    } finally {
      setEditSaving(false);
    }
  }

  // Locale for date formatting
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  // Derive stat card counts from the full subscriptions list (not the filtered view)
  const stats = useMemo(() => {
    const activeCount = subs.filter((s) => s.is_active).length;
    const expiringCount = subs.filter((s) => isExpiringThisWeek(s)).length;
    const frozenCount = subs.filter((s) => s.freeze_status === 'frozen').length;
    const totalCount = subs.length;
    return { activeCount, expiringCount, frozenCount, totalCount };
  }, [subs]);

  // Client-side search + filter
  const baseFiltered = subs.filter((sub) => {
    const status = deriveStatus(sub);
    const matchesSearch = !search || (sub.member_name?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus =
      statusFilter === 'all'
      || (statusFilter === 'active' && (status === 'active' || status === 'pending'))
      || (statusFilter === 'expiring' && isExpiringThisWeek(sub))
      || (statusFilter === 'frozen' && sub.freeze_status === 'frozen')
      || (statusFilter === 'inactive' && (status === 'expired' || status === 'inactive'));
    return matchesSearch && matchesStatus;
  });

  const filtered = showHistory
    ? baseFiltered
    : baseFiltered.filter((sub, index) => {
        if (!memberIdFilter) return true;
        return index === 0;
      });

  // Table columns (responsive visibility using Tailwind)
  const columns = [
    { key: 'member_name', label: labels.member, className: 'w-[150px]' },
    { key: 'start_date', label: labels.startDate, className: 'hidden sm:table-cell' },
    { key: 'end_date', label: labels.endDate, className: 'hidden sm:table-cell' },
    { key: 'plan_months', label: labels.planMonths, className: 'hidden md:table-cell' },
    { key: 'price_paid', label: labels.price, className: 'hidden lg:table-cell' },
    { key: 'days_left', label: labels.days_left, className: 'hidden md:table-cell w-[80px]' },
    { key: 'status', label: labels.status, className: 'w-[100px]' },
    { key: '_actions', label: labels.actions, className: 'w-[50px] text-end' },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-heading font-bold tracking-tight">{labels.subscriptions}</h1>
        <Button onClick={() => setModalOpen(true)} className="text-base">
          <PlusIcon className="me-2 h-4 w-4" />
          {labels.newSubscription}
        </Button>
      </div>

      {/* Stat cards */}
      <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button className="text-start" onClick={() => setStatusFilter('active')}>
          <StatCard label={labels.stat_active} value={stats.activeCount} color="text-success" />
        </button>
        <button className="text-start" onClick={() => setStatusFilter('expiring')}>
          <StatCard label={labels.stat_expiring} value={stats.expiringCount} color={stats.expiringCount > 0 ? 'text-warning' : 'text-muted-foreground'} />
        </button>
        <button className="text-start" onClick={() => setStatusFilter('frozen')}>
          <StatCard label={labels.stat_frozen} value={stats.frozenCount} color="text-info" />
        </button>
        <button className="text-start" onClick={() => setStatusFilter('all')}>
          <StatCard label={labels.stat_total} value={stats.totalCount} color="text-foreground" />
        </button>
      </div>

      {/* Search + filter */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Input
          type="text"
          placeholder={labels.search_subscriptions}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{labels.all_statuses}</SelectItem>
            <SelectItem value="active">{labels.subscription_active}</SelectItem>
            <SelectItem value="expiring">{labels.filter_expiring}</SelectItem>
            <SelectItem value="frozen">{labels.filter_frozen}</SelectItem>
            <SelectItem value="inactive">{labels.filter_ended}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setShowHistory((value) => !value)}>
          {showHistory ? labels.hideHistory : labels.showHistory}
        </Button>
      </div>

      {/* Subscriptions table */}
      <Card className="mt-6 shadow-[6px_6px_0_#000000]">
        <div className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
          {showHistory ? labels.caption_with_history : labels.caption_default}
        </div>
        <div className="border-2 border-border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key} className={col.className}>
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? (
                filtered.map((sub) => {
                  const status = deriveStatus(sub);
                  const expiring = isExpiringThisWeek(sub);
                  const frozen = sub.freeze_status === 'frozen';

                  // Row accent: expiring takes priority over frozen; inactive/expired gets opacity
                  const rowClass = expiring
                    ? 'border-s-2 border-s-warning'
                    : frozen
                      ? 'border-s-2 border-s-info'
                      : (status === 'expired' || status === 'inactive')
                        ? 'opacity-60'
                        : '';

                  return (
                    <TableRow key={sub.id} className={rowClass}>
                      <TableCell className="font-medium max-w-[200px]">
                        <span className="truncate block">{sub.member_name}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{formatDate(sub.start_date, locale)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{formatDate(sub.end_date, locale)}</TableCell>
                      <TableCell className="hidden md:table-cell">{sub.plan_months}</TableCell>
                      <TableCell className="hidden lg:table-cell tabular-nums">{formatCurrency(sub.price_paid || 0)}</TableCell>
                      <TableCell className="hidden md:table-cell tabular-nums">
                        {(() => {
                          if (status === 'expired' || status === 'inactive') return <span className="text-muted-foreground">—</span>;
                          const now = Math.floor(Date.now() / 1000);
                          const daysLeft = Math.max(0, Math.ceil((sub.end_date - now) / 86400));
                          return (
                            <span className={daysLeft <= 3 ? 'text-destructive font-bold' : daysLeft <= 7 ? 'text-warning font-semibold' : 'text-muted-foreground'}>
                              {daysLeft}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          status === 'active'
                            ? 'bg-success/20 text-success border-success/30'
                            : status === 'pending'
                              ? 'bg-info/20 text-info border-info/30'
                              : 'bg-destructive/20 text-destructive border-destructive/30'
                        }>
                          {status === 'active'
                            ? labels.subscription_active
                            : status === 'pending'
                              ? labels.upcoming
                              : sub.renewed_from_subscription_id
                                ? labels.historical_cycle
                                : labels.subscription_expired}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        <DropdownMenu dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">{labels.open_menu}</span>
                              <DotsHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={lang === 'ar' ? 'start' : 'end'}>
                            <DropdownMenuLabel>{labels.subscription_actions}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/members/${sub.member_id}`)}>
                              {labels.view}
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={!online} onClick={() => openEditDialog(sub)}>
                              {labels.edit}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {sub.is_active ? (
                              <DropdownMenuItem
                                className="text-destructive"
                                disabled={!online}
                                onClick={() => setConfirmTarget({ sub, action: 'deactivate' })}
                              >
                                {labels.deactivate}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-success"
                                disabled={!online}
                                onClick={() => setConfirmTarget({ sub, action: 'activate' })}
                              >
                                {labels.activate}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {labels.no_subscriptions_found}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* New subscription dialog */}
      <Dialog open={modalOpen} onOpenChange={(open) => {
        setModalOpen(open);
        if (!open) setCreateError('');
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{labels.newSubscription}</DialogTitle>
            <DialogDescription>
              {labels.new_subscription_description}
            </DialogDescription>
          </DialogHeader>
          {createError ? (
            <p className="text-sm text-destructive">{createError}</p>
          ) : null}
          {modalOpen ? (
            <SubscriptionForm
              members={members}
              preselectedMemberId={memberIdFilter}
              onSubmit={handleCreate}
              onCancel={() => {
                setCreateError('');
                setModalOpen(false);
              }}
              loading={submitting || membersLoading}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit subscription dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditDraft(null);
            setEditingId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{labels.editSubscription}</DialogTitle>
            <DialogDescription>
              {subs.find(s => s.id === editingId)?.member_name || `#${editingId ?? ''}`}
            </DialogDescription>
          </DialogHeader>
          {editDraft && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-start-date">{labels.startDate}</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editDraft.start_date}
                  onChange={(e) => setEditDraft((prev) => prev ? { ...prev, start_date: e.target.value } : prev)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-plan-months">{labels.planMonths}</Label>
                <Input
                  id="edit-plan-months"
                  type="number"
                  min={1}
                  value={editDraft.plan_months}
                  onChange={(e) => setEditDraft((prev) => prev ? { ...prev, plan_months: e.target.value } : prev)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-price">{labels.price}</Label>
                <Input
                  id="edit-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={editDraft.price_paid}
                  onChange={(e) => setEditDraft((prev) => prev ? { ...prev, price_paid: e.target.value } : prev)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-sessions">{labels.sessions_per_month}</Label>
                <Input
                  id="edit-sessions"
                  type="number"
                  min={1}
                  value={editDraft.sessions_per_month}
                  onChange={(e) => setEditDraft((prev) => prev ? { ...prev, sessions_per_month: e.target.value } : prev)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
              {labels.cancel}
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving || !editDraft}>
              {editSaving ? labels.loading : labels.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate/Deactivate confirmation dialog */}
      <Dialog open={!!confirmTarget} onOpenChange={() => setConfirmTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmTarget?.action === 'activate' ? labels.activate_confirm : labels.deactivateConfirm}
            </DialogTitle>
            <DialogDescription>
              {confirmTarget?.action === 'activate'
                ? labels.activate_confirm_description
                : labels.deactivate_confirm_description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)} disabled={confirmLoading}>
              {labels.cancel}
            </Button>
            <Button
              variant={confirmTarget?.action === 'activate' ? 'default' : 'destructive'}
              onClick={handleToggleActive}
              disabled={confirmLoading}
            >
              {confirmLoading
                ? labels.loading
                : confirmTarget?.action === 'activate'
                  ? labels.activate
                  : labels.deactivate}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
