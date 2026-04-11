// Shared PT utilities

export type SessionStatus = 'scheduled' | 'completed' | 'no_show' | 'late_cancel' | 'cancelled';

export function getStatusBadge(status: SessionStatus, lang: string): { label: string; className: string } {
  const labels: Record<SessionStatus, { en: string; ar: string; className: string }> = {
    scheduled:   { en: 'Scheduled',    ar: 'مجدول',        className: 'bg-info/20 text-info border-info/30' },
    completed:   { en: 'Completed',    ar: 'مكتمل',        className: 'bg-success/20 text-success border-success/30' },
    no_show:     { en: 'No-show',      ar: 'لم يحضر',      className: 'bg-warning/20 text-warning border-warning/30' },
    late_cancel: { en: 'Late Cancel',  ar: 'إلغاء متأخر',  className: 'bg-warning/20 text-warning border-warning/30' },
    cancelled:   { en: 'Cancelled',    ar: 'ملغي',         className: 'bg-muted text-muted-foreground border-border' },
  };
  const entry = labels[status];
  return { label: lang === 'ar' ? entry.ar : entry.en, className: entry.className };
}
