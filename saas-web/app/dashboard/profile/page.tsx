'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { useAuth, logout } from '@/lib/use-auth';
import {
  Auth,
  PhoneAuthProvider,
  RecaptchaVerifier,
  linkWithCredential
} from 'firebase/auth';
import {
  FirebaseClientConfig,
  getFirebaseClientAuth,
  isFirebaseClientConfig
} from '@/lib/firebase-client';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, Terminal } from 'lucide-react';

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
  const [otpStatus, setOtpStatus] = useState<'idle' | 'sent' | 'verified'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [otpConflict, setOtpConflict] = useState(false);

  const [form, setForm] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    organization_name: '',
    branch_name: '',
  });

  // Snapshot of last-saved values — used to detect unsaved changes
  const [saved, setSaved] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    organization_name: '',
    branch_name: '',
  });
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const recaptchaTargetRef = useRef<HTMLDivElement | null>(null);

  const e164Regex = /^\+[1-9]\d{7,14}$/;

  useEffect(() => {
    return () => {
      resetRecaptcha();
    };
  }, []);

  // Load profile from API
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<ProfileData>('/api/profile');
        if (res.success && res.data) {
          const loaded: ProfileData = {
            name: res.data.name || '',
            email: res.data.email || '',
            phone: res.data.phone || '',
            organization_name: res.data.organization_name || '',
            branch_name: res.data.branch_name || '',
          };
          setForm(loaded);
          setSaved(loaded);
          setVerifiedPhone((loaded.phone || '').trim());
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
    const currentPhone = (form.phone || '').trim();
    const savedPhone = (saved.phone || '').trim();
    const phoneChanged = currentPhone !== savedPhone;
    const newPhoneNeedsVerification = phoneChanged && currentPhone.length > 0;

    if (newPhoneNeedsVerification && verifiedPhone !== currentPhone) {
      setError(labels.verify_phone_otp);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/api/profile', form);
      if (res.success) {
        setSuccess(labels.profile_updated);
        setSaved({ ...form }); // reset dirty state
        setVerifiedPhone((form.phone || '').trim());
        setOtpStatus('idle');
        setOtpCode('');
        setOtpMessage('');
        setOtpConflict(false);
        setVerificationId(null);

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
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'phone') {
        setOtpStatus('idle');
        setOtpCode('');
        setOtpMessage('');
        setOtpConflict(false);
        setVerificationId(null);
      }
      return next;
    });
  }

  async function getAuthClient() {
    const response = await fetch('/api/auth/firebase-config', { cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error('Firebase auth config is missing.');
    }
    const candidate =
      payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object'
        ? payload.data
        : payload;
    if (!isFirebaseClientConfig(candidate)) {
      throw new Error('Firebase auth config is invalid.');
    }
    return await getFirebaseClientAuth(candidate as FirebaseClientConfig);
  }

  function getRecaptcha(auth: Auth) {
    if (recaptchaRef.current) return recaptchaRef.current;
    const host = recaptchaContainerRef.current;
    if (!host) {
      throw new Error('Phone verification container is not ready. Refresh and try again.');
    }
    host.innerHTML = '';
    const target = document.createElement('div');
    host.appendChild(target);
    recaptchaTargetRef.current = target;
    recaptchaRef.current = new RecaptchaVerifier(auth, target, { size: 'invisible' });
    return recaptchaRef.current;
  }

  function resetRecaptcha() {
    try {
      recaptchaRef.current?.clear();
    } catch {
      // ignore cleanup issues
    }
    recaptchaRef.current = null;
    recaptchaTargetRef.current = null;
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = '';
    }
  }

  async function sendPhoneOtp() {
    setError('');
    setSuccess('');
    setOtpMessage('');
    setOtpConflict(false);
    const phone = (form.phone || '').trim();
    const savedPhone = (saved.phone || '').trim();

    if (!phone) {
      setOtpMessage(labels.enter_phone_first);
      return;
    }
    if (!e164Regex.test(phone)) {
      setOtpMessage(labels.use_e164_format);
      return;
    }
    if (phone === savedPhone) {
      setOtpMessage(labels.phone_already_saved);
      return;
    }

    setOtpBusy(true);
    try {
      const auth = await getAuthClient();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to verify phone.');
      }

      // Use real reCAPTCHA even on localhost for real phone numbers.
      // Test-mode app verification is only for Firebase fictional numbers.
      auth.settings.appVerificationDisabledForTesting = false;

      // Force a fresh verifier each send to avoid stale app-credential tokens.
      resetRecaptcha();
      const verifier = getRecaptcha(auth);
      await verifier.render();
      const provider = new PhoneAuthProvider(auth);
      const id = await provider.verifyPhoneNumber(phone, verifier);
      setVerificationId(id);
      setOtpStatus('sent');
      setOtpMessage(labels.otp_sent);
    } catch (err) {
      const code =
        typeof err === 'object' && err && 'code' in err
          ? String((err as { code?: string }).code || '')
          : '';
      if (
        code === 'auth/invalid-app-credential' ||
        code === 'auth/missing-app-credential' ||
        code === 'auth/captcha-check-failed'
      ) {
        resetRecaptcha();
      }
      const message =
        code === 'auth/account-exists-with-different-credential'
          ? 'This phone number is already linked to another account. Use a different number.'
          : code === 'auth/credential-already-in-use'
            ? 'This phone number is already linked to another account. Use a different number.'
            : code === 'auth/phone-number-already-exists'
              ? 'This phone number is already linked to another account. Use a different number.'
              : code === 'auth/invalid-phone-number'
                ? 'Invalid phone number format. Use E.164 format, e.g. +15551234567.'
                : code === 'auth/too-many-requests'
                  ? 'Too many attempts. Wait a few minutes and try again.'
                  : code === 'auth/invalid-app-credential'
                    ? 'Invalid phone verification credential. Re-run captcha and send code again.'
                    : err instanceof Error
                      ? err.message
                      : 'Failed to send verification code.';
      if (
        code === 'auth/invalid-app-credential'
          || code === 'auth/account-exists-with-different-credential'
          || code === 'auth/credential-already-in-use'
          || code === 'auth/phone-number-already-exists'
      ) {
        setOtpConflict(code !== 'auth/invalid-app-credential');
      }
      setOtpMessage(message);
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyPhoneOtp() {
    setOtpMessage('');
    setOtpConflict(false);
    if (!verificationId) {
      setOtpMessage('Please send code first.');
      return;
    }
    if (!otpCode.trim()) {
      setOtpMessage('Enter the verification code.');
      return;
    }

    setOtpBusy(true);
    try {
      const auth = await getAuthClient();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to verify phone.');
      }
      const credential = PhoneAuthProvider.credential(verificationId, otpCode.trim());
      await linkWithCredential(currentUser, credential);
      const phone = (form.phone || '').trim();
      setVerifiedPhone(phone);
      setOtpStatus('verified');
      setOtpMessage(labels.phone_verified);
      setVerificationId(null);
    } catch (err) {
      const code =
        typeof err === 'object' && err && 'code' in err
          ? String((err as { code?: string }).code || '')
          : '';
      const message =
        code === 'auth/account-exists-with-different-credential'
          ? 'This phone number is already linked to another account. Use a different number.'
          : code === 'auth/credential-already-in-use'
            ? 'This phone number is already linked to another account. Use a different number.'
            : code === 'auth/phone-number-already-exists'
              ? 'This phone number is already linked to another account. Use a different number.'
          : err instanceof Error
            ? err.message
            : 'Invalid verification code.';
      if (
        code === 'auth/account-exists-with-different-credential' ||
        code === 'auth/credential-already-in-use' ||
        code === 'auth/phone-number-already-exists'
      ) {
        setOtpConflict(true);
      }
      setOtpMessage(message);
    } finally {
      setOtpBusy(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  // Derived display values for the identity banner
  const initials = (form.name || '?')[0].toUpperCase();
  const orgLine = [form.organization_name, form.branch_name].filter(Boolean).join(' · ') || '—';

  // Dirty = any field differs from the last saved snapshot
  const isDirty = (Object.keys(form) as (keyof ProfileData)[]).some(
    (k) => form[k] !== saved[k]
  );
  const phoneValue = (form.phone || '').trim();
  const savedPhoneValue = (saved.phone || '').trim();
  const phoneChanged = phoneValue !== savedPhoneValue;
  const phoneNeedsVerification = phoneChanged && phoneValue.length > 0 && verifiedPhone !== phoneValue;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* ── Page header: title + Save button ── */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{labels.profile}</h1>
        <Button
          onClick={handleSave}
          disabled={!isDirty || saving || phoneNeedsVerification}
        >
          {saving ? labels.saving : labels.save}
        </Button>
      </div>

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

      {/* ── Identity Banner ── */}
      <div
        className="flex items-center gap-4 p-5 bg-card border-2 border-border shadow-[6px_6px_0_#000000]"
        style={{ borderInlineStart: '4px solid var(--accent-red, #e63946)' }}
      >
        {/* Initials badge — same visual language as the sidebar GF logo */}
        <span
          style={{
            background: '#e63946',
            color: '#fff',
            padding: '10px 14px',
            fontWeight: 800,
            fontSize: '1.1rem',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {initials}
        </span>
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="font-bold text-lg text-foreground truncate">{form.name || '—'}</p>
          <p className="text-sm text-muted-foreground truncate">{orgLine}</p>
        </div>
      </div>

      {/* ── Two-column grid: Personal Info + Organization ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle>{labels.personal_info}</CardTitle>
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
              {phoneChanged && (
                <div className="rounded-md border border-border p-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {labels.verify_phone_otp}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={sendPhoneOtp} disabled={otpBusy}>
                      {otpBusy ? labels.sending_code : labels.send_code}
                    </Button>
                    {otpStatus === 'verified' && (
                      <span className="text-xs text-emerald-600 font-medium">
                        {labels.verified}
                      </span>
                    )}
                  </div>
                  {(otpStatus === 'sent' || otpStatus === 'verified') && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder={labels.enter_otp}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="max-w-[180px]"
                      />
                      <Button type="button" onClick={verifyPhoneOtp} disabled={otpBusy || otpStatus === 'verified'}>
                        {otpBusy ? labels.verifying : labels.verify_code}
                      </Button>
                    </div>
                  )}
                  {otpMessage && (
                    <Alert variant={otpStatus === 'verified' ? 'default' : 'destructive'}>
                      {otpStatus === 'verified' ? <Check className="h-4 w-4" /> : <Terminal className="h-4 w-4" />}
                      <AlertDescription>{otpMessage}</AlertDescription>
                    </Alert>
                  )}
                  {otpConflict && (
                    <p className="text-xs text-muted-foreground">
                      Action: enter a different phone number, then send a new code.
                    </p>
                  )}
                  <div
                    ref={recaptchaContainerRef}
                    id="profile-phone-recaptcha"
                    className="fixed -left-[9999px] top-0 h-px w-px overflow-hidden pointer-events-none"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Organization */}
        <Card>
          <CardHeader>
            <CardTitle>{labels.organization}</CardTitle>
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
      </div>

      {/* ── Security row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-2 border-border bg-card">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {labels.security}
        </span>
        <div className="flex flex-wrap gap-3">
          <Link href="/forgot-password">
            <Button variant="outline">{labels.change_password}</Button>
          </Link>
          <Button
            variant="outline"
            onClick={logout}
            className="border-destructive text-destructive hover:bg-destructive hover:text-white"
          >
            {labels.logout}
          </Button>
        </div>
      </div>

    </div>
  );
}
