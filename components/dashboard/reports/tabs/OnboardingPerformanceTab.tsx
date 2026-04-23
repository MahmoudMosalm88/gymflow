'use client';

import StatCard from '@/components/dashboard/StatCard';
import DataTable from '@/components/dashboard/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OnboardingPerformanceTabProps {
  data: any;
  lang: string;
  labels: any;
}

export default function OnboardingPerformanceTab({ data, lang, labels }: OnboardingPerformanceTabProps) {
  const summary = data?.summary;
  const rows = Array.isArray(data?.rows) ? data.rows : [];

  if (!summary) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {lang === 'ar' ? 'لا توجد بيانات بعد.' : 'No data yet.'}
      </p>
    );
  }

  // Map stage keys to human-readable labels in both languages
  const stageLabel = (stage: string) => {
    if (stage === 'welcome')                 return lang === 'ar' ? 'ترحيب'                  : 'Welcome';
    if (stage === 'first_visit')             return lang === 'ar' ? 'أول زيارة'              : 'First Visit';
    if (stage === 'first_visit_recognition') return lang === 'ar' ? 'رسالة أول زيارة'        : 'First Visit Recognition';
    if (stage === 'completed_3_visits_14d')  return lang === 'ar' ? '٣ زيارات خلال ١٤ يوم'  : '3 Visits In 14 Days';
    if (stage === 'no_return_alert')         return lang === 'ar' ? 'تنبيه عدم العودة'       : 'No-Return Alert';
    return lang === 'ar' ? 'انخفاض التفاعل ١٤ يوم' : 'Low Engagement Day 14';
  };

  return (
    <>
      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          animate
          label={lang === 'ar' ? 'أعضاء جدد' : 'New Members'}
          value={summary.joinedMembers ?? 0}
          color="text-foreground"
          valueSize="text-2xl"
        />
        <StatCard
          animate
          label={lang === 'ar' ? 'أول زيارة' : 'First Visits'}
          value={summary.firstVisitMembers ?? 0}
          color="text-success"
          valueSize="text-2xl"
        />
        <StatCard
          animate
          label={lang === 'ar' ? '٣ زيارات خلال ١٤ يوم' : '3 Visits In 14 Days'}
          value={summary.completedThreeVisits14d ?? 0}
          color="text-primary"
          valueSize="text-2xl"
        />
        <StatCard
          animate
          label={lang === 'ar' ? 'تنبيه عدم العودة' : 'No-Return Alerts'}
          value={summary.noReturnAlerts ?? 0}
          color="text-warning"
          valueSize="text-2xl"
        />
      </div>

      {/* Stage breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {lang === 'ar' ? 'أداء تهيئة أول ٧٢ ساعة' : 'Early Onboarding Performance'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'stage',
                label: lang === 'ar' ? 'المرحلة' : 'Stage',
                render: (row: any) => stageLabel(row.stage),
              },
              { key: 'count', label: lang === 'ar' ? 'العدد' : 'Count' },
            ]}
            data={rows}
            emptyMessage={lang === 'ar' ? 'لا توجد بيانات تهيئة بعد.' : 'No onboarding data yet.'}
          />
        </CardContent>
      </Card>
    </>
  );
}
