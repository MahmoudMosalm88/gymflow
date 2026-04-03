'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import { useLang } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type GuestInviteSummary = {
  member: {
    id: string;
    name: string;
    phone: string | null;
    card_code: string | null;
  };
  allowance: number;
  used: number;
  remaining: number;
  hasActiveCycle: boolean;
  currentCycle: {
    id: number;
    startDate: number;
    endDate: number;
    planMonths: number;
    sessionsPerMonth: number | null;
  } | null;
  recentGuests: Array<{
    id: string;
    code: string;
    guest_name: string;
    phone: string | null;
    created_at: string;
    expires_at: string;
    used_at: string | null;
    voided_at: string | null;
    converted_at: string | null;
    converted_member_id: string | null;
    converted_member_name: string | null;
  }>;
};

function getGuestStatus(row: GuestInviteSummary['recentGuests'][number], lang: 'ar' | 'en') {
  if (row.voided_at) {
    return {
      label: lang === 'ar' ? 'ملغاة' : 'Voided',
      className: 'bg-muted text-muted-foreground border border-border',
    };
  }
  if (row.converted_at) {
    return {
      label: lang === 'ar' ? 'تم التحويل' : 'Converted',
      className: 'bg-info/10 text-info border border-info/30',
    };
  }
  if (row.used_at) {
    return {
      label: lang === 'ar' ? 'تم الاستخدام' : 'Used',
      className: 'bg-success/10 text-success border border-success/30',
    };
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return {
      label: lang === 'ar' ? 'منتهية' : 'Expired',
      className: 'bg-warning/10 text-warning border border-warning/30',
    };
  }
  return {
    label: lang === 'ar' ? 'مفتوحة' : 'Open',
    className: 'bg-success/10 text-success border border-success/30',
  };
}

export default function MemberGuestInvitesCard({ memberId }: { memberId: string }) {
  const router = useRouter();
  const { lang } = useLang();
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  const [summary, setSummary] = useState<GuestInviteSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await api.get<GuestInviteSummary>(`/api/members/${memberId}/guest-invites`);
        if (!cancelled && res.success && res.data) {
          setSummary(res.data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">{lang === 'ar' ? 'دعوات الضيوف' : 'Guest Invites'}</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/dashboard/guest-passes?inviter_member_id=${memberId}`)}
        >
          {lang === 'ar' ? 'إضافة دعوة' : 'Create Invite'}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">{lang === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}</p>
        ) : !summary ? (
          <p className="text-sm text-muted-foreground">{lang === 'ar' ? 'تعذر تحميل ملخص الدعوات.' : 'Could not load invite summary.'}</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'المتاح لكل دورة' : 'Per-cycle allowance'}</p>
                <p className="mt-1 text-2xl font-semibold">{summary.allowance}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'المستخدم' : 'Used'}</p>
                <p className="mt-1 text-2xl font-semibold">{summary.used}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'المتبقي' : 'Remaining'}</p>
                <p className="mt-1 text-2xl font-semibold">{summary.remaining}</p>
              </div>
            </div>

            {summary.currentCycle ? (
              <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                {lang === 'ar'
                  ? `تنتهي الدورة الحالية في ${formatDate(summary.currentCycle.endDate, locale)}.`
                  : `Current cycle ends on ${formatDate(summary.currentCycle.endDate, locale)}.`}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                {lang === 'ar'
                  ? 'لا توجد دورة اشتراك نشطة حالياً، لذلك لا يمكن إصدار دعوات مرتبطة بهذا العميل.'
                  : 'This member does not have an active subscription cycle right now, so invite tracking is disabled.'}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{lang === 'ar' ? 'أحدث الضيوف المرتبطين' : 'Recent invited guests'}</p>
              </div>
              {summary.recentGuests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {lang === 'ar' ? 'لا توجد دعوات مرتبطة بهذه الدورة حتى الآن.' : 'No guest invites have been used on this cycle yet.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {summary.recentGuests.map((row) => {
                    const status = getGuestStatus(row, lang);
                    return (
                      <div key={row.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="text-sm font-medium">{row.guest_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(row.created_at).toLocaleDateString(locale, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                            {row.converted_member_name ? ` · ${row.converted_member_name}` : ''}
                          </p>
                        </div>
                        <Badge className={status.className}>{status.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
