'use client';

import { api } from '@/lib/api-client';
import StatCard from '@/components/dashboard/StatCard';
import DataTable from '@/components/dashboard/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { toFiniteNumber } from '@/lib/coerce';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

interface Props {
  data: any;
  lang: string;
  labels: any;
}

export default function ReferralFunnelTab({ data, lang, labels }: Props) {
  const referralRows = Array.isArray(data?.rows) ? data.rows : [];
  const referralSummary = data?.summary ?? null;

  return (
    <>
      {/* ── 4 stat cards ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          animate
          label={lang === 'ar' ? 'دعوات مرسلة' : 'Invites Sent'}
          value={referralSummary?.invitesSent ?? 0}
          color="text-foreground"
          valueSize="text-2xl"
        />
        <StatCard
          animate
          label={lang === 'ar' ? 'دعوات مستخدمة' : 'Invites Used'}
          value={referralSummary?.invitesUsed ?? 0}
          color="text-warning"
          valueSize="text-2xl"
        />
        <StatCard
          animate
          label={lang === 'ar' ? 'تحويلات' : 'Conversions'}
          value={referralSummary?.convertedMembers ?? 0}
          color="text-success"
          valueSize="text-2xl"
        />
        <StatCard
          animate
          label={lang === 'ar' ? 'إيراد الإحالات' : 'Referral Revenue'}
          value={formatCurrencyCompact(referralSummary?.referralRevenue ?? 0)}
          color="text-primary"
          valueSize="text-2xl"
        />
      </div>

      {/* ── Funnel table ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'ar'
              ? 'مسار الإحالة من الدعوة إلى العضوية'
              : 'Invite to Member Conversion Funnel'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'inviterName',      label: lang === 'ar' ? 'العضو الداعي' : 'Inviter' },
              { key: 'invitesSent',      label: lang === 'ar' ? 'الدعوات'      : 'Invites' },
              { key: 'invitesUsed',      label: lang === 'ar' ? 'المستخدمة'    : 'Used' },
              { key: 'convertedMembers', label: lang === 'ar' ? 'التحويلات'    : 'Converted' },
              {
                key: 'conversionRate',
                label: lang === 'ar' ? 'التحويل' : 'Conversion',
                render: (row: any) => `${(row.conversionRate ?? 0).toFixed(1)}%`,
              },
              {
                key: 'referralRevenue',
                label: lang === 'ar' ? 'الإيراد' : 'Revenue',
                render: (row: any) => formatCurrency(toFiniteNumber(row.referralRevenue)),
              },
            ]}
            data={referralRows}
            emptyMessage={lang === 'ar' ? 'لا توجد دعوات مرتبطة حالياً.' : 'No linked invites yet.'}
          />
        </CardContent>
      </Card>
    </>
  );
}
