'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
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
};

export default function EditMemberPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const labels = t[lang];

  const [member, setMember] = useState<Member | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch all members, find the one we're editing
  useEffect(() => {
    api.get<Member[]>('/api/members')
      .then((res) => {
        const found = (res.data ?? []).find((m) => m.id === id);
        if (found) setMember(found);
      })
      .catch(() => {})
      .finally(() => setPageLoading(false));
  }, [id]);

  /** Send updated data to the API, then navigate back to the detail page */
  const handleSubmit = async (data: { name: string; phone: string; access_tier: 'full' | 'limited'; card_code: string; address: string }) => {
    setSaving(true);
    setError('');
    try {
      const res = await api.patch('/api/members', { id, ...data });
      if (!res.success) throw new Error(res.message);
      router.push(`/dashboard/members/${id}`);
    } catch (err: any) {
      setError(err?.message || labels.error);
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) return <LoadingSpinner size="lg" />;

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
      <h1 className="text-3xl font-bold">{labels.edit_member} — {member.name}</h1>

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
