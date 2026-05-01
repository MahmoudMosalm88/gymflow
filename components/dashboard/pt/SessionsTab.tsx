'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/use-auth';
import { useLang, t } from '@/lib/i18n';
import { formatDate, formatDateTime } from '@/lib/format';
import { DEFAULT_PAYMENT_METHOD } from '@/lib/payment-method-ui';
import { useSaveShortcut } from '@/lib/use-save-shortcut';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import StatCard from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PtPackageViewRow, PtSessionStatus, PtSessionViewRow } from '@/lib/pt';
import type { TrainerProfileRow } from '@/lib/trainers';

// ── Types ──

type ConfirmAction = {
  sessionId: string;
  status: PtSessionStatus;
  label: string;
};

type PtBookingMember = {
  id: string;
  name: string;
  phone?: string | null;
  trainer_staff_user_id?: string | null;
  trainer_name?: string | null;
  sub_status?: string | null;
};

// ── Helpers ──

function startOfTodayIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function endOfWeekIso() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

function startOfTomorrowIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

function nowLocalIso() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function localDateInput(daysFromToday = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function getStatusBadge(status: PtSessionStatus, lang: string): { label: string; className: string } {
  const labels: Record<PtSessionStatus, { en: string; ar: string; className: string }> = {
    scheduled:   { en: 'Scheduled',    ar: 'مجدول',        className: 'bg-info/20 text-info border-info/30' },
    completed:   { en: 'Completed',    ar: 'مكتمل',        className: 'bg-success/20 text-success border-success/30' },
    no_show:     { en: 'No-show',      ar: 'لم يحضر',      className: 'bg-warning/20 text-warning border-warning/30' },
    late_cancel: { en: 'Late Cancel',  ar: 'إلغاء متأخر',  className: 'bg-warning/20 text-warning border-warning/30' },
    cancelled:   { en: 'Cancelled',    ar: 'ملغي',         className: 'bg-muted text-muted-foreground border-border' },
  };
  const entry = labels[status];
  return { label: lang === 'ar' ? entry.ar : entry.en, className: entry.className };
}

// ── Page ──

export default function SessionsTab() {
  const { profile } = useAuth();
  const { lang } = useLang();
  const labels = t[lang];
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  const isTrainer = profile?.role === 'trainer';
  const canCreatePt = profile?.role === 'owner' || profile?.role === 'manager';

  // Data
  const [sessions, setSessions] = useState<PtSessionViewRow[]>([]);
  const [packages, setPackages] = useState<PtPackageViewRow[]>([]);
  const [trainers, setTrainers] = useState<TrainerProfileRow[]>([]);
  const [members, setMembers] = useState<PtBookingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [trainerFilter, setTrainerFilter] = useState<string>('all');

  // Action states
  const [updatingSessionId, setUpdatingSessionId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  // Reschedule dialog
  const [editSession, setEditSession] = useState<PtSessionViewRow | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editDuration, setEditDuration] = useState('60');
  const [editNotes, setEditNotes] = useState('');
  const editScopeRef = useRef<HTMLDivElement | null>(null);

  // Book session dialog
  const [bookOpen, setBookOpen] = useState(false);

  // Abort controller for cleanup
  const abortRef = useRef<AbortController | null>(null);

  // ── Data fetching ──

  async function loadSessions() {
    const url = `/api/pt/sessions?from=${encodeURIComponent(startOfTodayIso())}&to=${encodeURIComponent(endOfWeekIso())}`;
    const res = await api.get<PtSessionViewRow[]>(url);
    setSessions(res.data ?? []);
  }

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const packageUrl = isTrainer
        ? `/api/pt/packages?trainer_id=${encodeURIComponent(profile?.id || '')}`
        : `/api/pt/packages`;

      const fetches: Promise<unknown>[] = [
        loadSessions(),
        api.get<PtPackageViewRow[]>(packageUrl).then(res => setPackages(res.data ?? [])),
      ];
      // Managers get the trainer list for filtering
      if (!isTrainer) {
        fetches.push(api.get<TrainerProfileRow[]>('/api/trainers').then(res => setTrainers(res.data ?? [])));
      }
      if (canCreatePt) {
        fetches.push(api.get<PtBookingMember[]>('/api/members').then(res => setMembers(res.data ?? [])));
      }
      await Promise.all(fetches);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!profile) return;
    void loadAll();
    return () => { abortRef.current?.abort(); };
  }, [profile?.id, profile?.role, canCreatePt]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data (filtered by trainer) ──

  const filteredSessions = useMemo(() => {
    if (trainerFilter === 'all') return sessions;
    return sessions.filter(s => s.trainer_staff_user_id === trainerFilter);
  }, [sessions, trainerFilter]);

  const filteredPackages = useMemo(() => {
    if (trainerFilter === 'all') return packages;
    return packages.filter(p => p.assigned_trainer_staff_user_id === trainerFilter);
  }, [packages, trainerFilter]);

  const todaySessions = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return filteredSessions.filter(s => {
      const when = new Date(s.scheduled_start).getTime();
      return when >= start.getTime() && when < end.getTime();
    });
  }, [filteredSessions]);

  const upcomingSessions = useMemo(() => {
    const tomorrowStart = new Date(startOfTomorrowIso()).getTime();
    return filteredSessions.filter(
      s => s.status === 'scheduled' && new Date(s.scheduled_start).getTime() >= tomorrowStart
    );
  }, [filteredSessions]);

  const lowBalance = useMemo(
    () => filteredPackages.filter(p => p.status === 'active' && Number(p.sessions_remaining || 0) <= 2),
    [filteredPackages]
  );

  // ── Actions ──

  function requestAction(session: PtSessionViewRow, status: PtSessionStatus, label: string) {
    if (status === 'completed') {
      void doUpdateSession(session.id, status);
    } else {
      setConfirmAction({ sessionId: session.id, status, label });
    }
  }

  async function doUpdateSession(id: string, status: PtSessionStatus) {
    setUpdatingSessionId(id);
    try {
      const res = await api.patch(`/api/pt/sessions/${id}`, { status });
      if (!res.success) {
        throw new Error(res.message || labels.error);
      }
      // Only re-fetch sessions (not packages) for status changes — unless it deducts
      if (status === 'completed' || status === 'no_show' || status === 'late_cancel') {
        await loadAll(); // Package balance may have changed
      } else {
        await loadSessions();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.error);
    } finally {
      setUpdatingSessionId(null);
    }
  }

  async function confirmAndUpdate() {
    if (!confirmAction) return;
    await doUpdateSession(confirmAction.sessionId, confirmAction.status);
    setConfirmAction(null);
  }

  function openEdit(session: PtSessionViewRow) {
    setEditSession(session);
    setEditStart(new Date(session.scheduled_start).toISOString().slice(0, 16));
    setEditDuration(String(Math.max(15, Math.round((new Date(session.scheduled_end).getTime() - new Date(session.scheduled_start).getTime()) / 60000))));
    setEditNotes(session.notes || '');
  }

  async function saveSessionEdit() {
    if (!editSession) return;
    try {
      const res = await api.patch(`/api/pt/sessions/${editSession.id}`, {
        scheduled_start: new Date(editStart).toISOString(),
        duration_minutes: Number(editDuration || 60),
        notes: editNotes || null,
        status: 'scheduled',
      });
      if (!res.success) {
        throw new Error(res.message || labels.error);
      }
      setEditSession(null);
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.error);
    }
  }

  useSaveShortcut({
    scopeRef: editScopeRef,
    onSave: () => {
      void saveSessionEdit();
    },
    enabled: Boolean(editSession),
    disabled: !editSession,
    enterMode: 'all',
  });

  // ── Render ──

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner /></div>;
  }

  const activeTrainers = trainers.filter(tr => tr.is_active);

  return (
    <div className="flex flex-col gap-6">

      {/* ── Book Session CTA + Error ── */}
      {canCreatePt && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setBookOpen(true)} className="gap-1.5">
            <Plus size={14} />
            {lang === 'ar' ? 'حجز جلسة' : 'Book Session'}
          </Button>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div role="alert" className="flex items-center gap-3 border-2 border-destructive bg-destructive/10 px-4 py-3">
          <p className="flex-1 text-sm text-destructive">{error}</p>
          <Button size="sm" variant="outline" onClick={() => { setError(''); void loadAll(); }}>
            {labels.retry ?? 'Retry'}
          </Button>
        </div>
      )}

      {/* ── Trainer filter (managers only) ── */}
      {!isTrainer && activeTrainers.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground uppercase tracking-widest shrink-0">
            {lang === 'ar' ? 'المدرب' : 'Trainer'}
          </span>
          <Select value={trainerFilter} onValueChange={setTrainerFilter} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === 'ar' ? 'جميع المدربين' : 'All Trainers'}</SelectItem>
              {activeTrainers.map(tr => (
                <SelectItem key={tr.id} value={tr.id}>{tr.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={labels.pt_today} value={todaySessions.length} />
        <StatCard label={labels.pt_upcoming_sessions} value={upcomingSessions.length} />
        <StatCard
          label={labels.pt_low_balance_clients}
          value={lowBalance.length}
          color={lowBalance.length > 0 ? 'text-destructive' : 'text-foreground'}
        />
      </div>

      {/* ── Today's Sessions ── */}
      <Card className="shadow-[6px_6px_0_#000000]">
        <CardHeader>
          <CardTitle>{labels.pt_today} — {formatDate(new Date().toISOString(), locale)}</CardTitle>
        </CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.no_pt_sessions}</p>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session) => {
                const badge = getStatusBadge(session.status, lang);
                const isActionable = session.status === 'scheduled';
                const isUpdating = updatingSessionId === session.id;
                return (
                  <div key={session.id} className="border-2 border-border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{session.member_name || (lang === 'ar' ? 'عميل' : 'Client')}</span>
                          <Badge variant="outline" className={`text-xs ${badge.className}`}>{badge.label}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">{session.package_title || (lang === 'ar' ? 'باقة' : 'Package')}</div>
                        <div className="text-sm text-muted-foreground">{formatDateTime(session.scheduled_start, locale)}</div>
                        {!isTrainer && session.trainer_name && (
                          <div className="text-xs text-muted-foreground">{lang === 'ar' ? 'المدرب: ' : 'Trainer: '}{session.trainer_name}</div>
                        )}
                      </div>
                      {isActionable && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => requestAction(session, 'completed', labels.complete_session)}
                          >
                            {labels.complete_session}
                          </Button>
                          {/* Secondary actions in a grouped row */}
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" disabled={isUpdating} onClick={() => requestAction(session, 'no_show', labels.no_show)}>
                              {labels.no_show}
                            </Button>
                            <Button size="sm" variant="outline" disabled={isUpdating} onClick={() => requestAction(session, 'late_cancel', labels.late_cancel)}>
                              {labels.late_cancel}
                            </Button>
                            <Button size="sm" variant="destructive" disabled={isUpdating} onClick={() => requestAction(session, 'cancelled', labels.cancel)}>
                              {labels.cancel}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Upcoming Sessions ── */}
      <Card className="shadow-[6px_6px_0_#000000]">
        <CardHeader>
          <CardTitle>{labels.pt_upcoming_sessions}</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.no_pt_sessions}</p>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((session) => (
                <div key={session.id} className="flex flex-col gap-3 border-2 border-border p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="font-semibold text-foreground">{session.member_name || (lang === 'ar' ? 'عميل' : 'Client')}</div>
                    <div className="text-sm text-muted-foreground">{session.package_title || (lang === 'ar' ? 'باقة' : 'Package')}</div>
                    <div className="text-sm text-muted-foreground">{formatDateTime(session.scheduled_start, locale)}</div>
                    {!isTrainer && session.trainer_name && (
                      <div className="text-xs text-muted-foreground">{lang === 'ar' ? 'المدرب: ' : 'Trainer: '}{session.trainer_name}</div>
                    )}
                    {session.notes && <div className="text-xs text-muted-foreground">{session.notes}</div>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openEdit(session)}>
                    {labels.reschedule}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Low Balance Clients ── */}
      <Card className="shadow-[6px_6px_0_#000000]">
        <CardHeader>
          <CardTitle>{labels.pt_low_balance_clients}</CardTitle>
        </CardHeader>
        <CardContent>
          {lowBalance.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {lang === 'ar' ? 'جميع الباقات النشطة لديها جلسات كافية.' : 'All active packages have sufficient sessions.'}
            </p>
          ) : (
            <div className="space-y-2">
              {lowBalance.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-2 border-border p-3">
                  <div>
                    <div className="font-medium text-foreground">{item.member_name || (lang === 'ar' ? 'عميل' : 'Client')}</div>
                    <div className="text-sm text-muted-foreground">{item.title}</div>
                    {!isTrainer && item.trainer_name && (
                      <div className="text-xs text-muted-foreground">{lang === 'ar' ? 'المدرب: ' : 'Trainer: '}{item.trainer_name}</div>
                    )}
                  </div>
                  <div className="text-end">
                    <div className="font-semibold text-destructive">{item.sessions_remaining}/{item.total_sessions}</div>
                    <div className="text-xs text-muted-foreground">{lang === 'ar' ? 'ينتهي' : 'Expires'} {formatDate(item.valid_until, locale)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Reschedule Dialog ── */}
      <Dialog open={!!editSession} onOpenChange={(open) => { if (!open) setEditSession(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{labels.reschedule}</DialogTitle>
          </DialogHeader>
          <div ref={editScopeRef} className="space-y-4">
            <div className="space-y-2">
              <Label>{labels.date}</Label>
              <Input type="datetime-local" min={nowLocalIso()} value={editStart} onChange={(e) => setEditStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{labels.duration}</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min="15" step="15" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} />
                <span className="text-sm text-muted-foreground whitespace-nowrap">{lang === 'ar' ? 'دقيقة' : 'minutes'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{labels.note}</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditSession(null)}>{labels.cancel}</Button>
              <Button onClick={saveSessionEdit}>{labels.save}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Book Session Dialog ── */}
      <BookSessionDialog
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        trainers={activeTrainers}
        members={members}
        packages={packages.filter(p => p.status === 'active')}
        lang={lang}
        labels={labels}
        onBooked={() => { setBookOpen(false); void loadAll(); }}
      />

      {/* ── Confirm Destructive Action Dialog ── */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{lang === 'ar' ? 'تأكيد الإجراء' : 'Confirm Action'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {lang === 'ar'
              ? `هل أنت متأكد من تعيين هذه الجلسة كـ "${confirmAction?.label}"؟`
              : `Are you sure you want to mark this session as "${confirmAction?.label}"? This cannot be undone.`}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>{labels.cancel}</Button>
            <Button variant="destructive" onClick={() => void confirmAndUpdate()}>{confirmAction?.label}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Book Session Dialog ──

function BookSessionDialog({ open, onClose, trainers, members, packages, lang, labels, onBooked }: {
  open: boolean;
  onClose: () => void;
  trainers: TrainerProfileRow[];
  members: PtBookingMember[];
  packages: PtPackageViewRow[];
  lang: string;
  labels: Record<string, string>;
  onBooked: () => void;
}) {
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  const [memberId, setMemberId] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [packageId, setPackageId] = useState('');
  const [sellInline, setSellInline] = useState(false);
  const [packageTrainerId, setPackageTrainerId] = useState('');
  const [packageTitle, setPackageTitle] = useState('');
  const [totalSessions, setTotalSessions] = useState('10');
  const [pricePaid, setPricePaid] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [start, setStart] = useState('');
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const scopeRef = useRef<HTMLDivElement | null>(null);

  const selectedMember = members.find(m => m.id === memberId);
  const memberPackages = useMemo(
    () => packages.filter(p => p.member_id === memberId && Number(p.sessions_remaining || 0) > 0),
    [packages, memberId]
  );
  const selectedPkg = packages.find(p => p.id === packageId);

  const visibleMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    const filtered = q
      ? members.filter((member) =>
          [member.name, member.phone || '', member.trainer_name || '']
            .some(value => value.toLowerCase().includes(q))
        )
      : members;
    return filtered.slice(0, 30);
  }, [members, memberQuery]);

  useEffect(() => {
    if (open) {
      setMemberId('');
      setMemberQuery('');
      setPackageId('');
      setSellInline(false);
      setPackageTrainerId('');
      setPackageTitle(lang === 'ar' ? 'باقة تدريب شخصي' : 'PT Package');
      setTotalSessions('10');
      setPricePaid('');
      setValidFrom(localDateInput());
      setValidUntil(localDateInput(60));
      setStart(nowLocalIso());
      setDuration('60');
      setNotes('');
      setError('');
    }
  }, [open, lang]);

  useEffect(() => {
    if (!selectedMember) return;
    const assignedTrainer = trainers.find(t => t.id === selectedMember.trainer_staff_user_id && t.is_active);
    setPackageTrainerId(assignedTrainer?.id || '');
    setPackageId('');
    setSellInline(false);
  }, [selectedMember?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedMember) return;
    if (memberPackages.length === 0) {
      setSellInline(true);
      return;
    }
    if (!packageId) {
      setPackageId(memberPackages[0]?.id || '');
    }
  }, [selectedMember?.id, memberPackages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectMember(member: PtBookingMember) {
    setMemberId(member.id);
    setMemberQuery(member.name);
  }

  function positiveNumber(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  function nonNegativeNumber(value: string) {
    const parsed = value.trim() === '' ? 0 : Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  const durationMinutes = positiveNumber(duration);
  const packageTotal = positiveNumber(totalSessions);
  const packagePrice = nonNegativeNumber(pricePaid);
  const canCreatePackage = Boolean(
    selectedMember &&
    packageTrainerId &&
    packageTitle.trim().length >= 2 &&
    packageTotal &&
    packagePrice !== null &&
    validFrom &&
    validUntil
  );
  const packageForBooking = sellInline ? null : selectedPkg;
  const canSubmit = Boolean(
    selectedMember &&
    start &&
    durationMinutes &&
    (packageForBooking || canCreatePackage)
  );

  async function handleBook() {
    if (!selectedMember || !start || !durationMinutes) return;
    setSaving(true);
    setError('');
    try {
      let pkg = packageForBooking;

      if (!pkg) {
        if (!canCreatePackage || !packageTotal || packagePrice === null) return;
        const packageRes = await api.post<PtPackageViewRow>('/api/pt/packages', {
          member_id: selectedMember.id,
          assigned_trainer_staff_user_id: packageTrainerId,
          title: packageTitle.trim(),
          total_sessions: packageTotal,
          price_paid: packagePrice,
          payment_method: DEFAULT_PAYMENT_METHOD,
          valid_from: validFrom,
          valid_until: validUntil,
          notes: null,
        });
        if (!packageRes.success || !packageRes.data) {
          throw new Error(packageRes.message || labels.error);
        }
        pkg = packageRes.data;
      }

      const sessionRes = await api.post('/api/pt/sessions', {
        package_id: pkg.id,
        member_id: pkg.member_id,
        trainer_staff_user_id: pkg.assigned_trainer_staff_user_id,
        scheduled_start: new Date(start).toISOString(),
        duration_minutes: durationMinutes,
        notes: notes || null,
      });
      if (!sessionRes.success) {
        throw new Error(sessionRes.message || labels.error);
      }
      onBooked();
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.error);
    } finally {
      setSaving(false);
    }
  }

  useSaveShortcut({
    scopeRef,
    onSave: () => {
      void handleBook();
    },
    enabled: open,
    disabled: saving || !canSubmit,
    enterMode: 'all',
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fading, setFading] = useState(false);

  function goToStep(s: 1 | 2 | 3) {
    setFading(true);
    setTimeout(() => { setStep(s); setFading(false); }, 180);
  }

  const stepLabels = [
    lang === 'ar' ? 'العميل' : 'Client',
    lang === 'ar' ? 'الباقة' : 'Package',
    lang === 'ar' ? 'الجلسة' : 'Session',
  ];

  useEffect(() => {
    if (open) {
      setStep(1);
      setFading(false);
    }
  }, [open]);

  const canGoForward = step === 1
    ? Boolean(selectedMember)
    : step === 2
      ? Boolean(packageForBooking || canCreatePackage)
      : canSubmit;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
            {lang === 'ar' ? 'حجز جلسة جديدة' : 'Book New Session'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => {
              const s = (i + 1) as 1 | 2 | 3;
              const isDone = step > s;
              const isCurrent = step === s;
              return (
                <div key={s} className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center border-2 text-xs font-bold transition-colors',
                    isDone
                      ? 'border-destructive bg-destructive text-white'
                      : isCurrent
                        ? 'border-destructive text-destructive'
                        : 'border-border text-muted-foreground',
                  )}>
                    {isDone ? <Check size={14} /> : s}
                  </div>
                  {i < 2 && (
                    <div className={cn(
                      'flex-1 min-w-4 h-0.5 transition-colors',
                      step > s ? 'bg-destructive' : 'bg-border',
                    )} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            {stepLabels.map((label, i) => (
              <span key={label} className={cn(
                'text-[11px] font-medium whitespace-nowrap',
                i === 0 ? 'text-start' : i === 2 ? 'text-end' : 'text-center',
                step > i + 1 ? 'text-destructive' : step === i + 1 ? 'text-foreground' : 'text-muted-foreground',
              )} style={i === 1 ? { flex: '1 1 0%' } : undefined}>
                {label}
              </span>
            ))}
          </div>
        </div>

        <div ref={scopeRef} className={cn('px-6 py-4 min-h-[320px] transition-opacity duration-180', fading ? 'opacity-0' : 'opacity-100')}>
          {step === 1 && (
            <div className="space-y-4">
              <Label className="font-heading text-sm font-bold tracking-tight">{lang === 'ar' ? 'اختر العميل' : 'Select client'}</Label>
              <Input
                value={memberQuery}
                onChange={(e) => { setMemberQuery(e.target.value); setMemberId(''); }}
                placeholder={lang === 'ar' ? 'ابحث باسم العميل أو الهاتف...' : 'Search client name or phone...'}
                className="border-2"
              />
              <div className="max-h-52 overflow-y-auto border-2 border-border">
                {visibleMembers.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-muted-foreground">
                    {lang === 'ar' ? 'لا يوجد عملاء مطابقين.' : 'No matching clients.'}
                  </p>
                ) : (
                  visibleMembers.map(member => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => selectMember(member)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-start text-sm border-b border-border last:border-b-0 transition-colors',
                        member.id === memberId ? 'bg-primary/10' : 'hover:bg-secondary/50',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{member.name}</span>
                        <span className="block truncate text-xs text-muted-foreground" dir="ltr">{member.phone || '—'}</span>
                      </span>
                      {member.id === memberId && <Check size={16} className="shrink-0 text-destructive" />}
                    </button>
                  ))
                )}
              </div>
              {selectedMember && (
                <div className="border-2 border-primary/30 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selectedMember.name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{selectedMember.phone || '—'}</p>
                  </div>
                  <span className="text-xs font-heading font-bold bg-destructive text-white px-2 py-0.5">{lang === 'ar' ? 'محدد' : 'Selected'}</span>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-heading text-sm font-bold tracking-tight">
                  {lang === 'ar' ? 'اختر الباقة' : 'Choose package'}
                </Label>
                {memberPackages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSellInline(!sellInline)}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    {sellInline
                      ? (lang === 'ar' ? 'اختيار باقة موجودة' : 'Use existing')
                      : (lang === 'ar' ? 'بيع باقة جديدة' : 'Sell new')}
                  </button>
                )}
              </div>

              {!sellInline && memberPackages.length > 0 ? (
                <div className="grid gap-2">
                  {memberPackages.map(pkg => (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setPackageId(pkg.id)}
                      className={cn(
                        'border-2 p-3 text-start transition-colors',
                        pkg.id === packageId ? 'border-destructive bg-primary/5' : 'border-border hover:bg-secondary/50',
                      )}
                    >
                      <span className="block truncate text-sm font-semibold text-foreground">{pkg.title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {pkg.trainer_name || (lang === 'ar' ? 'مدرب' : 'Trainer')} · <span className="font-stat">{pkg.sessions_remaining}</span>/{pkg.total_sessions} {lang === 'ar' ? 'متبقية' : 'left'}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {lang === 'ar' ? 'صالحة حتى ' : 'Valid until '}{formatDate(pkg.valid_until, locale)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 border-2 border-border p-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {lang === 'ar' ? 'بيع باقة تدريب' : 'Sell PT package'}
                  </p>
                  <div className="space-y-2">
                    <Label>{labels.assigned_trainer}</Label>
                    <Select value={packageTrainerId} onValueChange={setPackageTrainerId} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                      <SelectTrigger><SelectValue placeholder={lang === 'ar' ? 'اختر مدرب...' : 'Select trainer...'} /></SelectTrigger>
                      <SelectContent>
                        {trainers.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">{lang === 'ar' ? 'لا يوجد مدربين نشطين' : 'No active trainers'}</div>
                        ) : trainers.map(trainer => (
                          <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{labels.package_title}</Label>
                    <Input value={packageTitle} onChange={(e) => setPackageTitle(e.target.value)} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{lang === 'ar' ? 'عدد الجلسات' : 'Total sessions'}</Label>
                      <Input type="number" min="1" value={totalSessions} onChange={(e) => setTotalSessions(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{labels.amount_col ?? (lang === 'ar' ? 'المبلغ' : 'Amount')}</Label>
                      <Input type="number" min="0" step="0.01" value={pricePaid} onChange={(e) => setPricePaid(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{lang === 'ar' ? 'تبدأ الباقة' : 'Package starts'}</Label>
                      <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{lang === 'ar' ? 'تنتهي الباقة' : 'Package expires'}</Label>
                      <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="border-2 border-border p-3 space-y-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{lang === 'ar' ? 'ملخص' : 'Summary'}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">{lang === 'ar' ? 'العميل' : 'Client'}</span>
                  <span className="text-foreground font-medium truncate">{selectedMember?.name}</span>
                  <span className="text-muted-foreground">{lang === 'ar' ? 'الباقة' : 'Package'}</span>
                  <span className="text-foreground font-medium truncate">
                    {packageForBooking
                      ? packageForBooking.title
                      : packageTitle.trim() || '—'}
                  </span>
                </div>
              </div>

              <div className="space-y-3 border-2 border-border p-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {lang === 'ar' ? 'الجلسة' : 'Session'}
                </p>
                <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                  <div className="space-y-2">
                    <Label>{lang === 'ar' ? 'تاريخ ووقت الجلسة' : 'Date & time'}</Label>
                    <Input type="datetime-local" min={nowLocalIso()} value={start} onChange={(e) => setStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{labels.duration}</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min="15" step="15" value={duration} onChange={(e) => setDuration(e.target.value)} />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">{lang === 'ar' ? 'دقيقة' : 'min'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{labels.note}</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </div>
          )}
        </div>

        {error && <p className="px-6 text-sm text-destructive">{error}</p>}

        <div className={cn('flex items-center gap-2 px-6 pb-6 pt-2', step === 1 ? 'justify-end' : 'justify-between')}>
          {step > 1 && (
            <Button type="button" variant="outline" onClick={() => goToStep((step - 1) as 1 | 2 | 3)} className="gap-1">
              <ChevronLeft size={16} />
              {lang === 'ar' ? 'التالي' : 'Back'}
            </Button>
          )}

          {step < 3 ? (
            <Button
              type="button"
              onClick={() => goToStep((step + 1) as 2 | 3)}
              disabled={!canGoForward}
              className="gap-1"
            >
              {lang === 'ar' ? 'السابق' : 'Next'}
              <ChevronRight size={16} />
            </Button>
          ) : (
            <Button onClick={handleBook} disabled={saving || !canSubmit} className={cn(saving && 'animate-pulse')}>
              {saving ? (lang === 'ar' ? 'جاري الحجز...' : 'Booking...') : (lang === 'ar' ? 'حجز' : 'Book Session')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
