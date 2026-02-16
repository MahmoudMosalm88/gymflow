'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDate, formatCurrency } from '@/lib/format';
import DataTable from '@/components/dashboard/DataTable';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import Modal from '@/components/dashboard/Modal';
import SubscriptionForm from '@/components/dashboard/SubscriptionForm';

// Types
type Subscription = {
  id: string;
  member_id: string;
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
    memberId: 'Member ID',
    startDate: 'Start Date',
    endDate: 'End Date',
    planMonths: 'Months',
    price: 'Price',
    deactivate: 'Deactivate',
    deactivateConfirm: 'Deactivate this subscription?',
  },
  ar: {
    newSubscription: 'اشتراك جديد',
    memberId: 'معرف العضو',
    startDate: 'تاريخ البدء',
    endDate: 'تاريخ الانتهاء',
    planMonths: 'الأشهر',
    price: 'السعر',
    deactivate: 'إلغاء التفعيل',
    deactivateConfirm: 'إلغاء تفعيل هذا الاشتراك؟',
  },
} as const;

export default function SubscriptionsPage() {
  const { lang } = useLang();
  const labels = { ...t[lang], ...pageLabels[lang] };
  const searchParams = useSearchParams();
  const memberIdFilter = searchParams.get('member_id') || '';

  // State
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch subscriptions
  async function fetchSubs() {
    setLoading(true);
    try {
      const url = memberIdFilter
        ? `/api/subscriptions?member_id=${memberIdFilter}`
        : '/api/subscriptions';
      const res = await api.get<Subscription[]>(url);
      if (res.success && res.data) setSubs(res.data);
    } catch {
      // error handled silently — empty table shown
    }
    setLoading(false);
  }

  // Fetch members for dropdown
  async function fetchMembers() {
    try {
      const res = await api.get<Member[]>('/api/members?q=');
      if (res.success && res.data) setMembers(res.data);
    } catch {
      // non-blocking
    }
  }

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
    } catch {
      // error
    }
    setSubmitting(false);
  }

  // Deactivate subscription
  async function handleDeactivate(id: string) {
    if (!window.confirm(labels.deactivateConfirm)) return;
    try {
      const res = await api.patch('/api/subscriptions', { id, is_active: false });
      if (res.success) fetchSubs();
    } catch {
      // error
    }
  }

  // Locale for date formatting
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  // Table columns
  const columns = [
    { key: 'member_id', label: labels.memberId, render: (row: Subscription) => row.member_id.slice(0, 8) },
    { key: 'start_date', label: labels.startDate, render: (row: Subscription) => formatDate(row.start_date, locale) },
    { key: 'end_date', label: labels.endDate, render: (row: Subscription) => formatDate(row.end_date, locale) },
    { key: 'plan_months', label: labels.planMonths },
    { key: 'price_paid', label: labels.price, render: (row: Subscription) => formatCurrency(row.price_paid || 0) },
    {
      key: 'is_active',
      label: labels.status,
      render: (row: Subscription) => (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
          row.is_active ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
        }`}>
          {row.is_active ? labels.active : labels.expired}
        </span>
      ),
    },
    {
      key: '_actions',
      label: labels.actions,
      render: (row: Subscription) =>
        row.is_active ? (
          <button
            onClick={(e) => { e.stopPropagation(); handleDeactivate(row.id); }}
            className="rounded px-2 py-1 text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors"
          >
            {labels.deactivate}
          </button>
        ) : null,
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#f3f6ff]">{labels.subscriptions}</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-[#FF8C00] px-4 py-2 text-sm font-medium text-white hover:bg-[#e07b00] transition-colors"
        >
          {labels.newSubscription}
        </button>
      </div>

      {/* Subscriptions table */}
      <DataTable columns={columns} data={subs} searchable />

      {/* New subscription modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={labels.newSubscription}>
        <SubscriptionForm
          members={members}
          preselectedMemberId={memberIdFilter}
          onSubmit={handleCreate}
          onCancel={() => setModalOpen(false)}
          loading={submitting}
        />
      </Modal>
    </div>
  );
}
