'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import { useLang } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const copy = {
  en: {
    title: 'Guest Invites',
    create: 'Create Invite',
    loading: 'Loading...',
    load_error: 'Could not load invite summary.',
    allowance: 'Allowance',
    used: 'Used',
    remaining: 'Left',
    cycle_ends: 'Cycle ends',
    no_cycle: 'No active subscription — invite tracking disabled.',
    recent: 'Recent Guests',
    no_guests: 'No guest invites this cycle.',
    voided: 'Voided',
    converted: 'Converted',
    used_status: 'Used',
    expired: 'Expired',
    open: 'Open',
  },
  ar: {
    title: 'دعوات الضيوف',
    create: 'إضافة دعوة',
    loading: 'جارٍ التحميل...',
    load_error: 'تعذر تحميل ملخص الدعوات.',
    allowance: 'المتاح',
    used: 'مستخدم',
    remaining: 'متبقي',
    cycle_ends: 'تنتهي الدورة',
    no_cycle: 'لا يوجد اشتراك نشط — تتبع الدعوات معطّل.',
    recent: 'آخر الضيوف',
    no_guests: 'لا توجد دعوات هذه الدورة.',
    voided: 'ملغاة',
    converted: 'تم التحويل',
    used_status: 'تم الاستخدام',
    expired: 'منتهية',
    open: 'مفتوحة',
  },
} as const;

type GuestInviteSummary = {
  member: { id: string; name: string; phone: string | null; card_code: string | null };
  allowance: number;
  used: number;
  remaining: number;
  hasActiveCycle: boolean;
  currentCycle: { id: number; startDate: number; endDate: number; planMonths: number; sessionsPerMonth: number | null } | null;
  recentGuests: Array<{
    id: string; code: string; guest_name: string; phone: string | null;
    created_at: string; expires_at: string; used_at: string | null;
    voided_at: string | null; converted_at: string | null;
    converted_member_id: string | null; converted_member_name: string | null;
  }>;
};

function getGuestStatus(row: GuestInviteSummary['recentGuests'][number], c: typeof copy[keyof typeof copy]) {
  if (row.voided_at) return { label: c.voided, cls: 'bg-muted text-muted-foreground border-border' };
  if (row.converted_at) return { label: c.converted, cls: 'bg-info/10 text-info border-info/30' };
  if (row.used_at) return { label: c.used_status, cls: 'bg-success/10 text-success border-success/30' };
  if (new Date(row.expires_at).getTime() <= Date.now()) return { label: c.expired, cls: 'bg-warning/10 text-warning border-warning/30' };
  return { label: c.open, cls: 'bg-success/10 text-success border-success/30' };
}

export default function MemberGuestInvitesCard({ memberId }: { memberId: string }) {
  const router = useRouter();
  const { lang } = useLang();
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  const c = copy[lang];
  const [summary, setSummary] = useState<GuestInviteSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get<GuestInviteSummary>(`/api/members/${memberId}/guest-invites`)
      .then((res) => { if (!cancelled && res.success && res.data) setSummary(res.data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [memberId]);

  return (
    <Card className="shadow-[6px_6px_0_#000000]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">{c.title}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/guest-passes?inviter_member_id=${memberId}`)}>
          {c.create}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">{c.loading}</p>
        ) : !summary ? (
          <p className="text-sm text-muted-foreground">{c.load_error}</p>
        ) : (
          <div className="space-y-3">
            {/* Inline stats — one line, not 3 cards */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">{c.allowance}: <span className="font-stat text-foreground">{summary.allowance}</span></span>
              <span className="text-muted-foreground">{c.used}: <span className="font-stat text-foreground">{summary.used}</span></span>
              <span className="text-muted-foreground">{c.remaining}: <span className={`font-stat ${summary.remaining > 0 ? 'text-success' : 'text-destructive'}`}>{summary.remaining}</span></span>
            </div>

            {/* Cycle info — one line */}
            {summary.currentCycle ? (
              <p className="text-xs text-muted-foreground">
                {c.cycle_ends} {formatDate(summary.currentCycle.endDate, locale)}
              </p>
            ) : (
              <p className="text-xs text-warning">{c.no_cycle}</p>
            )}

            {/* Guest list — compact rows, not cards */}
            {summary.recentGuests.length > 0 && (
              <div className="border-t border-border pt-2 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{c.recent}</p>
                {summary.recentGuests.map((row) => {
                  const status = getGuestStatus(row, c);
                  return (
                    <div key={row.id} className="flex items-center justify-between py-1.5">
                      <div className="min-w-0">
                        <span className="text-sm text-foreground">{row.guest_name}</span>
                        <span className="text-xs text-muted-foreground ms-2">
                          {new Date(row.created_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                        </span>
                        {row.converted_member_name && (
                          <span className="text-xs text-info ms-1">→ {row.converted_member_name}</span>
                        )}
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${status.cls}`}>{status.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
            {summary.recentGuests.length === 0 && (
              <p className="text-xs text-muted-foreground">{c.no_guests}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
