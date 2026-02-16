'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDate, formatCurrency } from '@/lib/format';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

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
  status: string;
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
        const membersRes = await api.get<Member[]>('/api/members');
        const found = (membersRes.data ?? []).find((m) => m.id === id);
        if (found) {
          setMember(found);
          // Fetch this member's subscriptions
          const subsRes = await api.get<Subscription[]>(`/api/subscriptions?member_id=${id}`);
          setSubs(subsRes.data ?? []);
        }
      } catch {
        // leave member null — UI will show not-found message
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <LoadingSpinner size="lg" />;

  if (!member) {
    return (
      <div className="py-12 text-center text-[#8892a8]">
        {lang === 'ar' ? 'العضو غير موجود' : 'Member not found'}
      </div>
    );
  }

  /** Helper to render a label + value row inside the info card */
  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-sm text-[#8892a8]">{label}</span>
      <span className="text-sm text-[#f3f6ff]">{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with name and action buttons */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/dashboard/members')}
            className="mb-1 text-sm text-[#8892a8] transition-colors hover:text-[#f3f6ff]"
          >
            &larr; {labels.back}
          </button>
          <h1 className="text-xl font-semibold text-[#f3f6ff]">{member.name}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/dashboard/members/${id}/edit`)}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {labels.edit}
          </button>
          <button
            onClick={() => router.push(`/dashboard/subscriptions/new?member_id=${id}`)}
            className="rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/10"
          >
            + {labels.subscriptions}
          </button>
        </div>
      </div>

      {/* Member info card */}
      <div className="rounded-xl border border-border bg-surface-card p-5">
        <InfoRow label={labels.name} value={member.name} />
        <InfoRow label={labels.phone} value={member.phone} />
        <InfoRow
          label={labels.gender}
          value={member.gender === 'male' ? labels.male : labels.female}
        />
        <InfoRow label={lang === 'ar' ? 'مستوى الوصول' : 'Access Tier'} value={member.access_tier} />
        <InfoRow label={lang === 'ar' ? 'رمز البطاقة' : 'Card Code'} value={member.card_code ?? ''} />
        <InfoRow label={lang === 'ar' ? 'العنوان' : 'Address'} value={member.address ?? ''} />
        <InfoRow
          label={lang === 'ar' ? 'تاريخ الإنشاء' : 'Created'}
          value={formatDate(member.created_at, locale)}
        />
        <InfoRow
          label={lang === 'ar' ? 'آخر تحديث' : 'Updated'}
          value={formatDate(member.updated_at, locale)}
        />
      </div>

      {/* Subscriptions section */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-[#f3f6ff]">{labels.subscriptions}</h2>
        {subs.length === 0 ? (
          <p className="text-sm text-[#8892a8]">{labels.noData}</p>
        ) : (
          <div className="space-y-3">
            {subs.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-card px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-[#f3f6ff]">
                    {sub.plan_name || (lang === 'ar' ? 'اشتراك' : 'Subscription')}
                  </p>
                  <p className="text-xs text-[#8892a8]">
                    {formatDate(sub.start_date, locale)} — {formatDate(sub.end_date, locale)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#f3f6ff]">{formatCurrency(sub.price)}</p>
                  <p
                    className={`text-xs font-medium ${
                      sub.status === 'active' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {sub.status === 'active' ? labels.active : labels.expired}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
