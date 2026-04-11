'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TrainerOption = {
  id: string;
  name: string;
  phone: string;
};

type PtPackage = {
  id: string;
  title: string;
  total_sessions: number;
  sessions_used: number;
  sessions_remaining: number;
  price_paid: number | string;
  valid_from: string;
  valid_until: string;
  status: 'active' | 'exhausted' | 'expired' | 'cancelled';
  notes: string | null;
  assigned_trainer_staff_user_id: string;
  trainer_name?: string;
  next_session_at?: string | null;
  last_session_at?: string | null;
};

type PtSession = {
  id: string;
  package_id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'completed' | 'no_show' | 'late_cancel' | 'cancelled';
  notes: string | null;
  trainer_name?: string;
  package_title?: string;
};

type Props = {
  memberId: string;
  canSellPackage: boolean;
  canBookSession: boolean;
  trainers: TrainerOption[];
};

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultExpiry(days = 30) {
  const start = new Date();
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return {
    from: toLocalInputValue(start.toISOString()),
    until: toLocalInputValue(end.toISOString()),
  };
}

export default function MemberPtWorkspace({ memberId, canSellPackage, canBookSession, trainers }: Props) {
  const { lang } = useLang();
  const labels = t[lang];
  const [packages, setPackages] = useState<PtPackage[]>([]);
  const [sessions, setSessions] = useState<PtSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const expiryDefaults = useMemo(() => defaultExpiry(30), []);
  const [packageForm, setPackageForm] = useState({
    title: 'PT Package',
    assigned_trainer_staff_user_id: trainers[0]?.id || '',
    total_sessions: '12',
    price_paid: '',
    payment_method: 'cash' as 'cash' | 'digital',
    valid_from: expiryDefaults.from,
    valid_until: expiryDefaults.until,
    notes: '',
  });
  const [sessionForm, setSessionForm] = useState({
    package_id: '',
    trainer_staff_user_id: '',
    scheduled_start: toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000).toISOString()),
    duration_minutes: '60',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [packagesRes, sessionsRes] = await Promise.all([
        api.get<PtPackage[]>(`/api/pt/packages?member_id=${encodeURIComponent(memberId)}`),
        api.get<PtSession[]>(`/api/pt/sessions?member_id=${encodeURIComponent(memberId)}`),
      ]);
      setPackages(packagesRes.data ?? []);
      setSessions(sessionsRes.data ?? []);
      if (!sessionForm.package_id && packagesRes.data?.[0]) {
        setSessionForm((current) => ({
          ...current,
          package_id: packagesRes.data?.[0]?.id || '',
          trainer_staff_user_id: packagesRes.data?.[0]?.assigned_trainer_staff_user_id || '',
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [memberId]);

  const activePackages = packages.filter((item) => item.status === 'active');

  async function submitPackage() {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/pt/packages', {
        member_id: memberId,
        assigned_trainer_staff_user_id: packageForm.assigned_trainer_staff_user_id,
        title: packageForm.title,
        total_sessions: Number(packageForm.total_sessions),
        price_paid: Number(packageForm.price_paid || 0),
        payment_method: packageForm.payment_method,
        valid_from: new Date(packageForm.valid_from).toISOString(),
        valid_until: new Date(packageForm.valid_until).toISOString(),
        notes: packageForm.notes || null,
      });
      setShowPackageDialog(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.error);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSession() {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/pt/sessions', {
        member_id: memberId,
        package_id: sessionForm.package_id,
        trainer_staff_user_id: sessionForm.trainer_staff_user_id,
        scheduled_start: new Date(sessionForm.scheduled_start).toISOString(),
        duration_minutes: Number(sessionForm.duration_minutes || 60),
        notes: sessionForm.notes || null,
      });
      setShowSessionDialog(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{labels.pt_packages}</CardTitle>
        {canSellPackage || canBookSession ? (
          <div className="flex gap-2">
            {canBookSession ? (
              <Button variant="outline" size="sm" onClick={() => setShowSessionDialog(true)}>
                {labels.book_pt_session}
              </Button>
            ) : null}
            {canSellPackage ? (
              <Button size="sm" onClick={() => setShowPackageDialog(true)}>
                {labels.sell_pt_package}
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="text-sm text-muted-foreground">{labels.loading}</p> : null}

        {!loading && packages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.no_pt_packages}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {packages.map((pkg) => (
              <div key={pkg.id} className="border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{pkg.title}</div>
                    <div className="text-xs text-muted-foreground">{pkg.trainer_name || labels.assigned_trainer}</div>
                  </div>
                  <span className="border border-border px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {pkg.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <div>{labels.sessions_left}: {pkg.sessions_remaining}</div>
                  <div>{labels.sessions_used}: {pkg.sessions_used}/{pkg.total_sessions}</div>
                  <div>{labels.valid_until}: {formatDateTime(pkg.valid_until, lang === 'ar' ? 'ar-EG' : 'en-US')}</div>
                  <div>{formatCurrency(Number(pkg.price_paid || 0))}</div>
                  {pkg.next_session_at ? <div>{labels.pt_upcoming_sessions}: {formatDateTime(pkg.next_session_at, lang === 'ar' ? 'ar-EG' : 'en-US')}</div> : null}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">{labels.pt_sessions}</h4>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.no_pt_sessions}</p>
          ) : (
            <div className="overflow-x-auto border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-start">{labels.date}</th>
                    <th className="px-3 py-2 text-start">{labels.package_title}</th>
                    <th className="px-3 py-2 text-start">{labels.assigned_trainer}</th>
                    <th className="px-3 py-2 text-start">{labels.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-t border-border">
                      <td className="px-3 py-2">{formatDateTime(session.scheduled_start, lang === 'ar' ? 'ar-EG' : 'en-US')}</td>
                      <td className="px-3 py-2">{session.package_title || '—'}</td>
                      <td className="px-3 py-2">{session.trainer_name || '—'}</td>
                      <td className="px-3 py-2">{session.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={showPackageDialog && canSellPackage} onOpenChange={setShowPackageDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{labels.sell_pt_package}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{labels.package_title}</Label>
              <Input value={packageForm.title} onChange={(e) => setPackageForm((current) => ({ ...current, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{labels.assigned_trainer}</Label>
              <Select
                value={packageForm.assigned_trainer_staff_user_id}
                onValueChange={(value) => setPackageForm((current) => ({ ...current, assigned_trainer_staff_user_id: value }))}
              >
                <SelectTrigger><SelectValue placeholder={labels.assigned_trainer} /></SelectTrigger>
                <SelectContent>
                  {trainers.map((trainer) => (
                    <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{labels.total}</Label>
                <Input type="number" min="1" value={packageForm.total_sessions} onChange={(e) => setPackageForm((current) => ({ ...current, total_sessions: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{labels.amount_col || 'Amount'}</Label>
                <Input type="number" min="0" value={packageForm.price_paid} onChange={(e) => setPackageForm((current) => ({ ...current, price_paid: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{labels.date}</Label>
                <Input type="datetime-local" value={packageForm.valid_from} onChange={(e) => setPackageForm((current) => ({ ...current, valid_from: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{labels.valid_until}</Label>
                <Input type="datetime-local" value={packageForm.valid_until} onChange={(e) => setPackageForm((current) => ({ ...current, valid_until: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{labels.note || 'Note'}</Label>
              <Textarea value={packageForm.notes} onChange={(e) => setPackageForm((current) => ({ ...current, notes: e.target.value }))} rows={4} />
            </div>
            <Button disabled={submitting} onClick={submitPackage} className="w-full">{submitting ? labels.saving : labels.save}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSessionDialog && canBookSession} onOpenChange={setShowSessionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{labels.book_pt_session}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{labels.pt_packages}</Label>
              <Select
                value={sessionForm.package_id}
                onValueChange={(value) => {
                  const match = activePackages.find((item) => item.id === value);
                  setSessionForm((current) => ({
                    ...current,
                    package_id: value,
                    trainer_staff_user_id: match?.assigned_trainer_staff_user_id || current.trainer_staff_user_id,
                  }));
                }}
              >
                <SelectTrigger><SelectValue placeholder={labels.pt_packages} /></SelectTrigger>
                <SelectContent>
                  {activePackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>{pkg.title} · {pkg.sessions_remaining}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{labels.assigned_trainer}</Label>
              <Select
                value={sessionForm.trainer_staff_user_id}
                onValueChange={(value) => setSessionForm((current) => ({ ...current, trainer_staff_user_id: value }))}
              >
                <SelectTrigger><SelectValue placeholder={labels.assigned_trainer} /></SelectTrigger>
                <SelectContent>
                  {trainers.map((trainer) => (
                    <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{labels.date}</Label>
                <Input type="datetime-local" value={sessionForm.scheduled_start} onChange={(e) => setSessionForm((current) => ({ ...current, scheduled_start: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{labels.duration || 'Duration'}</Label>
                <Input type="number" min="15" step="15" value={sessionForm.duration_minutes} onChange={(e) => setSessionForm((current) => ({ ...current, duration_minutes: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{labels.note || 'Note'}</Label>
              <Textarea value={sessionForm.notes} onChange={(e) => setSessionForm((current) => ({ ...current, notes: e.target.value }))} rows={4} />
            </div>
            <Button disabled={submitting || activePackages.length === 0} onClick={submitSession} className="w-full">{submitting ? labels.saving : labels.save}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
