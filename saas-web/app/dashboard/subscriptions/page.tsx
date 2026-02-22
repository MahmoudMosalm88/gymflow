'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDate, formatCurrency } from '@/lib/format';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner'; // Keeping existing LoadingSpinner for now
import SubscriptionForm from '@/components/dashboard/SubscriptionForm';

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

// Types
type Subscription = {
  id: number;
  member_id: string;
  member_name?: string; // Add member name for display
  start_date: number;
  end_date: number;
  plan_months: number;
  price_paid: number;
  sessions_per_month: number;
  is_active: boolean;
  created_at: number;
};

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
  },
} as const;

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
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  // Search + filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Confirm dialog for activate/deactivate
  const [confirmTarget, setConfirmTarget] = useState<{ sub: Subscription; action: 'activate' | 'deactivate' } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Fetch subscriptions
  const fetchSubs = async () => {
    setLoading(true);
    try {
      const url = memberIdFilter
        ? `/api/subscriptions?member_id=${memberIdFilter}`
        : '/api/subscriptions';
      const res = await api.get<Subscription[]>(url);

      if (res.success && res.data) {
        // Fetch member names to display in the table
        const membersRes = await api.get<Member[]>('/api/members');
        const membersMap = new Map(membersRes.data?.map(m => [m.id, m.name]) || []);
        const subsWithNames = res.data.map(sub => ({
          ...sub,
          member_name: membersMap.get(sub.member_id) || sub.member_id.slice(0, 8), // Fallback to ID
        }));
        setSubs(subsWithNames);
      }
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch members for dropdown
  const fetchMembers = async () => {
    try {
      const res = await api.get<Member[]>('/api/members?q='); // Fetch all members
      if (res.success && res.data) setMembers(res.data);
    } catch (error) {
      console.error("Failed to fetch members for dropdown:", error);
    }
  };

  useEffect(() => {
    fetchSubs();
    fetchMembers();
  }, [memberIdFilter]);

  useEffect(() => {
    if (shouldOpenNewFromQuery) {
      setModalOpen(true);
    }
  }, [shouldOpenNewFromQuery]);

  // Create subscription
  async function handleCreate(data: any) {
    setSubmitting(true);
    try {
      const res = await api.post('/api/subscriptions', data);
      if (res.success) {
        setModalOpen(false);
        fetchSubs(); // refresh list
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
        fetchSubs();
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
  const filtered = subs.filter((sub) => {
    const matchesSearch = !search || (sub.member_name?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'active' && sub.is_active)
      || (statusFilter === 'inactive' && !sub.is_active);
    return matchesSearch && matchesStatus;
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
      </div>

      {/* Subscriptions table */}
      <Card>
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
                      <Badge
                        className={
                          sub.is_active
                            ? 'bg-success hover:bg-success/90'
                            : 'bg-destructive hover:bg-destructive/90'
                        }
                      >
                        {sub.is_active ? labels.subscription_active : labels.subscription_expired}
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
                          <DropdownMenuItem onClick={() => openEditDialog(sub)}>
                            {labels.edit}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {sub.is_active ? (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setConfirmTarget({ sub, action: 'deactivate' })}
                            >
                              {labels.deactivate}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-success"
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
          <SubscriptionForm
            members={members}
            preselectedMemberId={memberIdFilter}
            onSubmit={handleCreate}
            onCancel={() => setModalOpen(false)}
            loading={submitting}
          />
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
