'use client';

import { Badge } from '@/components/ui/badge';
import type { TrainerProfileRow, TrainerRosterStatRow } from '@/lib/trainers';

type Props = {
  trainer: TrainerProfileRow;
  stats?: Pick<TrainerRosterStatRow, 'active_clients' | 'sessions_this_month'>;
  lang: string;
  onClick?: () => void;
};

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

export default function TrainerCard({ trainer, stats, lang, onClick }: Props) {
  const specialties = trainer.specialties ?? [];

  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-3 border-2 border-border bg-card p-4 shadow-[6px_6px_0_#000000] text-start transition-colors hover:border-destructive/40 hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive w-full"
    >
      {/* Header: avatar + name + status */}
      <div className="flex items-center gap-3">
        {trainer.photo_path ? (
          <img
            src={trainer.photo_path}
            alt={trainer.name}
            className="h-12 w-12 object-cover border-2 border-border shrink-0"
          />
        ) : (
          <div className="h-12 w-12 border-2 border-border bg-secondary flex items-center justify-center shrink-0">
            <span className="font-stat text-lg text-muted-foreground">{getInitials(trainer.name)}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{trainer.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${trainer.is_active ? 'bg-success' : 'bg-muted-foreground/40'}`} />
            <span className="text-[11px] text-muted-foreground">
              {trainer.is_active
                ? (lang === 'ar' ? 'نشط' : 'Active')
                : (lang === 'ar' ? 'غير نشط' : 'Inactive')}
            </span>
          </div>
        </div>
      </div>

      {/* Specialty tags */}
      {specialties.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {specialties.slice(0, 3).map(s => (
            <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
              {s}
            </Badge>
          ))}
          {specialties.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{specialties.length - 3}</span>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-auto pt-2 border-t border-border">
        <div>
          <span className="font-stat text-base text-foreground">{stats?.active_clients ?? 0}</span>
          <span className="ms-1">{lang === 'ar' ? 'عملاء' : 'clients'}</span>
        </div>
        <div>
          <span className="font-stat text-base text-foreground">{stats?.sessions_this_month ?? 0}</span>
          <span className="ms-1">{lang === 'ar' ? 'جلسة' : 'sessions'}</span>
        </div>
      </div>
    </button>
  );
}
