'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatCurrency, formatDate } from '@/lib/format';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

type Payment = {
  id: number;
  date: string;
  name: string;
  amount: number;
  planMonths: number;
  sessionsPerMonth: number | null;
};

type Props = {
  date: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function DayPaymentsSheet({ date, open, onOpenChange }: Props) {
  const { lang } = useLang();
  const labels = t[lang];
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date || !open) return;
    setLoading(true);
    api.get<Payment[]>(`/api/income/daily/${date}`)
      .then((res) => {
        if (res.data) setPayments(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [date, open]);

  // RTL: sheet slides from left; LTR: from right
  const side = lang === 'ar' ? 'left' : 'right';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className="bg-[#141414] border-[#2a2a2a] w-[360px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle className="text-[#e8e4df]">
            {labels.day_payments} {date ? formatDate(date, locale) : ''}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-[#8a8578] text-center py-8">{labels.no_payments_this_day}</p>
          ) : (
            payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-3 bg-[#1e1e1e] border border-[#2a2a2a]"
              >
                <div>
                  <p className="text-sm font-medium text-[#e8e4df]">{p.name}</p>
                  <p className="text-xs text-[#8a8578]">
                    {p.planMonths} {labels.months_label}
                    {p.sessionsPerMonth != null && `, ${p.sessionsPerMonth} ${labels.sessions_per_month_label}`}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[#e8e4df]">{formatCurrency(p.amount)}</span>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
