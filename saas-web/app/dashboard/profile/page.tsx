'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import { useLang, t } from '@/lib/i18n';
import { useAuth, logout } from '@/lib/use-auth';
import type { Auth, RecaptchaVerifier } from 'firebase/auth';
import type { FirebaseClientConfig } from '@/lib/firebase-client';
import { SESSION_PROFILE_KEY } from '@/lib/session';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Check, Terminal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type ProfileData = {
  name: string | null;
  email: string | null;
  phone: string | null;
  organization_name: string | null;
  branch_name: string | null;
  gender?: 'male' | 'female' | '';
  languages?: string;
  specialties?: string;
  certifications?: string;
  bio?: string | null;
  beginner_friendly?: boolean;
};

type AvailabilitySlot = {
  weekday: number;
  start_minute: number;
  end_minute: number;
  is_active?: boolean;
};

type TimeOffEntry = {
  starts_at: string;
  ends_at: string;
  reason?: string | null;
};

type FirebaseRuntime = {
  PhoneAuthProvider: typeof import('firebase/auth').PhoneAuthProvider;
  RecaptchaVerifier: typeof import('firebase/auth').RecaptchaVerifier;
  linkWithCredential: typeof import('firebase/auth').linkWithCredential;
  getFirebaseClientAuth: typeof import('@/lib/firebase-client').getFirebaseClientAuth;
  isFirebaseClientConfig: typeof import('@/lib/firebase-client').isFirebaseClientConfig;
};

let firebaseRuntimePromise: Promise<FirebaseRuntime> | null = null;

async function loadFirebaseRuntime(): Promise<FirebaseRuntime> {
  if (!firebaseRuntimePromise) {
    firebaseRuntimePromise = Promise.all([
      import('firebase/auth'),
      import('@/lib/firebase-client'),
    ]).then(([authModule, clientModule]) => ({
      PhoneAuthProvider: authModule.PhoneAuthProvider,
      RecaptchaVerifier: authModule.RecaptchaVerifier,
      linkWithCredential: authModule.linkWithCredential,
      getFirebaseClientAuth: clientModule.getFirebaseClientAuth,
      isFirebaseClientConfig: clientModule.isFirebaseClientConfig,
    }));
  }

  return firebaseRuntimePromise;
}

