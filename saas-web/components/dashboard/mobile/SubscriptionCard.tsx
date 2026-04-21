'use client';

import { useLang, t } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';

type Props = {
  sub: {
    id: number | string;
    member_name?: string | null;
    member_id: string;
    start_date: number;
    end_date: number;
    plan_months: number | null;
    price_paid: number | null;
    is_active: boolean;
    freeze_status?: string | null;
  };
  status: string;
  daysLeft: number;
  index: number;
  onTap: () => void;
  formatCurrency: (n: number) => string;
};

export default function SubscriptionCard({ sub, status, daysLeft, index, onTap, formatCurrency }: Props) {
  const { lang } = useLang();
  const labels = t[lang];
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  const fmtDate = (unix: number) =>
    new Date(unix * 1000).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  // Status styling
  const statusConfig: Record<string, { classes: string; label: string }> = {
    active: { classes: 'bg-success/20 text-success border-success/30', label: labels.active },
    pending: { classes: 'bg-info/20 text-info border-info/30', label: lang === 'ar' ? 'قيد الانتظار' : 'Pending' },
    expired: { classes: 'bg-destructive/20 text-destructive border-destructive/30', label: labels.expired },
    inactive: { classes: 'bg-muted text-muted-foreground border-border', label: lang === 'ar' ? 'غير نشط' : 'Inactive' },
  };
  const sc = statusConfig[status] || statusConfig.inactive;

  // Accent border
  const accent =
    status === 'active' ? 'border-s-success/40' :
    daysLeft <= 7 && daysLeft > 0 ? 'border-s-warning' :
    status === 'expired' ? 'border-s-destructive/40' : 'border-s-border';

  return (
    <button
      className={`w-full text-start border-2 border-border bg-card p-4 transition-colors active:bg-foreground/5 ${accent} border-s-[3px] animate-card-enter`}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onTap}
    >
      {/* Row 1: Member name + status */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate flex-1">{sub.member_name || '—'}</span>
        <Badge variant="outline" className={`text-[10px] font-semibold shrink-0 ${sc.classes}`}>
          {sc.label}
        </Badge>
      </div>

      {/* Row 2: Dates + plan */}
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span>{fmtDate(sub.start_date)} → {fmtDate(sub.end_date)}</span>
        {sub.plan_months && (
          <>
            <span className="text-border">|</span>
            <span>{sub.plan_months} {lang === 'ar' ? 'شهر' : 'mo'}</span>
          </>
        )}
      </div>

      {/* Row 3: Price + days left */}
      <div className="flex items-center justify-between mt-1.5 text-[11px]">
        <span className="text-muted-foreground/60">
          {sub.price_paid != null ? formatCurrency(sub.price_paid) : '—'}
        </span>
        {status === 'active' && daysLeft >= 0 && (
          <span className={`font-medium ${daysLeft <= 7 ? 'text-warning' : 'text-muted-foreground/60'}`}>
            {daysLeft} {lang === 'ar' ? 'يوم متبقي' : 'days left'}
          </span>
        )}
        {sub.freeze_status === 'frozen' && (
          <Badge variant="outline" className="text-[9px] border-info/30 text-info bg-info/10 px-1 py-0">
            {lang === 'ar' ? 'مجمّد' : 'Frozen'}
          </Badge>
        )}
      </div>
    </button>
  );
}
