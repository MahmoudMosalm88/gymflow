'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import StatCard from '@/components/dashboard/StatCard';
import DataTable from '@/components/dashboard/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import AtRiskDonut from '@/components/dashboard/reports/charts/AtRiskDonut';

// ── Label maps ──────────────────────────────────────────────────────────────
const RISK_LEVEL_LABELS: Record<string, { en: string; ar: string }> = {
  high:   { en: 'High Risk',    ar: 'خطر مرتفع' },
  medium: { en: 'Medium Risk',  ar: 'خطر متوسط' },
  low:    { en: 'Low Risk',     ar: 'خطر منخفض' },
};
const RISK_REASON_LABELS: Record<string, { en: string; ar: string }> = {
  no_recent_visits:  { en: 'No recent visits',    ar: 'لا زيارات مؤخراً' },
  attendance_drop:   { en: 'Attendance dropped',  ar: 'تراجع الحضور' },
  low_visits:        { en: 'Low visit frequency', ar: 'تردد منخفض' },
  expiring_soon:     { en: 'Expiring soon',        ar: 'قريب الانتهاء' },
};

// ── Sub-filter type ──────────────────────────────────────────────────────────
type SubFilter = 'at-risk' | 'ghost' | 'decline' | 'frequency';

// ── Props ────────────────────────────────────────────────────────────────────
interface AtRiskMembersTabProps {
  data: any;       // at-risk data — already fetched by page.tsx
  lang: string;
  labels: any;
  days: number;    // current period filter value
}

