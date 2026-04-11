'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import StatCard from '@/components/dashboard/StatCard';
import AvailabilityGrid from './AvailabilityGrid';
import TrainerClientsList from './TrainerClientsList';

type Trainer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  is_active: boolean;
  gender?: string | null;
  specialties?: string[];
  certifications?: string[];
  bio?: string | null;
  photo_path?: string | null;
  beginner_friendly?: boolean;
  languages?: string[];
};

type AvailabilitySlot = {
  weekday: number;
  start_minute: number;
  end_minute: number;
  is_active: boolean;
};

type TrainerStats = {
  sessions_completed: number;
  sessions_no_show: number;
  sessions_scheduled: number;
  active_clients: number;
  active_packages: number;
  total_revenue: string;
};

type Client = {
  id: string;
  name: string;
  phone?: string | null;
  active_packages: number;
  sessions_remaining: number;
};

type Props = {
  trainer: Trainer | null;
  open: boolean;
  onClose: () => void;
};

export default function TrainerDetailSheet({ trainer, open, onClose }: Props) {
  const { lang } = useLang();
  const labels = t[lang];
  const [stats, setStats] = useState<TrainerStats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !trainer) {
      setStats(null);
      setClients([]);
      setAvailability([]);
      setLoading(true);
      return;
    }

    let cancelled = false;
    Promise.all([
      api.get<TrainerStats>(`/api/trainers/${trainer.id}/stats?days=30`),
      api.get<Client[]>(`/api/trainers/${trainer.id}/clients`),
      api.get<{ slots: AvailabilitySlot[] }>(`/api/trainers/${trainer.id}/availability`),
    ]).then(([statsRes, clientsRes, availRes]) => {
      if (cancelled) return;
      setStats(statsRes.data ?? null);
      setClients(clientsRes.data ?? []);
      setAvailability(availRes.data?.slots ?? []);
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, trainer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!trainer) return null;

  const specialties = trainer.specialties ?? [];
  const certifications = trainer.certifications ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{trainer.name}</DialogTitle>
        </DialogHeader>

        {/* ── Profile header ── */}
        <div className="flex items-start gap-4">
          {trainer.photo_path ? (
            <img src={trainer.photo_path} alt={trainer.name} className="h-16 w-16 object-cover border-2 border-border shrink-0" />
          ) : (
            <div className="h-16 w-16 border-2 border-border bg-secondary flex items-center justify-center shrink-0">
              <span className="font-stat text-2xl text-muted-foreground">
                {trainer.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">{trainer.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-block w-2 h-2 rounded-full ${trainer.is_active ? 'bg-success' : 'bg-muted-foreground/40'}`} />
              <span className="text-xs text-muted-foreground">
                {trainer.is_active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'غير نشط' : 'Inactive')}
              </span>
              {trainer.beginner_friendly && (
                <Badge variant="outline" className="text-[10px] border-success/30 text-success">
                  {lang === 'ar' ? 'مناسب للمبتدئين' : 'Beginner Friendly'}
                </Badge>
              )}
            </div>
            {trainer.phone && <p className="text-xs text-muted-foreground mt-1">{trainer.phone}</p>}
          </div>
        </div>

        {/* ── Tags ── */}
        {(specialties.length > 0 || certifications.length > 0) && (
          <div className="space-y-2">
            {specialties.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{labels.trainer_specialties}</p>
                <div className="flex flex-wrap gap-1">
                  {specialties.map(s => (
                    <Badge key={s} variant="outline" className="text-[10px] border-border">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {certifications.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{labels.trainer_certifications}</p>
                <div className="flex flex-wrap gap-1">
                  {certifications.map(c => (
                    <Badge key={c} variant="outline" className="text-[10px] border-border">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Bio ── */}
        {trainer.bio && (
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{labels.trainer_bio}</p>
            <p className="text-sm text-foreground leading-relaxed">{trainer.bio}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><LoadingSpinner /></div>
        ) : (
          <>
            {/* ── Stats ── */}
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <StatCard label={lang === 'ar' ? 'جلسات مكتملة' : 'Completed'} value={stats.sessions_completed} valueSize="text-2xl" color="text-success" />
                <StatCard label={lang === 'ar' ? 'لم يحضر' : 'No-shows'} value={stats.sessions_no_show} valueSize="text-2xl" color={stats.sessions_no_show > 0 ? 'text-warning' : 'text-foreground'} />
                <StatCard label={labels.active_clients} value={stats.active_clients} valueSize="text-2xl" />
                <StatCard label={lang === 'ar' ? 'الإيراد (٣٠ يوم)' : 'Revenue (30d)'} value={formatCurrency(Number(stats.total_revenue))} valueSize="text-xl" color="text-success" />
              </div>
            )}

            {/* ── Availability ── */}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{labels.trainer_availability}</p>
              <AvailabilityGrid slots={availability} lang={lang} />
            </div>

            {/* ── Clients ── */}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                {labels.trainer_clients} ({clients.length})
              </p>
              <TrainerClientsList clients={clients} lang={lang} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
