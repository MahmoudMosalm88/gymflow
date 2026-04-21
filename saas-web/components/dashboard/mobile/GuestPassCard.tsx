'use client';

import { useLang } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';

type GuestPass = {
  id: string;
  code: string;
  guest_name: string;
  inviter_name?: string;
  phone?: string;
  amount: number;
  status: 'active' | 'used' | 'voided';
};

type Props = {
  pass: GuestPass;
  index: number;
  onTap: () => void;
  formatCurrency: (n: number) => string;
};

export default function GuestPassCard({ pass, index, onTap, formatCurrency }: Props) {
  const { lang } = useLang();

  const statusConfig: Record<string, { classes: string; label: string }> = {
    active: { classes: 'bg-success/20 text-success border-success/30', label: lang === 'ar' ? 'نشط' : 'Active' },
    used: { classes: 'bg-muted text-muted-foreground border-border', label: lang === 'ar' ? 'مستخدم' : 'Used' },
    voided: { classes: 'bg-destructive/20 text-destructive border-destructive/30', label: lang === 'ar' ? 'ملغى' : 'Voided' },
  };
  const sc = statusConfig[pass.status] || statusConfig.active;

  return (
    <button
      className="w-full text-start border-2 border-border bg-card p-4 transition-colors active:bg-foreground/5 animate-card-enter"
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onTap}
    >
      {/* Row 1: Guest name + status */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate flex-1">{pass.guest_name}</span>
        <Badge variant="outline" className={`text-[10px] font-semibold shrink-0 ${sc.classes}`}>
          {sc.label}
        </Badge>
      </div>

      {/* Row 2: Code + inviter */}
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span className="font-mono text-[11px]">{pass.code}</span>
        {pass.inviter_name && (
          <>
            <span className="text-border">|</span>
            <span className="truncate">{lang === 'ar' ? 'بواسطة' : 'By'} {pass.inviter_name}</span>
          </>
        )}
      </div>

      {/* Row 3: Phone + amount */}
      <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground/60">
        {pass.phone && <span dir="ltr">{pass.phone}</span>}
        <span className="ms-auto font-medium text-foreground">{formatCurrency(pass.amount)}</span>
      </div>
    </button>
  );
}
