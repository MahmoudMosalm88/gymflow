'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import MemberForm from '@/components/dashboard/MemberForm';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react'; // Example icon for Alert

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
    <div className="mx-auto max-w-lg space-y-6 p-4 md:p-6 lg:p-8">
      {/* Page title */}
      <h1 className="text-3xl font-bold">{labels.new_member}</h1>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" /> {/* Example icon */}
          <AlertTitle>{labels.error_title}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* The shared form component */}
      <div> {/* MemberForm now provides its own Card wrapper */}
        <MemberForm
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dashboard/members')}
          loading={loading}
        />
      </div>
    </div>
  );
}
