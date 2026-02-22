'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import MemberForm from '@/components/dashboard/MemberForm';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function NewMemberPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLang();
  const labels = t[lang];

  // Pre-fill from query params (e.g. guest pass conversion)
  const prefillName = searchParams.get('name') || '';
  const prefillPhone = searchParams.get('phone') || '';
  const fromGuest = searchParams.get('from_guest') || '';

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

      {/* Pre-fill banner when converting from guest pass */}
      {fromGuest && (
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>{labels.convert_to_client}</AlertTitle>
          <AlertDescription>{labels.convert_to_client_description}</AlertDescription>
        </Alert>
      )}

      {/* The shared form component */}
      <div>
        <MemberForm
          initialData={{
            name: prefillName,
            phone: prefillPhone,
          }}
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dashboard/members')}
          loading={loading}
        />
      </div>
    </div>
  );
}
