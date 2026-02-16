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
import { DotsHorizontalIcon, PlusIcon } from '@radix-ui/react-icons'; // Icons for actions
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
  id: string;
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

// Page-specific labels
const pageLabels = {
  en: {
    newSubscription: 'New Subscription',
    member: 'Member',
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
    open_menu: 'Open menu',
    subscription_actions: 'Subscription Actions',
  },
  ar: {
    newSubscription: 'اشتراك جديد',
    member: 'العضو',
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

  // State
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [members, setMembers] = useState<Member[]>([]); // For the form dropdown
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

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

  // Deactivate subscription
  async function handleDeactivate(id: string) {
    setDeactivatingId(id);
    try {
      // Assuming a confirm dialog will be shown by parent page
      const res = await api.patch('/api/subscriptions', { id, is_active: false });
      if (res.success) {
        fetchSubs();
      }
    } catch (error) {
      console.error("Failed to deactivate subscription:", error);
    } finally {
      setDeactivatingId(null);
    }
  }

  // Locale for date formatting
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  // Table columns (responsive visibility using Tailwind)
  const columns = [
    { key: 'member_name', label: labels.member, className: 'w-[150px]' },
    { key: 'start_date', label: labels.startDate, className: 'hidden sm:table-cell' },
    { key: 'end_date', label: labels.endDate, className: 'hidden sm:table-cell' },
    { key: 'plan_months', label: labels.planMonths, className: 'hidden md:table-cell' },
    { key: 'price_paid', label: labels.price, className: 'hidden lg:table-cell' },
    { key: 'status', label: labels.status, className: 'w-[100px]' },
    { key: '_actions', label: labels.actions, className: 'w-[50px] text-right' },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{labels.subscriptions}</h1>
        <Button onClick={() => setModalOpen(true)} className="text-base">
          <PlusIcon className={lang === 'ar' ? 'ml-2 h-4 w-4' : 'mr-2 h-4 w-4'} />
          {labels.newSubscription}
        </Button>
      </div>

      {/* Subscriptions table */}
      <Card>
        <div className="rounded-md border">
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
              {subs.length > 0 ? (
                subs.map((sub) => (
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
                    <TableCell className="text-right">
                      <DropdownMenu dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{labels.open_menu}</span>
                            <DotsHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={lang === 'ar' ? 'start' : 'end'}>
                          <DropdownMenuLabel>{labels.subscription_actions}</DropdownMenuLabel>
                          {/* Future: View/Edit subscription details */}
                          {/* <DropdownMenuItem onClick={() => router.push(`/dashboard/subscriptions/${sub.id}`)}>
                            {labels.view}
                          </DropdownMenuItem> */}
                          <DropdownMenuItem onClick={() => { /* Implement edit logic */ }}>
                            {labels.edit}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {sub.is_active && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeactivate(sub.id)}
                              disabled={deactivatingId === sub.id}
                            >
                              {deactivatingId === sub.id ? labels.loading : labels.deactivate}
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
    </div>
  );
}
