'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDate, formatCurrency } from '@/lib/format';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner'; // Keeping existing LoadingSpinner for now

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronLeftIcon, Pencil1Icon, PlusIcon, DotsHorizontalIcon } from '@radix-ui/react-icons'; // Icons for actions
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge'; // Assuming a badge component for status

type Member = {
  id: string;
  name: string;
  phone: string;
  gender: 'male' | 'female';
  photo_path?: string;
  access_tier: string;
  card_code?: string;
  address?: string;
  created_at: number;
  updated_at: number;
};

type Subscription = {
  id: string;
  plan_name?: string;
  start_date: number;
  end_date: number;
  price: number;
  status: 'active' | 'expired' | 'pending'; // Added 'pending' for completeness
};

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const labels = t[lang];
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  const [member, setMember] = useState<Member | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Fetch all members and find the one matching the URL id
        // In a real app, this would be a direct API call to /api/members/[id]
        const membersRes = await api.get<Member[]>('/api/members');
        const found = (membersRes.data ?? []).find((m) => m.id === id);
        if (found) {
          setMember(found);
          // Fetch this member's subscriptions
          const subsRes = await api.get<Subscription[]>(`/api/subscriptions?member_id=${id}`);
          setSubs(subsRes.data ?? []);
        } else {
            // Member not found scenario
            setMember(null);
        }
      } catch {
        // leave member null — UI will show not-found message
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

  // Helper to render a label + value row inside the info card
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
            <Pencil1Icon className={lang === 'ar' ? 'ml-2 h-4 w-4' : 'mr-2 h-4 w-4'} />
            {labels.edit}
          </Button>
          <Button onClick={() => router.push(`/dashboard/subscriptions/new?member_id=${id}`)}>
            <PlusIcon className={lang === 'ar' ? 'ml-2 h-4 w-4' : 'mr-2 h-4 w-4'} />
            {labels.add_subscription}
          </Button>
          {/* Future: More actions via DropdownMenu */}
          <DropdownMenu dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{labels.open_menu}</span>
                <DotsHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={lang === 'ar' ? 'start' : 'end'}>
              <DropdownMenuLabel>{labels.member_actions}</DropdownMenuLabel>
              <DropdownMenuItem>{labels.view_attendance}</DropdownMenuItem>
              <DropdownMenuItem>{labels.send_whatsapp}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">{labels.delete_member}</DropdownMenuItem>
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
          {member.photo_path && (
            <div className="mb-4 flex justify-center">
              <img
                src={member.photo_path}
                alt={member.name}
                className="h-24 w-24 object-cover border-2 border-[#2a2a2a]"
              />
            </div>
          )}
          <InfoRow label={labels.name} value={member.name} />
          <InfoRow label={labels.phone} value={member.phone} />
          <InfoRow
            label={labels.gender}
            value={member.gender === 'male' ? labels.male : labels.female}
          />
          <InfoRow label={labels.access_tier} value={member.access_tier} />
          <InfoRow label={labels.card_code} value={member.card_code ?? ''} />
          <InfoRow label={labels.address} value={member.address ?? ''} />
          <InfoRow
            label={labels.created_at}
            value={formatDate(member.created_at, locale)}
          />
          <InfoRow
            label={labels.updated_at}
            value={formatDate(member.updated_at, locale)}
          />
        </CardContent>
      </Card>

      {/* Subscriptions section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">{labels.subscriptions}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/subscriptions/new?member_id=${id}`)}>
            <PlusIcon className={lang === 'ar' ? 'ml-2 h-4 w-4' : 'mr-2 h-4 w-4'} />
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
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(sub.price)}</p>
                      <Badge
                        className={
                          sub.status === 'active'
                            ? 'bg-success hover:bg-success/90'
                            : sub.status === 'expired'
                            ? 'bg-destructive hover:bg-destructive/90'
                            : 'bg-info hover:bg-info/90' // pending
                        }
                      >
                        {sub.status === 'active' ? labels.active : sub.status === 'expired' ? labels.expired : labels.pending}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
