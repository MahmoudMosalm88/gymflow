'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/lib/use-auth';
import { useLang, t } from '@/lib/i18n';
import { formatDate, formatDateTime } from '@/lib/format';
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
import { Plus } from 'lucide-react';
import type { PtPackageViewRow, PtSessionStatus, PtSessionViewRow } from '@/lib/pt';
import type { TrainerProfileRow } from '@/lib/trainers';

// ── Types ──

type ConfirmAction = {
  sessionId: string;
  status: PtSessionStatus;
  label: string;
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

  // Data
  const [sessions, setSessions] = useState<PtSessionViewRow[]>([]);
  const [packages, setPackages] = useState<PtPackageViewRow[]>([]);
  const [trainers, setTrainers] = useState<TrainerProfileRow[]>([]);
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
  }, [profile?.id, profile?.role]); // eslint-disable-line react-hooks/exhaustive-deps

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
      await api.patch(`/api/pt/sessions/${id}`, { status });
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
      await api.patch(`/api/pt/sessions/${editSession.id}`, {
        scheduled_start: new Date(editStart).toISOString(),
        duration_minutes: Number(editDuration || 60),
        notes: editNotes || null,
        status: 'scheduled',
      });
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
      {!isTrainer && (
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

function BookSessionDialog({ open, onClose, trainers, packages, lang, labels, onBooked }: {
  open: boolean;
  onClose: () => void;
  trainers: TrainerProfileRow[];
  packages: PtPackageViewRow[];
  lang: string;
  labels: Record<string, string>;
  onBooked: () => void;
}) {
  const [packageId, setPackageId] = useState('');
  const [start, setStart] = useState('');
  const [duration, setDuration] = useState('60');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const scopeRef = useRef<HTMLDivElement | null>(null);

  // Derive member/trainer from selected package
  const selectedPkg = packages.find(p => p.id === packageId);

  useEffect(() => {
    if (open) {
      setPackageId('');
      setStart(nowLocalIso());
      setDuration('60');
      setNotes('');
      setError('');
    }
  }, [open]);

  async function handleBook() {
    if (!selectedPkg || !start) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/api/pt/sessions', {
        package_id: selectedPkg.id,
        member_id: selectedPkg.member_id,
        trainer_staff_user_id: selectedPkg.assigned_trainer_staff_user_id,
        scheduled_start: new Date(start).toISOString(),
        duration_minutes: Number(duration || 60),
        notes: notes || null,
      });
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
    disabled: saving || !packageId || !start,
    enterMode: 'all',
  });

  // Group packages by trainer for easier selection
  const pkgOptions = packages.map(p => ({
    id: p.id,
    label: `${p.member_name || '?'} — ${p.title} (${p.sessions_remaining}/${p.total_sessions})`,
    trainer: p.trainer_name || '',
  }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lang === 'ar' ? 'حجز جلسة جديدة' : 'Book New Session'}</DialogTitle>
        </DialogHeader>
        <div ref={scopeRef} className="space-y-4">
          {/* Package selector — shows member + package + remaining */}
          <div className="space-y-2">
            <Label>{lang === 'ar' ? 'الباقة' : 'Package'}</Label>
            <Select value={packageId} onValueChange={setPackageId} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              <SelectTrigger>
                <SelectValue placeholder={lang === 'ar' ? 'اختر باقة...' : 'Select package...'} />
              </SelectTrigger>
              <SelectContent>
                {pkgOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد باقات نشطة' : 'No active packages'}</div>
                ) : (
                  pkgOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>
                      <span className="text-sm">{opt.label}</span>
                      {opt.trainer && <span className="text-xs text-muted-foreground ms-2">({opt.trainer})</span>}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedPkg && (
            <div className="text-xs text-muted-foreground border-s-2 border-info/40 ps-3">
              {lang === 'ar' ? 'العميل: ' : 'Client: '}{selectedPkg.member_name}
              {' · '}
              {lang === 'ar' ? 'المدرب: ' : 'Trainer: '}{selectedPkg.trainer_name}
              {' · '}
              {selectedPkg.sessions_remaining} {lang === 'ar' ? 'جلسات متبقية' : 'sessions left'}
            </div>
          )}

          <div className="space-y-2">
            <Label>{lang === 'ar' ? 'الموعد' : 'Date & Time'}</Label>
            <Input type="datetime-local" min={nowLocalIso()} value={start} onChange={(e) => setStart(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{labels.duration}</Label>
            <div className="flex items-center gap-2">
              <Input type="number" min="15" step="15" value={duration} onChange={(e) => setDuration(e.target.value)} />
              <span className="text-sm text-muted-foreground whitespace-nowrap">{lang === 'ar' ? 'دقيقة' : 'min'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{labels.note}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{labels.cancel}</Button>
            <Button onClick={handleBook} disabled={saving || !packageId || !start}>
              {saving ? (lang === 'ar' ? 'جاري الحجز...' : 'Booking...') : (lang === 'ar' ? 'حجز' : 'Book')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