export default function AtRiskMembersTab({ data, lang, labels, days }: AtRiskMembersTabProps) {
  const [subFilter, setSubFilter] = useState<SubFilter>('at-risk');

  // ── Lazy-fetch state for each sub-filter ─────────────────────────────────
  const [ghostData, setGhostData]           = useState<any>(null);
  const [ghostLoading, setGhostLoading]     = useState(false);

  const [declineData, setDeclineData]       = useState<any>(null);
  const [declineLoading, setDeclineLoading] = useState(false);

  const [freqData, setFreqData]             = useState<any>(null);
  const [freqLoading, setFreqLoading]       = useState(false);

  // Ghost Members — lazy fetch on first selection, refetch when days changes
  useEffect(() => {
    if (subFilter !== 'ghost') return;
    setGhostLoading(true);
    api.get<any>(`/api/reports/ghost-members?days=${days}`).then(r => {
      if (r.success) setGhostData(r.data);
      setGhostLoading(false);
    });
  }, [subFilter, days]);

  // Attendance Decline — lazy fetch
  useEffect(() => {
    if (subFilter !== 'decline') return;
    setDeclineLoading(true);
    api.get<any>(`/api/reports/attendance-decline?days=${Math.max(days, 14)}`).then(r => {
      if (r.success) setDeclineData(r.data);
      setDeclineLoading(false);
    });
  }, [subFilter, days]);

  // Visit Frequency Risk — lazy fetch
  useEffect(() => {
    if (subFilter !== 'frequency') return;
    setFreqLoading(true);
    api.get<any>(`/api/reports/visit-frequency-risk?days=${days}`).then(r => {
      if (r.success) setFreqData(r.data);
      setFreqLoading(false);
    });
  }, [subFilter, days]);

  const formatPercent = (v: number) => `${v.toFixed(1)}%`;

  // ── Sub-filter button helper ─────────────────────────────────────────────
  function SubBtn({ value, labelEn, labelAr }: { value: SubFilter; labelEn: string; labelAr: string }) {
    return (
      <button
        onClick={() => setSubFilter(value)}
        className={cn(
          'px-3 py-1.5 text-sm font-semibold border-2 transition-colors',
          subFilter === value
            ? 'border-destructive bg-destructive text-white'
            : 'border-border bg-card text-muted-foreground hover:border-destructive/60 hover:text-foreground'
        )}
      >
        {lang === 'ar' ? labelAr : labelEn}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Sub-filter bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <SubBtn value="at-risk"   labelEn="At-Risk"            labelAr="معرّضون للخطر" />
        <SubBtn value="ghost"     labelEn="Ghost Members"       labelAr="الأعضاء الغائبون" />
        <SubBtn value="decline"   labelEn="Attendance Decline"  labelAr="تراجع الحضور" />
        <SubBtn value="frequency" labelEn="Visit Frequency"     labelAr="تكرار الزيارات" />
      </div>

      {/* ── AT-RISK view (default) ── */}
      {subFilter === 'at-risk' && (
        <>
          {data?.summary && Array.isArray(data.rows) ? (
            <>
              {/* Stats + donut on same row for larger screens */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Stat cards — stacked, span 2 cols */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                  <StatCard
                    animate
                    label={lang === 'ar' ? 'أعضاء قد يلغون' : 'Likely to Cancel'}
                    value={data.summary.memberCount ?? 0}
                    color="text-destructive"
                    valueSize="text-2xl"
                  />
                  <StatCard
                    animate
                    label={lang === 'ar' ? 'خطر مرتفع' : 'High Risk'}
                    value={data.summary.highRiskCount ?? 0}
                    color="text-warning"
                    valueSize="text-2xl"
                  />
                </div>

                {/* Donut chart */}
                <div className="border-2 border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    {lang === 'ar' ? 'توزيع المخاطر' : 'Risk Distribution'}
                  </p>
                  <AtRiskDonut
                    high={data.summary.highRiskCount ?? 0}
                    medium={data.summary.mediumRiskCount ?? 0}
                    low={(data.summary.memberCount ?? 0) - (data.summary.highRiskCount ?? 0) - (data.summary.mediumRiskCount ?? 0)}
                    lang={lang}
                  />
                </div>
              </div>

              {/* Members table */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {lang === 'ar' ? 'الأعضاء الأكثر عرضة للتسرب' : 'Members Most Likely To Churn'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'name',           label: labels.name },
                      { key: 'phone',          label: labels.phone },
                      { key: 'lastVisit',      label: lang === 'ar' ? 'آخر زيارة'    : 'Last Visit',      render: (row: any) => row.lastVisit ? formatDate(row.lastVisit, lang === 'ar' ? 'ar-EG' : 'en-US') : '—' },
                      { key: 'recentVisits',   label: lang === 'ar' ? 'زيارات حديثة' : 'Recent Visits' },
                      { key: 'previousVisits', label: lang === 'ar' ? 'قبلها'         : 'Previous Visits' },
                      { key: 'riskLevel',      label: lang === 'ar' ? 'الخطورة'       : 'Risk', render: (row: any) => {
                        const lbl = RISK_LEVEL_LABELS[row.riskLevel]?.[lang as 'en' | 'ar'] ?? row.riskLevel;
                        return (
                          <span className={row.riskLevel === 'high' ? 'text-destructive font-bold' : row.riskLevel === 'medium' ? 'text-warning font-bold' : 'text-muted-foreground'}>
                            {lbl}
                          </span>
                        );
                      }},
                      { key: 'riskReason', label: lang === 'ar' ? 'السبب' : 'Reason', render: (row: any) => RISK_REASON_LABELS[row.riskReason]?.[lang as 'en' | 'ar'] ?? row.riskReason },
                    ]}
                    data={data.rows}
                    emptyMessage={lang === 'ar' ? 'لا أعضاء في خطر حالياً.' : 'No at-risk members right now.'}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {lang === 'ar' ? 'لا توجد بيانات كافية بعد.' : 'Not enough data yet.'}
            </p>
          )}
        </>
      )}

      {/* ── GHOST MEMBERS view ── */}
      {subFilter === 'ghost' && (
        <>
          {ghostLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : ghostData ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  animate
                  label={lang === 'ar' ? 'يدفعون لكن لا يحضرون' : 'Paying but Not Showing Up'}
                  value={ghostData.summary?.ghostMembers ?? ghostData.rows?.length ?? 0}
                  color="text-destructive"
                  valueSize="text-2xl"
                />
                <StatCard
                  animate
                  label={lang === 'ar' ? 'أطول غياب' : 'Longest Gap'}
                  value={`${ghostData.summary?.longestAbsenceDays ?? 0} ${labels.days}`}
                  color="text-warning"
                  valueSize="text-2xl"
                />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {lang === 'ar' ? 'الأعضاء النشطون الذين توقفوا عن الحضور' : 'Active Members Who Stopped Showing Up'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'name',               label: labels.name },
                      { key: 'phone',              label: labels.phone },
                      { key: 'lastVisit',          label: lang === 'ar' ? 'آخر زيارة'         : 'Last Visit',           render: (row: any) => row.lastVisit ? formatDate(row.lastVisit, lang === 'ar' ? 'ar-EG' : 'en-US') : '—' },
                      { key: 'daysSinceLastVisit', label: lang === 'ar' ? 'أيام منذ آخر حضور' : 'Days Since Last Visit', render: (row: any) => row.daysSinceLastVisit ?? '—' },
                      { key: 'recentVisits',       label: lang === 'ar' ? 'زيارات حديثة'       : 'Recent Visits' },
                    ]}
                    data={ghostData.rows ?? []}
                    emptyMessage={lang === 'ar' ? 'لا يوجد أعضاء غائبون ضمن هذه الفترة.' : 'No ghost members in this window.'}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {lang === 'ar' ? 'لا توجد بيانات كافية بعد.' : 'Not enough data yet.'}
            </p>
          )}
        </>
      )}

      {/* ── ATTENDANCE DECLINE view ── */}
      {subFilter === 'decline' && (
        <>
          {declineLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : declineData ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  animate
                  label={lang === 'ar' ? 'حضورهم يتراجع' : 'Attendance Dropping'}
                  value={declineData.summary?.memberCount ?? declineData.rows?.length ?? 0}
                  color="text-warning"
                  valueSize="text-2xl"
                />
                <StatCard
                  animate
                  label={lang === 'ar' ? 'تراجع حاد' : 'Sharp Drops'}
                  value={declineData.summary?.highSeverityCount ?? (declineData.rows ?? []).filter((r: any) => r.severity === 'high').length}
                  color="text-destructive"
                  valueSize="text-2xl"
                />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {lang === 'ar' ? 'الأعضاء الذين انخفض حضورهم' : 'Members With Declining Attendance'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable
                    columns={[
                      { key: 'name',           label: labels.name },
                      { key: 'phone',          label: labels.phone },
                      { key: 'previousVisits', label: lang === 'ar' ? 'الفترة السابقة' : 'Previous Visits' },
                      { key: 'recentVisits',   label: lang === 'ar' ? 'الفترة الحالية' : 'Recent Visits' },
                      { key: 'declinePercent', label: lang === 'ar' ? 'نسبة التراجع'   : 'Decline', render: (row: any) => formatPercent(row.declinePercent ?? 0) },
                      { key: 'severity',       label: lang === 'ar' ? 'الحدة'           : 'Severity' },
                    ]}
                    data={declineData.rows ?? []}
                    emptyMessage={lang === 'ar' ? 'لا توجد حالات تراجع واضحة حالياً.' : 'No attendance drops are flagged right now.'}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {lang === 'ar' ? 'لا توجد بيانات كافية بعد.' : 'Not enough data yet.'}
            </p>
          )}
        </>
      )}

      {/* ── VISIT FREQUENCY view ── */}
      {subFilter === 'frequency' && (
        <>
          {freqLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : freqData?.segments ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard
                  animate
                  label={lang === 'ar' ? 'إجمالي النشطين' : 'Total Active'}
                  value={freqData.summary.totalActive}
                  color="text-foreground"
                  valueSize="text-2xl"
                />
                <StatCard
                  animate
                  label={lang === 'ar' ? 'يزورون أقل من مرتين أسبوعياً' : 'Visit Less Than 2×/Week'}
                  value={freqData.summary.atRiskCount}
                  color="text-destructive"
                  valueSize="text-2xl"
                />
                <StatCard
                  animate
                  label={lang === 'ar' ? 'لم يحضروا منذ ٤ أسابيع' : 'No Visits in 4 Weeks'}
                  value={freqData.summary.criticalCount}
                  color="text-warning"
                  valueSize="text-2xl"
                />
                <StatCard
                  animate
                  label={lang === 'ar' ? 'يحضرون ٣ مرات أو أكثر' : 'Visit 3+ Times/Week'}
                  value={freqData.summary.safeCount}
                  color="text-success"
                  valueSize="text-2xl"
                />
              </div>

              <div className="space-y-4">
                {freqData.segments.map((seg: any) => (
                  <Card
                    key={seg.key}
                    className={cn(
                      seg.churnRisk === 'critical' && 'border-destructive/60',
                      seg.churnRisk === 'high'     && 'border-warning/60',
                      seg.churnRisk === 'medium'   && 'border-yellow-600/40',
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{seg.label}</CardTitle>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'text-sm font-bold',
                            seg.churnRisk === 'critical' && 'text-destructive',
                            seg.churnRisk === 'high'     && 'text-warning',
                            seg.churnRisk === 'medium'   && 'text-yellow-400',
                            seg.churnRisk === 'low'      && 'text-success',
                          )}>
                            {lang === 'ar' ? `خطر التسرب: ${seg.churnRiskPercent}%` : `${seg.churnRiskPercent}% churn risk`}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {seg.memberCount} {lang === 'ar' ? 'عضو' : 'members'}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    {seg.members.length > 0 && (
                      <CardContent>
                        <DataTable
                          columns={[
                            { key: 'name',           label: lang === 'ar' ? 'الاسم'                   : 'Name' },
                            { key: 'phone',          label: lang === 'ar' ? 'الهاتف'                  : 'Phone' },
                            { key: 'avgPerWeek',     label: lang === 'ar' ? 'متوسط الزيارات/أسبوع'   : 'Avg visits/week' },
                            { key: 'visitsInWindow', label: lang === 'ar' ? 'زيارات (٤ أسابيع)'      : 'Visits (4 wks)' },
                            { key: 'endDate',        label: lang === 'ar' ? 'ينتهي'                   : 'Expires', render: (row: any) => formatDate(row.endDate, lang === 'ar' ? 'ar-EG' : 'en-US') },
                          ]}
                          data={seg.members}
                          emptyMessage={lang === 'ar' ? 'لا أعضاء في هذه الفئة.' : 'No members in this segment.'}
                        />
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                {lang === 'ar'
                  ? 'المصدر: بيانات IHRSA 2024 — الأعضاء الذين يترددون مرة واحدة أسبوعياً لديهم احتمال إلغاء 50٪، مرتين 25٪، 3 مرات وأكثر أقل من 5٪.'
                  : 'Source: IHRSA 2024 data — members visiting 1×/week have 50% cancel rate, 2×/week 25%, 3×+/week under 5%.'}
              </p>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {lang === 'ar' ? 'لا توجد بيانات بعد.' : 'No data yet.'}
            </p>
          )}
        </>
      )}
    </div>
  );
}
