'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatCurrency, formatDate } from '@/lib/format';
import { getCachedIncomePayments } from '@/lib/offline/read-model';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Payment = {
  id: number | string;
  date: string;
  type: string;
  name: string;
  amount: number;
  planMonths: number;
  sessionsPerMonth: number | null;
};

type PaymentsResponse = { data: Payment[]; hasMore: boolean };
type ConfirmState =
  | { type: 'save' }
  | { type: 'delete'; row: Payment }
  | null;

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
  const [online, setOnline] = useState(true);
  const [editRow, setEditRow] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
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
      .catch(async () => {
        const cached = await getCachedIncomePayments(searchTerm, offset, LIMIT);
        setPayments((prev) => append ? [...prev, ...cached.data] : cached.data);
        setHasMore(cached.hasMore);
      })
      .finally(() => setter(false));
  }, []);

  // Initial load
  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    fetchPayments('', 0, false);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
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

  const refreshCurrent = useCallback(() => {
    fetchPayments(search, 0, false);
  }, [fetchPayments, search]);

  const openEdit = (row: Payment) => {
    const dt = new Date(row.date);
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    setEditRow(row);
    setEditAmount(String(row.amount));
    setEditDate(local);
  };

  const handleSaveEdit = async () => {
    if (!editRow) return;

    const amount = Number(editAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      alert(lang === 'ar' ? 'المبلغ غير صالح.' : 'Invalid amount.');
      return;
    }

    setConfirmState({ type: 'save' });
  };

  const executeSaveEdit = async () => {
    if (!editRow) return;
    const amount = Number(editAmount);
    setSaving(true);
    try {
      await api.patch(`/api/income/payments/${encodeURIComponent(String(editRow.id))}`, {
        amount,
        date: new Date(editDate).toISOString(),
      });
      setConfirmState(null);
      setEditRow(null);
      refreshCurrent();
    } catch {
      alert(lang === 'ar' ? 'فشل تعديل الدفعة.' : 'Failed to update payment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row: Payment) => {
    setConfirmState({ type: 'delete', row });
  };

  const executeDelete = async (row: Payment) => {
    try {
      await api.delete(`/api/income/payments/${encodeURIComponent(String(row.id))}`);
      setConfirmState(null);
      refreshCurrent();
    } catch {
      alert(lang === 'ar' ? 'فشل حذف الدفعة.' : 'Failed to delete payment.');
    }
  };

  return (
    <div
      className="flex flex-col gap-6 p-4 md:p-6 lg:p-8"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/income" className="text-muted-foreground hover:text-foreground transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d={lang === 'ar' ? 'M8 4l6 6-6 6' : 'M12 4l-6 6 6 6'} />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{labels.all_payments}</h1>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder={labels.search_by_name}
        className="w-full max-w-sm px-4 py-2.5 bg-card border border-input text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-destructive"
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
            <p className="text-sm text-muted-foreground py-8 text-center">{labels.no_income_yet}</p>
          ) : (
            <>
              <div className="overflow-auto border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary text-muted-foreground">
                    <tr>
                      <th className="text-start px-4 py-2.5 font-medium">{labels.date_col}</th>
                      <th className="text-start px-4 py-2.5 font-medium">{labels.name_col}</th>
                      <th className="text-end px-4 py-2.5 font-medium">{labels.amount_col}</th>
                      <th className="text-start px-4 py-2.5 font-medium hidden sm:table-cell">{labels.details_col}</th>
                      <th className="text-end px-4 py-2.5 font-medium">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={`${p.type}-${p.id}`} className="border-t border-border hover:bg-card">
                        <td className="px-4 py-2.5 text-muted-foreground">{formatDate(p.date, locale)}</td>
                        <td className="px-4 py-2.5 text-foreground">
                          {p.name}
                          {p.type === 'guest_pass' && (
                            <span className="ml-2 inline-block text-[10px] font-bold tracking-wide px-1.5 py-0.5 bg-muted text-muted-foreground border border-border">
                              {labels.guest_tag}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-end font-semibold text-foreground">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">
                          {p.type === 'guest_pass'
                            ? labels.guest_passes
                            : p.type === 'renewal'
                              ? labels.renewal_payment
                              : <>
                                {p.planMonths} {labels.months_label}
                                {p.sessionsPerMonth != null && `, ${p.sessionsPerMonth} ${labels.sessions_per_month_label}`}
                              </>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-end">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              disabled={!online}
                              className="inline-flex h-8 w-8 items-center justify-center border border-border bg-card text-foreground hover:bg-secondary"
                              aria-label={lang === 'ar' ? 'تعديل الدفعة' : 'Edit payment'}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
                              disabled={!online}
                              className="inline-flex h-8 w-8 items-center justify-center border border-border bg-card text-destructive hover:bg-secondary"
                              aria-label={lang === 'ar' ? 'حذف الدفعة' : 'Delete payment'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
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
                    className="px-6 py-2.5 bg-card border border-border text-sm text-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
                  >
                    {loadingMore ? labels.loading : labels.load_more}
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editRow} onOpenChange={(open) => { if (!open) setEditRow(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{lang === 'ar' ? 'تعديل دفعة' : 'Edit Payment'}</DialogTitle>
            <DialogDescription>
              {lang === 'ar'
                ? 'يمكنك تعديل مبلغ الدفعة وتاريخها فقط. سيتم تطبيق التغييرات على الإيرادات والتقارير.'
                : 'You can only edit payment amount and date. Changes will be applied to income and reports.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{labels.amount_col}</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-card text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">{labels.date_col}</label>
              <input
                type="datetime-local"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-card text-foreground"
              />
            </div>
            <p className="text-xs text-destructive">
              {lang === 'ar'
                ? 'تحذير: تعديل الدفعة سيؤثر على الإيرادات والتقارير ذات الصلة.'
                : 'Warning: editing this payment will affect related income and reports.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditRow(null)}
                className="px-4 py-2 border border-border bg-card text-foreground hover:bg-secondary"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveEdit}
                className="px-4 py-2 border border-border bg-destructive text-destructive-foreground disabled:opacity-60"
              >
                {saving ? labels.loading : (lang === 'ar' ? 'حفظ' : 'Save')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmState} onOpenChange={(open) => { if (!open) setConfirmState(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{lang === 'ar' ? 'تأكيد مطلوب' : 'Confirmation Required'}</DialogTitle>
            <DialogDescription>
              {lang === 'ar'
                ? 'راجع التحذير قبل المتابعة، لأن هذا الإجراء يؤثر على بيانات الإيرادات والتقارير.'
                : 'Review this warning before continuing, because this action affects income and report data.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              {confirmState?.type === 'save'
                ? (lang === 'ar'
                  ? 'تحذير قوي: أنت على وشك تعديل مبلغ أو تاريخ دفعة مسجلة. هذا سيؤثر على الإيرادات والتقارير. هل تريد المتابعة؟'
                  : 'Strong warning: you are about to edit a logged payment amount or date. This will affect income and reports. Do you want to continue?')
                : (lang === 'ar'
                  ? 'تحذير قوي: حذف هذه الدفعة سيؤثر على الإيرادات والتقارير ذات الصلة، ولا يمكن التراجع عن الحذف. هل تريد المتابعة؟'
                  : 'Strong warning: deleting this payment will affect related income and reports, and cannot be undone. Do you want to continue?')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="px-4 py-2 border border-border bg-card text-foreground hover:bg-secondary"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (confirmState?.type === 'save') {
                    executeSaveEdit();
                    return;
                  }
                  if (confirmState?.type === 'delete') {
                    executeDelete(confirmState.row);
                  }
                }}
                className="px-4 py-2 border border-border bg-destructive text-destructive-foreground disabled:opacity-60"
              >
                {saving ? labels.loading : (lang === 'ar' ? 'تأكيد' : 'Confirm')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
