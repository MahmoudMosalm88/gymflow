'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDate, formatCurrency } from '@/lib/format';
import { getCachedMembers, getCachedSubscriptions } from '@/lib/offline/read-model';
import { saveSubscriptionCreate } from '@/lib/offline/actions';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

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

// The full subscription form is only needed when staff open the new-subscription dialog.
const SubscriptionForm = dynamic(() => import('@/components/dashboard/SubscriptionForm'));

// Types
type Subscription = {
  id: number;
  member_id: string;
  member_name?: string; // Add member name for display
  renewed_from_subscription_id?: number | null;
  start_date: number;
  end_date: number;
  plan_months: number;
  price_paid: number;
  sessions_per_month: number;
  is_active: boolean;
  created_at: number;
  sync_status?: string;
};

type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'inactive';

type Member = { id: string; name: string };
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
    subscription_inactive: 'Inactive', // For explicitly deactivated
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

export default function SubscriptionsPage() {
  const { lang } = useLang();
  const router = useRouter();
  const labels = { ...t[lang], ...pageLabels[lang] };
  const searchParams = useSearchParams();
  const memberIdFilter = searchParams.get('member_id') || '';
  const shouldOpenNewFromQuery = searchParams.get('new') === '1';

  // State
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  // Search + filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
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
      const res = await api.get<Member[]>('/api/members?q=');
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
  async function handleCreate(data: any) {
    setSubmitting(true);
    try {
      const current = subs.find((item) => item.member_id === data.member_id && (deriveStatus(item) === 'active' || deriveStatus(item) === 'pending'));
      const res = await saveSubscriptionCreate({
        memberId: data.member_id,
        memberName: members.find((member) => member.id === data.member_id)?.name || null,
        startDate: data.start_date,
        planMonths: data.plan_months,
        pricePaid: data.price_paid ?? null,
        sessionsPerMonth: data.sessions_per_month ?? null,
        expectedActiveSubscriptionId: current?.id ?? null,
      });
      if (res.success) {
        setModalOpen(false);
        await fetchSubs();
      }
    } catch (error) {
      console.error("Failed to create subscription:", error);
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

  // Client-side search + filter
  const baseFiltered = subs.filter((sub) => {
    const status = deriveStatus(sub);
    const matchesSearch = !search || (sub.member_name?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'active' && (status === 'active' || status === 'pending'))
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
    { key: 'status', label: labels.status, className: 'w-[100px]' },
    { key: '_actions', label: labels.actions, className: 'w-[50px] text-end' },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{labels.subscriptions}</h1>
        <Button onClick={() => setModalOpen(true)} className="text-base">
          <PlusIcon className={lang === 'ar' ? 'ms-2 h-4 w-4' : 'me-2 h-4 w-4'} />
          {labels.newSubscription}
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-3">
        <Input
          type="text"
          placeholder={labels.search_subscriptions}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{labels.all_statuses}</SelectItem>
            <SelectItem value="active">{labels.subscription_active}</SelectItem>
            <SelectItem value="inactive">{labels.subscription_expired}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setShowHistory((value) => !value)}>
          {showHistory ? labels.hideHistory : labels.showHistory}
        </Button>
      </div>

      {/* Subscriptions table */}
      <Card>
        <div className="border-b px-4 py-3 text-sm text-muted-foreground">
          {showHistory
            ? (lang === 'ar'
                ? 'يتم الآن عرض الدورات الحالية مع السجل السابق.'
                : 'Showing current cycles with historical subscription cycles.')
            : (lang === 'ar'
                ? 'يتم التركيز افتراضياً على الدورة الحالية أو القادمة لكل عميل.'
                : 'Default view focuses on the current or upcoming cycle for each client.')}
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
                filtered.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.member_name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(sub.start_date, locale)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(sub.end_date, locale)}</TableCell>
                    <TableCell className="hidden md:table-cell">{sub.plan_months}</TableCell>
                    <TableCell className="hidden lg:table-cell">{formatCurrency(sub.price_paid || 0)}</TableCell>
                    <TableCell>
                      {(() => {
                        const status = deriveStatus(sub);
                        const badgeClass =
                          status === 'active'
                            ? 'bg-success hover:bg-success/90'
                            : status === 'pending'
                              ? 'bg-info hover:bg-info/90'
                              : 'bg-destructive hover:bg-destructive/90';
                        const text =
                          status === 'active'
                            ? labels.subscription_active
                            : status === 'pending'
                              ? labels.upcoming
                              : sub.renewed_from_subscription_id
                                ? labels.historical_cycle
                                : labels.subscription_expired;
                        return (
                      <Badge
                        className={badgeClass}
                      >
                        {text}
                      </Badge>
                        );
                      })()}
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
                ))
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
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{labels.newSubscription}</DialogTitle>
            <DialogDescription>
              {labels.new_subscription_description}
            </DialogDescription>
          </DialogHeader>
          {modalOpen ? (
            <SubscriptionForm
              members={members}
              preselectedMemberId={memberIdFilter}
              onSubmit={handleCreate}
              onCancel={() => setModalOpen(false)}
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
              {labels.edit} #{editingId ?? ''}
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
                <Label htmlFor="edit-sessions">{labels.sessionsPerMonth || 'Sessions / month'}</Label>
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
