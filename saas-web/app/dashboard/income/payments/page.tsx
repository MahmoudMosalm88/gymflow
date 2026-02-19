'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatCurrency, formatDate } from '@/lib/format';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Payment = {
  id: number;
  date: string;
  name: string;
  amount: number;
  planMonths: number;
  sessionsPerMonth: number | null;
};

type PaymentsResponse = { data: Payment[]; hasMore: boolean };

const LIMIT = 20;

export default function AllPaymentsPage() {
  const { lang } = useLang();
  const labels = t[lang];
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchPayments = useCallback((searchTerm: string, offset: number, append: boolean) => {
    const setter = offset === 0 ? setLoading : setLoadingMore;
    setter(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
    if (searchTerm) params.set('search', searchTerm);

    api.get<PaymentsResponse>(`/api/income/payments?${params}`)
      .then((res) => {
        if (res.data) {
          setPayments((prev) => append ? [...prev, ...res.data!.data] : res.data!.data);
          setHasMore(res.data.hasMore);
        }
      })
      .catch(() => {})
      .finally(() => setter(false));
  }, []);

  // Initial load
  useEffect(() => {
    fetchPayments('', 0, false);
  }, [fetchPayments]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPayments(value, 0, false);
    }, 300);
  };

  const handleLoadMore = () => {
    fetchPayments(search, payments.length, true);
  };

  return (
    <div
      className="flex flex-col gap-6 p-4 md:p-6 lg:p-8"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/income" className="text-[#8a8578] hover:text-[#e8e4df] transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d={lang === 'ar' ? 'M8 4l6 6-6 6' : 'M12 4l-6 6 6 6'} />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#e8e4df]">{labels.all_payments}</h1>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder={labels.search_by_name}
        className="w-full max-w-sm px-4 py-2.5 bg-[#1e1e1e] border border-[#3a3a3a] text-sm text-[#e8e4df] placeholder-[#8a8578] outline-none focus:border-[#e63946]"
      />

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.all_payments}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-[#8a8578] py-8 text-center">{labels.no_income_yet}</p>
          ) : (
            <>
              <div className="overflow-auto border border-[#2a2a2a]">
                <table className="w-full text-sm">
                  <thead className="bg-[#1a1a1a] text-[#8a8578]">
                    <tr>
                      <th className="text-start px-4 py-2.5 font-medium">{labels.date_col}</th>
                      <th className="text-start px-4 py-2.5 font-medium">{labels.name_col}</th>
                      <th className="text-end px-4 py-2.5 font-medium">{labels.amount_col}</th>
                      <th className="text-start px-4 py-2.5 font-medium hidden sm:table-cell">{labels.details_col}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-t border-[#2a2a2a] hover:bg-[#1e1e1e]">
                        <td className="px-4 py-2.5 text-[#8a8578]">{formatDate(p.date, locale)}</td>
                        <td className="px-4 py-2.5 text-[#e8e4df]">{p.name}</td>
                        <td className="px-4 py-2.5 text-end font-semibold text-[#e8e4df]">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-2.5 text-[#8a8578] hidden sm:table-cell">
                          {p.planMonths} {labels.months_label}
                          {p.sessionsPerMonth != null && `, ${p.sessionsPerMonth} ${labels.sessions_per_month_label}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-2.5 bg-[#1e1e1e] border border-[#2a2a2a] text-sm text-[#e8e4df] hover:bg-[#262626] disabled:opacity-50 transition-colors"
                  >
                    {loadingMore ? labels.loading : labels.load_more}
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
