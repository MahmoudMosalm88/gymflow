'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import MemberForm from '@/components/dashboard/MemberForm';

export default function NewMemberPage() {
  const router = useRouter();
  const { lang } = useLang();
  const labels = t[lang];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /** Send new member data to the API, then navigate back to the list */
  const handleSubmit = async (data: Parameters<typeof MemberForm>[0] extends { onSubmit: (d: infer D) => void } ? D : never) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/members', data);
      if (!res.success) throw new Error(res.message);
      router.push('/dashboard/members');
    } catch (err: any) {
      setError(err?.message || labels.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* Page title */}
      <h1 className="text-xl font-semibold text-[#f3f6ff]">
        {lang === 'ar' ? 'إضافة عضو جديد' : 'New Member'}
      </h1>

      {/* Error toast — appears above the form when something goes wrong */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* The shared form component */}
      <div className="rounded-xl border border-border bg-surface-card p-5">
        <MemberForm
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dashboard/members')}
          loading={loading}
        />
      </div>
    </div>
  );
}
