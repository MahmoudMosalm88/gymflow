'use client';

import { useState, useEffect } from 'react';
import { useLang, t } from '@/lib/i18n';

type Member = { id: string; name: string };

type SubscriptionFormData = {
  member_id: string;
  start_date: number;       // unix seconds
  end_date: number;         // unix seconds
  plan_months: number;
  price_paid?: number;
  sessions_per_month?: number;
};

type Props = {
  members: Member[];
  preselectedMemberId?: string;
  onSubmit: (data: SubscriptionFormData) => void;
  onCancel: () => void;
  loading?: boolean;
};

/** Convert a YYYY-MM-DD string to unix seconds (midnight local time) */
function dateToUnix(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

/** Convert unix seconds to YYYY-MM-DD for date input */
function unixToDateInput(unix: number): string {
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

/** Add months to a YYYY-MM-DD string and return new YYYY-MM-DD */
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// Subscription-specific labels not in global i18n
const formLabels = {
  en: {
    member: 'Member',
    startDate: 'Start Date',
    planMonths: 'Plan (Months)',
    endDate: 'End Date',
    pricePaid: 'Price Paid',
    sessionsPerMonth: 'Sessions / Month',
    newSubscription: 'New Subscription',
    selectMember: 'Select a member...',
  },
  ar: {
    member: 'العضو',
    startDate: 'تاريخ البدء',
    planMonths: 'المدة (أشهر)',
    endDate: 'تاريخ الانتهاء',
    pricePaid: 'المبلغ المدفوع',
    sessionsPerMonth: 'الحصص / شهر',
    newSubscription: 'اشتراك جديد',
    selectMember: 'اختر عضو...',
  },
} as const;

// Shared input styles
const inputClass =
  'w-full rounded-lg border border-[#1e2a45] bg-[#0c1324] px-3 py-2 text-sm text-[#f3f6ff] placeholder-[#8892a8] outline-none focus:border-[#FF8C00]';

export default function SubscriptionForm({ members, preselectedMemberId, onSubmit, onCancel, loading }: Props) {
  const { lang } = useLang();
  const labels = { ...t[lang], ...formLabels[lang] };

  // Form state
  const [memberId, setMemberId] = useState(preselectedMemberId || '');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [planMonths, setPlanMonths] = useState(1);
  const [pricePaid, setPricePaid] = useState('');
  const [sessionsPerMonth, setSessionsPerMonth] = useState('');

  // Auto-calculated end date
  const endDate = addMonths(startDate, planMonths);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId) return;

    const data: SubscriptionFormData = {
      member_id: memberId,
      start_date: dateToUnix(startDate),
      end_date: dateToUnix(endDate),
      plan_months: planMonths,
    };
    if (pricePaid) data.price_paid = Number(pricePaid);
    if (sessionsPerMonth) data.sessions_per_month = Number(sessionsPerMonth);

    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Member select */}
      <div>
        <label className="mb-1 block text-sm text-[#8892a8]">{labels.member}</label>
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          required
          className={inputClass}
        >
          <option value="">{labels.selectMember}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Start date + Plan months in a row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm text-[#8892a8]">{labels.startDate}</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-[#8892a8]">{labels.planMonths}</label>
          <select
            value={planMonths}
            onChange={(e) => setPlanMonths(Number(e.target.value))}
            className={inputClass}
          >
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Auto-calculated end date (read only) */}
      <div>
        <label className="mb-1 block text-sm text-[#8892a8]">{labels.endDate}</label>
        <input type="date" value={endDate} readOnly className={`${inputClass} opacity-60`} />
      </div>

      {/* Price + Sessions row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm text-[#8892a8]">{labels.pricePaid}</label>
          <input
            type="number"
            min="0"
            value={pricePaid}
            onChange={(e) => setPricePaid(e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-[#8892a8]">{labels.sessionsPerMonth}</label>
          <input
            type="number"
            min="0"
            value={sessionsPerMonth}
            onChange={(e) => setSessionsPerMonth(e.target.value)}
            placeholder="—"
            className={inputClass}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[#1e2a45] px-4 py-2 text-sm text-[#8892a8] hover:text-[#f3f6ff] transition-colors"
        >
          {labels.cancel}
        </button>
        <button
          type="submit"
          disabled={loading || !memberId}
          className="rounded-lg bg-[#FF8C00] px-4 py-2 text-sm font-medium text-white hover:bg-[#e07b00] disabled:opacity-50 transition-colors"
        >
          {loading ? labels.loading : labels.create}
        </button>
      </div>
    </form>
  );
}