export default function ProfilePage() {
  const { lang } = useLang();
  const { profile } = useAuth();
  const canEditTenantNames = profile?.role === 'owner';
  const isTrainer = profile?.role === 'trainer';
  const labels = t[lang];
  const trainerCopy = lang === 'ar'
    ? {
        title: 'ملف المدرب',
        subtitle: 'هذه البيانات ستُستخدم لاحقاً في إسناد العملاء وواجهة المدرب.',
        gender: 'النوع',
        languages: 'اللغات',
        specialties: 'التخصصات',
        certifications: 'الشهادات',
        bio: 'نبذة قصيرة',
        beginner: 'مناسب للمبتدئين',
        placeholders: {
          languages: 'مثال: العربية, English',
          specialties: 'مثال: خسارة الوزن, قوة, إصابات',
          certifications: 'مثال: ACE CPT, ISSA',
          bio: 'عرّف عن نفسك بشكل مختصر'
        }
      }
    : {
        title: 'Trainer Profile',
        subtitle: 'These fields will power trainer assignment and the trainer-facing workflow.',
        gender: 'Gender',
        languages: 'Languages',
        specialties: 'Specialties',
        certifications: 'Certifications',
        bio: 'Short bio',
        beginner: 'Beginner-friendly',
        placeholders: {
          languages: 'Arabic, English',
          specialties: 'Weight loss, strength, rehab',
          certifications: 'ACE CPT, ISSA',
          bio: 'A short trainer intro'
        }
      };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpStatus, setOtpStatus] = useState<'idle' | 'sent' | 'verified'>('idle');
  const [otpCode, setOtpCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [otpConflict, setOtpConflict] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOffEntry[]>([]);
  const [showTimeOffDialog, setShowTimeOffDialog] = useState(false);
  const [timeOffDraft, setTimeOffDraft] = useState<TimeOffEntry>({ starts_at: '', ends_at: '', reason: '' });

  const [form, setForm] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    organization_name: '',
    branch_name: '',
    gender: '',
    languages: '',
    specialties: '',
    certifications: '',
    bio: '',
    beginner_friendly: false,
  });

  // Snapshot of last-saved values — used to detect unsaved changes
  const [saved, setSaved] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    organization_name: '',
    branch_name: '',
    gender: '',
    languages: '',
    specialties: '',
    certifications: '',
    bio: '',
    beginner_friendly: false,
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
            gender: res.data.gender || '',
            languages: Array.isArray((res.data as any).languages) ? (res.data as any).languages.join(', ') : '',
            specialties: Array.isArray((res.data as any).specialties) ? (res.data as any).specialties.join(', ') : '',
            certifications: Array.isArray((res.data as any).certifications) ? (res.data as any).certifications.join(', ') : '',
            bio: (res.data as any).bio || '',
            beginner_friendly: Boolean((res.data as any).beginner_friendly),
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

  useEffect(() => {
    async function loadAvailability() {
      if (!isTrainer || !profile?.id) return;
      setAvailabilityLoading(true);
      try {
        const res = await api.get<{ slots: AvailabilitySlot[]; timeOff: TimeOffEntry[] }>(`/api/trainers/${profile.id}/availability`);
        if (res.success && res.data) {
          setAvailabilitySlots(
            res.data.slots?.length
              ? res.data.slots
              : [
                  { weekday: 0, start_minute: 540, end_minute: 1020, is_active: false },
                  { weekday: 1, start_minute: 540, end_minute: 1020, is_active: true },
                  { weekday: 2, start_minute: 540, end_minute: 1020, is_active: true },
                  { weekday: 3, start_minute: 540, end_minute: 1020, is_active: true },
                  { weekday: 4, start_minute: 540, end_minute: 1020, is_active: true },
                  { weekday: 5, start_minute: 540, end_minute: 1020, is_active: true },
                  { weekday: 6, start_minute: 540, end_minute: 1020, is_active: false },
                ]
          );
          setTimeOff(res.data.timeOff || []);
        }
      } catch (err) {
        setAvailabilityMessage(err instanceof Error ? err.message : labels.error);
      } finally {
        setAvailabilityLoading(false);
      }
    }
    void loadAvailability();
  }, [isTrainer, profile?.id, labels.error]);

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
      const csvToArray = (value: string | null | undefined) =>
        String(value || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      const payload = isTrainer
        ? {
            ...form,
            languages: csvToArray(form.languages),
            specialties: csvToArray(form.specialties),
            certifications: csvToArray(form.certifications),
            bio: form.bio || '',
            beginner_friendly: Boolean(form.beginner_friendly),
          }
        : form;
      const res = await api.put('/api/profile', payload);
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
        const existing = localStorage.getItem(SESSION_PROFILE_KEY);
        if (existing) {
          try {
            const parsed = JSON.parse(existing);
            parsed.name = form.name;
            parsed.email = form.email;
            if (canEditTenantNames) {
              parsed.organizationName = form.organization_name;
              parsed.branchName = form.branch_name;
            }
            localStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(parsed));
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

  async function handlePasswordResetLink() {
    const email = (form.email || '').trim();
    if (!email) {
      setError(lang === 'ar' ? 'لا يوجد بريد إلكتروني مرتبط بهذا الحساب.' : 'No email address is linked to this account.');
      setSuccess('');
      return;
    }

    setSendingPasswordReset(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || (lang === 'ar' ? 'تعذر إرسال رابط تغيير كلمة المرور.' : 'Could not send the password reset link.'));
      }
      setSuccess(
        payload?.data?.message ||
          (lang === 'ar'
            ? 'تم إرسال رابط تغيير كلمة المرور إلى بريدك الإلكتروني. سيبقى حسابك مسجلاً على هذا الجهاز.'
            : 'A password reset link was sent to your email. You will stay signed in on this device.')
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : (lang === 'ar' ? 'تعذر إرسال رابط تغيير كلمة المرور.' : 'Could not send the password reset link.'));
    } finally {
      setSendingPasswordReset(false);
    }
  }

  function updateField(key: keyof ProfileData, value: string | boolean) {
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

  function minutesToTime(value: number) {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  function timeToMinutes(value: string) {
    const [hours, minutes] = value.split(':').map(Number);
    return (hours * 60) + (minutes || 0);
  }

  async function saveAvailability() {
    if (!profile?.id) return;
    setAvailabilitySaving(true);
    setAvailabilityMessage('');
    try {
      const res = await api.put(`/api/trainers/${profile.id}/availability`, {
        slots: availabilitySlots.map((slot) => ({
          weekday: slot.weekday,
          start_minute: slot.start_minute,
          end_minute: slot.end_minute,
          is_active: Boolean(slot.is_active),
        })),
        time_off: timeOff,
      });
      if (res.success) {
        setAvailabilityMessage(lang === 'ar' ? 'تم حفظ المواعيد.' : 'Availability saved.');
      } else {
        setAvailabilityMessage(res.message || labels.error);
      }
    } catch (err) {
      setAvailabilityMessage(err instanceof Error ? err.message : labels.error);
    } finally {
      setAvailabilitySaving(false);
    }
  }

  const weekdayLabels = lang === 'ar'
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  async function getAuthClient() {
    const runtime = await loadFirebaseRuntime();
    const response = await fetch('/api/auth/firebase-config', { cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error('Firebase auth config is missing.');
    }
    const candidate =
      payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object'
        ? payload.data
        : payload;
    if (!runtime.isFirebaseClientConfig(candidate)) {
      throw new Error('Firebase auth config is invalid.');
    }
    const auth = await runtime.getFirebaseClientAuth(candidate as FirebaseClientConfig);
    return { auth, runtime };
  }

  async function getRecaptcha(auth: Auth) {
    if (recaptchaRef.current) return recaptchaRef.current;
    const host = recaptchaContainerRef.current;
    if (!host) {
      throw new Error('Phone verification container is not ready. Refresh and try again.');
    }
    host.innerHTML = '';
    const target = document.createElement('div');
    host.appendChild(target);
    recaptchaTargetRef.current = target;
    const runtime = await loadFirebaseRuntime();
    recaptchaRef.current = new runtime.RecaptchaVerifier(auth, target, { size: 'invisible' });
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
      const { auth, runtime } = await getAuthClient();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to verify phone.');
      }

      // Use real reCAPTCHA even on localhost for real phone numbers.
      // Test-mode app verification is only for Firebase fictional numbers.
      auth.settings.appVerificationDisabledForTesting = false;

      // Force a fresh verifier each send to avoid stale app-credential tokens.
      resetRecaptcha();
      const verifier = await getRecaptcha(auth);
      await verifier.render();
      const provider = new runtime.PhoneAuthProvider(auth);
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
      const { auth, runtime } = await getAuthClient();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to verify phone.');
      }
      const credential = runtime.PhoneAuthProvider.credential(verificationId, otpCode.trim());
      await runtime.linkWithCredential(currentUser, credential);
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
        <h1 className="text-2xl font-heading font-bold tracking-tight">{labels.profile}</h1>
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
        style={{ borderInlineStart: '4px solid hsl(var(--destructive))' }}
      >
        {/* Initials badge — same visual language as the sidebar GF logo */}
        <span
          style={{
            background: 'hsl(var(--destructive))',
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
          {profile?.role && (
            <Badge variant="outline" className="text-[10px] w-fit capitalize">{profile.role}</Badge>
          )}
          <p className="text-sm text-muted-foreground truncate">{orgLine}</p>
        </div>
      </div>

      {/* ── Two-column grid: Personal Info + Organization ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Personal Info */}
        <Card className="shadow-[6px_6px_0_#000000]">
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
        <Card className="shadow-[6px_6px_0_#000000]">
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
                disabled={!canEditTenantNames}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-branch">{labels.branch_name}</Label>
              <Input
                id="profile-branch"
                value={form.branch_name || ''}
                onChange={(e) => updateField('branch_name', e.target.value)}
                disabled={!canEditTenantNames}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {isTrainer && (
        <Card className="shadow-[6px_6px_0_#000000]">
          <CardHeader>
            <CardTitle>{trainerCopy.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{trainerCopy.subtitle}</p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trainer-gender">{trainerCopy.gender}</Label>
              <Select value={form.gender || '__none__'} onValueChange={(value) => updateField('gender', value === '__none__' ? '' : value)}>
                <SelectTrigger id="trainer-gender">
                  <SelectValue placeholder={lang === 'ar' ? 'غير محدد' : 'Not set'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{lang === 'ar' ? 'غير محدد' : 'Not set'}</SelectItem>
                  <SelectItem value="male">{labels.male}</SelectItem>
                  <SelectItem value="female">{labels.female}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainer-beginner">{trainerCopy.beginner}</Label>
              <label className="flex h-10 items-center gap-3 rounded-md border border-input px-3 text-sm">
                <input
                  id="trainer-beginner"
                  type="checkbox"
                  checked={Boolean(form.beginner_friendly)}
                  onChange={(e) => updateField('beginner_friendly', e.target.checked)}
                />
                <span>{trainerCopy.beginner}</span>
              </label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainer-languages">{trainerCopy.languages}</Label>
              <Input
                id="trainer-languages"
                value={form.languages || ''}
                onChange={(e) => updateField('languages', e.target.value)}
                placeholder={trainerCopy.placeholders.languages}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainer-specialties">{trainerCopy.specialties}</Label>
              <Input
                id="trainer-specialties"
                value={form.specialties || ''}
                onChange={(e) => updateField('specialties', e.target.value)}
                placeholder={trainerCopy.placeholders.specialties}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainer-certifications">{trainerCopy.certifications}</Label>
              <Input
                id="trainer-certifications"
                value={form.certifications || ''}
                onChange={(e) => updateField('certifications', e.target.value)}
                placeholder={trainerCopy.placeholders.certifications}
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="trainer-bio">{trainerCopy.bio}</Label>
              <Textarea
                id="trainer-bio"
                value={form.bio || ''}
                onChange={(e) => updateField('bio', e.target.value)}
                placeholder={trainerCopy.placeholders.bio}
                className="min-h-[120px]"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {isTrainer && (
        <Card className="shadow-[6px_6px_0_#000000]">
          <CardHeader>
            <CardTitle>{labels.trainer_availability}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {trainerCopy.subtitle}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {availabilityMessage ? <p className="text-sm text-muted-foreground">{availabilityMessage}</p> : null}
            {availabilityLoading ? (
              <p className="text-sm text-muted-foreground">{labels.loading}</p>
            ) : (
              <div className="space-y-3">
                {availabilitySlots
                  .sort((a, b) => a.weekday - b.weekday)
                  .map((slot, index) => (
                    <div key={`${slot.weekday}-${index}`} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[160px_1fr_1fr_140px] md:items-center">
                      <div className="font-medium">{weekdayLabels[slot.weekday]}</div>
                      <div className="space-y-1">
                        <Label>{lang === 'ar' ? 'من' : 'From'}</Label>
                        <Input
                          type="time"
                          value={minutesToTime(slot.start_minute)}
                          onChange={(e) =>
                            setAvailabilitySlots((current) =>
                              current.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, start_minute: timeToMinutes(e.target.value) } : row
                              )
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{lang === 'ar' ? 'إلى' : 'To'}</Label>
                        <Input
                          type="time"
                          value={minutesToTime(slot.end_minute)}
                          onChange={(e) =>
                            setAvailabilitySlots((current) =>
                              current.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, end_minute: timeToMinutes(e.target.value) } : row
                              )
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{lang === 'ar' ? 'الحالة' : 'Status'}</Label>
                        <Select
                          value={slot.is_active ? 'active' : 'off'}
                          onValueChange={(value) =>
                            setAvailabilitySlots((current) =>
                              current.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, is_active: value === 'active' } : row
                              )
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">{lang === 'ar' ? 'متاح' : 'Available'}</SelectItem>
                            <SelectItem value="off">{lang === 'ar' ? 'إجازة' : 'Off'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            <div className="space-y-3 rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{lang === 'ar' ? 'إجازات واستثناءات' : 'Time Off'}</div>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowTimeOffDialog(true)}>
                  {lang === 'ar' ? 'إضافة استثناء' : 'Add time off'}
                </Button>
              </div>
              {timeOff.length === 0 ? (
                <p className="text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد استثناءات.' : 'No time off entries yet.'}</p>
              ) : (
                <div className="space-y-2">
                  {timeOff.map((entry, index) => (
                    <div key={`${entry.starts_at}-${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                      <div>
                        <div className="text-sm font-medium">{formatDateTime(entry.starts_at, lang === 'ar' ? 'ar-EG' : 'en-US')}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(entry.ends_at, lang === 'ar' ? 'ar-EG' : 'en-US')}
                          {entry.reason ? ` · ${entry.reason}` : ''}
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setTimeOff((current) => current.filter((_, rowIndex) => rowIndex !== index))}>
                        {lang === 'ar' ? 'حذف' : 'Remove'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={saveAvailability} disabled={availabilitySaving}>
                {availabilitySaving ? labels.saving : labels.save}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Security row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-2 border-border bg-card">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {labels.security}
        </span>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handlePasswordResetLink} disabled={sendingPasswordReset}>
            {sendingPasswordReset ? labels.loading : labels.change_password}
          </Button>
          <Button
            variant="outline"
            onClick={logout}
            className="border-destructive text-destructive hover:bg-destructive hover:text-white"
          >
            {labels.logout}
          </Button>
        </div>
      </div>

      <Dialog open={showTimeOffDialog} onOpenChange={setShowTimeOffDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{lang === 'ar' ? 'إضافة إجازة' : 'Add Time Off'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{lang === 'ar' ? 'من' : 'From'}</Label>
              <Input type="datetime-local" value={timeOffDraft.starts_at} onChange={(e) => setTimeOffDraft((current) => ({ ...current, starts_at: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{lang === 'ar' ? 'إلى' : 'To'}</Label>
              <Input type="datetime-local" value={timeOffDraft.ends_at} onChange={(e) => setTimeOffDraft((current) => ({ ...current, ends_at: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{lang === 'ar' ? 'السبب' : 'Reason'}</Label>
              <Input value={timeOffDraft.reason || ''} onChange={(e) => setTimeOffDraft((current) => ({ ...current, reason: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowTimeOffDialog(false)}>
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!timeOffDraft.starts_at || !timeOffDraft.ends_at) return;
                  setTimeOff((current) => [
                    ...current,
                    {
                      starts_at: new Date(timeOffDraft.starts_at).toISOString(),
                      ends_at: new Date(timeOffDraft.ends_at).toISOString(),
                      reason: timeOffDraft.reason || null,
                    },
                  ]);
                  setTimeOffDraft({ starts_at: '', ends_at: '', reason: '' });
                  setShowTimeOffDialog(false);
                }}
              >
                {lang === 'ar' ? 'إضافة' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
