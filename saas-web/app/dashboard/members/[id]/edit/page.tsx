'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import MemberForm from '@/components/dashboard/MemberForm';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

type Member = {
  id: string;
  name: string;
  phone: string;
  gender: 'male' | 'female';
  access_tier: string;
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
  const handleSubmit = async (data: { name: string; phone: string; gender: 'male' | 'female'; access_tier: string; card_code: string; address: string }) => {
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
      <div className="py-12 text-center text-[#8892a8]">
        {lang === 'ar' ? 'العضو غير موجود' : 'Member not found'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* Page title */}
      <h1 className="text-xl font-semibold text-[#f3f6ff]">
        {labels.edit} — {member.name}
      </h1>

      {/* Error toast */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Form pre-filled with existing member data */}
      <div className="rounded-xl border border-border bg-surface-card p-5">
        <MemberForm
          initialData={member}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/dashboard/members/${id}`)}
          loading={saving}
        />
      </div>
    </div>
  );
}
