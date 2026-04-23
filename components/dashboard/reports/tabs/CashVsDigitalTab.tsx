'use client';

import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { toFiniteNumber } from '@/lib/coerce';
import StatCard from '@/components/dashboard/StatCard';
import DataTable from '@/components/dashboard/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  data: any;
  lang: string;
  labels: any;
}

export default function CashVsDigitalTab({ data, lang, labels }: Props) {
  return (
    <div className="space-y-6">
      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={labels.cash_payment_method}
          value={formatCurrencyCompact(data?.summary?.cashRevenue ?? 0)}
          color="text-success"
          valueSize="text-2xl"
        />
        <StatCard
          label={labels.digital_payment_method}
          value={formatCurrencyCompact(data?.summary?.digitalRevenue ?? 0)}
          color="text-primary"
          valueSize="text-2xl"
        />
        <StatCard
          label={labels.unknown_payment_method}
          value={formatCurrencyCompact(data?.summary?.unknownRevenue ?? 0)}
          color="text-warning"
          valueSize="text-2xl"
        />
        <StatCard
          label={lang === 'ar' ? 'إجمالي الإيراد' : 'Total Revenue'}
          value={formatCurrencyCompact(data?.summary?.totalRevenue ?? 0)}
          color="text-foreground"
          valueSize="text-2xl"
        />
      </div>

      {/* ── Detail table ── */}
      <Card>
        <CardHeader>
          <CardTitle>{lang === 'ar' ? 'النقدي مقابل الرقمي' : 'Cash vs Digital Split'}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {lang === 'ar'
              ? 'يعرض هذا التبويب الإيراد حسب طريقة الدفع. ستظهر العمليات القديمة بدون طريقة محددة ضمن فئة "غير معروف".'
              : 'This tab splits revenue by payment method. Older records without a stored method remain under "Unknown".'}
          </p>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'method',
                label: labels.payment_method_label,
                render: (row: any) =>
                  row.method === 'cash'
                    ? labels.cash_payment_method
                    : row.method === 'digital'
                    ? labels.digital_payment_method
                    : labels.unknown_payment_method,
              },
              {
                key: 'revenue',
                label: lang === 'ar' ? 'الإيراد' : 'Revenue',
                render: (row: any) => formatCurrency(toFiniteNumber(row.revenue)),
              },
              {
                key: 'count',
                label: lang === 'ar' ? 'عدد العمليات' : 'Transactions',
              },
            ]}
            data={Array.isArray(data?.rows) ? data.rows : []}
            emptyMessage={
              lang === 'ar' ? 'لا توجد معاملات مالية كافية.' : 'Not enough payment records yet.'
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
