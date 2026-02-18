'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { useAuth, logout } from '@/lib/use-auth';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check } from 'lucide-react';

type ProfileData = {
  name: string | null;
  email: string | null;
  phone: string | null;
  organization_name: string | null;
  branch_name: string | null;
};

export default function ProfilePage() {
  const { lang } = useLang();
  const { profile } = useAuth();
  const labels = t[lang];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    organization_name: '',
    branch_name: '',
  });

  // Load profile from API
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<ProfileData>('/api/profile');
        if (res.success && res.data) {
          setForm({
            name: res.data.name || '',
            email: res.data.email || '',
            phone: res.data.phone || '',
            organization_name: res.data.organization_name || '',
            branch_name: res.data.branch_name || '',
          });
        } else {
          setError(labels.profile_load_error);
        }
      } catch {
        setError(labels.profile_load_error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [labels.profile_load_error]);

  // Save profile
  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/api/profile', form);
      if (res.success) {
        setSuccess(labels.profile_updated);

        // Update localStorage so Header reflects changes immediately
        const existing = localStorage.getItem('owner_profile');
        if (existing) {
          try {
            const parsed = JSON.parse(existing);
            parsed.name = form.name;
            parsed.email = form.email;
            parsed.organizationName = form.organization_name;
            parsed.branchName = form.branch_name;
            localStorage.setItem('owner_profile', JSON.stringify(parsed));
          } catch {
            // ignore parse errors
          }
        }

        // Clear success after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(res.message || labels.error);
      }
    } catch {
      setError(labels.error);
    } finally {
      setSaving(false);
    }
  }

  function updateField(key: keyof ProfileData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">{labels.profile}</h1>

      {/* Success alert */}
      {success && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertTitle>{labels.success_title}</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>{labels.error_title}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Personal info */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.profile}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">{labels.name}</Label>
            <Input
              id="profile-name"
              value={form.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email">{labels.email}</Label>
            <Input
              id="profile-email"
              type="email"
              value={form.email || ''}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-phone">{labels.phone}</Label>
            <Input
              id="profile-phone"
              type="tel"
              value={form.phone || ''}
              onChange={(e) => updateField('phone', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Organization info */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.gym_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-org">{labels.gym_name}</Label>
            <Input
              id="profile-org"
              value={form.organization_name || ''}
              onChange={(e) => updateField('organization_name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-branch">{labels.branch_name}</Label>
            <Input
              id="profile-branch"
              value={form.branch_name || ''}
              onChange={(e) => updateField('branch_name', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Password section */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.change_password}</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/forgot-password">
            <Button variant="outline">{labels.change_password}</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Save button */}
      <Button onClick={handleSave} disabled={saving} className="w-full text-base">
        {saving ? labels.saving : labels.save}
      </Button>

      {/* Logout */}
      <Button
        variant="outline"
        onClick={logout}
        className="w-full text-base border-[#e63946] text-[#e63946] hover:bg-[#e63946] hover:text-white"
      >
        {labels.logout}
      </Button>
    </div>
  );
}
