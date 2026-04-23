'use client';

import StatCard from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencyCompact } from '@/lib/format';

interface WeeklyDigestTabProps {
  data: any;
  lang: string;
  labels: any;
}

export default function WeeklyDigestTab({ data, lang, labels }: WeeklyDigestTabProps) {
  const formatPercent = (v: number) => `${v.toFixed(1)}%`;

  // If no data, show empty state
  if (!data) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {lang === 'ar' ? 'لا توجد بيانات كافية بعد.' : 'Not enough data yet.'}
      </p>
    );
  }

  const summary = data.summary ?? {};

  return (
    <>
      {/* 4 headline stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          animate
          label={lang === 'ar' ? 'إيراد مهدد' : 'Revenue At Risk'}
          value={formatCurrencyCompact(summary.revenueAtRisk ?? 0)}
          color="text-destructive"
          valueSize="text-2xl"
        />
        <StatCard
          animate
          label={lang === 'ar' ? 'الاحتفاظ' : 'Retention'}
          value={formatPercent(summary.retentionRate ?? 0)}
          color="text-success"
          valueSize="text-2xl"
        />
        <StatCard
          animate
          label={lang === 'ar' ? 'محفوظ بواتساب' : 'WhatsApp Saved'}
          value={formatCurrencyCompact(summary.revenueSaved ?? 0)}
          color="text-primary"
          valueSize="text-2xl"
        />
        <StatCard
          animate
          label={lang === 'ar' ? 'أعضاء معرضون للخطر' : 'At-Risk Members'}
          value={summary.atRiskMembers ?? 0}
          color="text-warning"
          valueSize="text-2xl"
        />
      </div>

      {/* Digest preview card */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'ar' ? 'ملخص أسبوعي جاهز للإرسال' : 'Weekly Digest Preview'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {lang === 'ar'
              ? 'هذا هو الشكل المختصر الذي يمكن إرساله لمالك الصالة كل أسبوع.'
              : 'This is the short-form summary an owner can receive every week.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Two info blocks */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="border-2 border-border bg-secondary/20 p-4">
              <p className="text-xs text-muted-foreground">
                {lang === 'ar' ? 'أهم خطر' : 'Top risk'}
              </p>
              <p className="font-semibold">
                {(summary.atRiskMembers ?? 0) > 0
                  ? lang === 'ar'
                    ? `${summary.atRiskMembers} عضو معرّض للتسرب`
                    : `${summary.atRiskMembers} members at risk of churning`
                  : lang === 'ar'
                    ? 'لا توجد مخاطر مرتفعة هذا الأسبوع'
                    : 'No high-risk members this week'}
              </p>
            </div>
            <div className="border-2 border-border bg-secondary/20 p-4">
              <p className="text-xs text-muted-foreground">
                {lang === 'ar' ? 'تأثير واتساب' : 'WhatsApp effect'}
              </p>
              <p className="font-semibold">
                {(summary.revenueSaved ?? 0) > 0
                  ? lang === 'ar'
                    ? `تم حماية ${formatCurrencyCompact(summary.revenueSaved)} بتذكيرات واتساب`
                    : `${formatCurrencyCompact(summary.revenueSaved)} protected by WhatsApp reminders`
                  : lang === 'ar'
                    ? 'اربط واتساب لتتبع الأثر'
                    : 'Connect WhatsApp to track impact'}
              </p>
            </div>
          </div>

          {/* Free-form message from the digest payload */}
          {data.message && (
            <div className="border-2 border-border bg-card p-4">
              <p className="text-sm leading-7">{data.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
