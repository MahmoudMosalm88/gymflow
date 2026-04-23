'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { useAuth } from '@/lib/use-auth';
import { getCachedMemberDetail } from '@/lib/offline/read-model';
import { saveMemberUpdate } from '@/lib/offline/actions';
import MemberForm from '@/components/dashboard/MemberForm';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner'; // Keeping existing LoadingSpinner for now

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Terminal } from 'lucide-react'; // Example icon for Alert

type Member = {
  id: string;
  name: string;
  phone: string;
  gender?: 'male' | 'female';
  access_tier: 'full' | 'limited';
  card_code?: string;
  address?: string;
  updated_at?: number;
};

export default function EditMemberPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const { profile, loading: authLoading } = useAuth();
  const labels = t[lang];

  const [member, setMember] = useState<Member | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch all members, find the one we're editing
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get<Member>(`/api/members/${id}`);
        if (!cancelled && res.success && res.data) {
          setMember(res.data);
          return;
        }
      } catch {
        // Fall through to offline cache.
      }

      const cached = await getCachedMemberDetail(id);
      if (!cancelled) {
        setMember(cached?.member ? {
          id: cached.member.id,
          name: cached.member.name,
          phone: cached.member.phone,
          gender: cached.member.gender,
          access_tier: cached.member.access_tier as 'full' | 'limited',
          card_code: cached.member.card_code ?? undefined,
          address: cached.member.address ?? undefined,
          updated_at: cached.member.updated_at,
        } : null);
      }
    })().finally(() => {
      if (!cancelled) setPageLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [id]);

  /** Send updated data to the API, then navigate back to the detail page */
  const handleSubmit = async (data: { name: string; phone: string; access_tier: 'full' | 'limited'; card_code: string; address: string }) => {
    setSaving(true);
    setError('');
    try {
      const res = await saveMemberUpdate({ memberId: id, patch: data, baseUpdatedAt: member?.updated_at ?? null });
      if (!res.success) throw new Error(labels.error);
      router.push(`/dashboard/members/${id}`);
    } catch (err: any) {
      setError(err?.message || labels.error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (profile?.role === 'trainer') {
      router.replace(`/dashboard/members/${id}`);
    }
  }, [authLoading, id, profile, router]);

  if (pageLoading || authLoading) return <LoadingSpinner size="lg" />;

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

  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 md:p-6 lg:p-8">
      {/* Page title */}
      <h1 className="text-3xl font-bold truncate">{labels.edit_member} — {member.name}</h1>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" /> {/* Example icon */}
          <AlertTitle>{labels.error_title}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Form pre-filled with existing member data */}
      <div> {/* MemberForm now provides its own Card wrapper */}
        <MemberForm
          initialData={member}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/dashboard/members/${id}`)}
          loading={saving}
          hideTitle
        />
      </div>
    </div>
  );
}
