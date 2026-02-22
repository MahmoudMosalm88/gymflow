'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/format';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeftIcon, Pencil1Icon, PlusIcon, DotsHorizontalIcon } from '@radix-ui/react-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import MemberAvatar from '@/components/dashboard/MemberAvatar';
import FreezeDialog from '@/components/dashboard/FreezeDialog';

type Member = {
  id: string;
  name: string;
  phone: string;
  gender?: 'male' | 'female';
  photo_path?: string;
  access_tier: string;
  card_code?: string;
  address?: string;
  created_at: number;
  updated_at: number;
};

type SubscriptionRaw = {
  id: number;
  plan_name?: string;
  start_date: number;
  end_date: number;
  price_paid: number | null;
  is_active: boolean;
  plan_months: number;
  sessions_per_month: number | null;
};

type Subscription = SubscriptionRaw & {
  status: 'active' | 'expired' | 'pending';
};

function deriveStatus(sub: SubscriptionRaw): 'active' | 'expired' | 'pending' {
  const now = Math.floor(Date.now() / 1000);
  if (!sub.is_active) return 'expired';
  if (sub.end_date < now) return 'expired';
  if (sub.start_date > now) return 'pending';
  return 'active';
}

type AttendanceLog = {
  id: number;
  timestamp: number;
  method: string;
};

function getMethodLabels(labels: Record<string, string>): Record<string, string> {
  return {
    qr_code: labels.method_qr_code,
    card_scan: labels.method_card_scan,
    manual: labels.method_manual,
    admin_override: labels.method_admin,
    scan: labels.method_scan,
  };
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const labels = t[lang];
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  const [member, setMember] = useState<Member | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [freezeSubId, setFreezeSubId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const membersRes = await api.get<Member[]>('/api/members');
        const found = (membersRes.data ?? []).find((m) => m.id === id);
        if (found) {
          setMember(found);
          const [subsRes, attRes] = await Promise.all([
            api.get<SubscriptionRaw[]>(`/api/subscriptions?member_id=${id}`),
            api.get<AttendanceLog[]>(`/api/attendance/logs?member_id=${id}&limit=20`),
          ]);
          setSubs((subsRes.data ?? []).map((s) => ({ ...s, status: deriveStatus(s) })));
          setAttendance(attRes.data ?? []);
        } else {
          setMember(null);
        }
      } catch {
        setMember(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <LoadingSpinner size="lg" />;

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <h2 className="text-xl font-semibold">{labels.member_not_found}</h2>
        <Button variant="link" onClick={() => router.push('/dashboard/members')}>
          &larr; {labels.back_to_members}
        </Button>
      </div>
    );
  }

  const InfoRow = ({ label, value }: { label: string; value: string | JSX.Element }) => (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-normal text-foreground">{value || '—'}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header with name and action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/members')}>
            <ChevronLeftIcon className="h-5 w-5" />
            <span className="sr-only">{labels.back}</span>
          </Button>
          <h1 className="text-3xl font-bold">{member.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push(`/dashboard/members/${id}/edit`)} variant="outline">
            <Pencil1Icon className="me-2 h-4 w-4" />
            {labels.edit}
          </Button>
          <Button onClick={() => router.push(`/dashboard/subscriptions?member_id=${id}&new=1`)}>
            <PlusIcon className="me-2 h-4 w-4" />
            {labels.add_subscription}
          </Button>
          {subs.some((s) => s.status === 'active') && (
            <Button
              variant="outline"
              className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
              onClick={() => {
                const activeSub = subs.find((s) => s.status === 'active');
                if (activeSub) setFreezeSubId(String(activeSub.id));
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="me-2">
                <path d="M8 2v12M4 6v4M12 6v4" />
              </svg>
              {labels.freeze_subscription}
            </Button>

          )}
          <DropdownMenu dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{labels.open_menu}</span>
                <DotsHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={lang === 'ar' ? 'start' : 'end'}>
              <DropdownMenuLabel>{labels.member_actions}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                {labels.send_whatsapp}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => router.push('/dashboard/members')}
              >
                {labels.delete_member}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Member info card */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.member_information}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-center">
            <MemberAvatar
              memberId={member.id}
              name={member.name}
              photoPath={member.photo_path}
              onPhotoChange={(url) => setMember({ ...member, photo_path: url })}
            />
          </div>
          <InfoRow label={labels.name} value={member.name} />
          <InfoRow label={labels.phone} value={member.phone} />
          <InfoRow label={labels.access_tier} value={member.access_tier} />
          <InfoRow label={labels.card_code} value={member.card_code ?? ''} />
          <InfoRow label={labels.address} value={member.address ?? ''} />
          <InfoRow label={labels.created_at} value={formatDate(member.created_at, locale)} />
          <InfoRow label={labels.updated_at} value={formatDate(member.updated_at, locale)} />
        </CardContent>
      </Card>

      {/* Subscriptions section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">{labels.subscriptions}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/subscriptions?member_id=${id}&new=1`)}>
            <PlusIcon className="me-2 h-4 w-4" />
            {labels.add_new}
          </Button>
        </CardHeader>
        <CardContent>
          {subs.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">{labels.no_subscriptions_found}</p>
          ) : (
            <div className="space-y-3">
              {subs.map((sub) => (
                <Card key={sub.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {sub.plan_name || labels.subscription}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(sub.start_date, locale)} — {formatDate(sub.end_date, locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {sub.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setFreezeSubId(String(sub.id))}
                        >
                          {labels.freeze_subscription}
                        </Button>
                      )}
                      <div className="text-end">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(sub.price_paid ?? 0)}</p>
                        <Badge
                          className={
                            sub.status === 'active'
                              ? 'bg-success hover:bg-success/90'
                              : sub.status === 'expired'
                              ? 'bg-destructive hover:bg-destructive/90'
                              : 'bg-info hover:bg-info/90'
                          }
                        >
                          {sub.status === 'active' ? labels.active : sub.status === 'expired' ? labels.expired : labels.pending}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Freeze dialog */}
      <FreezeDialog
        subscriptionId={freezeSubId || ''}
        open={!!freezeSubId}
        onOpenChange={(open) => { if (!open) setFreezeSubId(null); }}
        onFrozen={() => {
          // Reload subscriptions to reflect extended end date
          api.get<SubscriptionRaw[]>(`/api/subscriptions?member_id=${id}`)
            .then((res) => { if (res.data) setSubs(res.data.map((s) => ({ ...s, status: deriveStatus(s) }))); });
        }}
      />

      {/* Attendance section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{labels.attendance_history}</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">{labels.no_attendance_records}</p>
          ) : (
            <div className="divide-y divide-border">
              {attendance.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between py-3">
                  <span className="text-sm">{formatDateTime(rec.timestamp, locale)}</span>
                  <span className="text-xs text-muted-foreground">{getMethodLabels(labels)[rec.method] ?? rec.method.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
