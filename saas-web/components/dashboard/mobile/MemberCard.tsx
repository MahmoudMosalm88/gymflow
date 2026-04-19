'use client';

import { useRouter } from 'next/navigation';
import { useLang, t } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';

type Member = {
  id: string;
  name: string;
  phone: string;
  sub_status: 'active' | 'expired' | 'no_sub';
  trainer_name?: string | null;
  created_at: number;
  sync_status?: string;
};

type Props = {
  member: Member;
  index: number;
};

export default function MemberCard({ member, index }: Props) {
  const router = useRouter();
  const { lang } = useLang();
  const labels = t[lang];

  const statusClasses =
    member.sub_status === 'active'
      ? 'bg-success/20 text-success border-success/30'
      : member.sub_status === 'expired'
      ? 'bg-destructive/20 text-destructive border-destructive/30'
      : 'bg-muted text-muted-foreground border-border';

  const statusLabel =
    member.sub_status === 'active'
      ? labels.active
      : member.sub_status === 'expired'
      ? labels.expired
      : labels.no_sub;

  // Left accent color based on status
  const accentBorder =
    member.sub_status === 'no_sub'
      ? 'border-s-warning'
      : member.sub_status === 'expired'
      ? 'border-s-destructive/40'
      : 'border-s-success/40';

  return (
    <button
      className={`w-full text-start border-2 border-border bg-card p-4 transition-colors active:bg-foreground/5 ${accentBorder} border-s-[3px] animate-card-enter`}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={() => router.push(`/dashboard/members/${member.id}`)}
    >
      {/* Row 1: Name + status badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate flex-1">{member.name}</span>
        <Badge variant="outline" className={`text-[10px] font-semibold shrink-0 ${statusClasses}`}>
          {statusLabel}
        </Badge>
      </div>

      {/* Row 2: Phone + trainer */}
      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        <span dir="ltr">{member.phone}</span>
        {member.trainer_name && (
          <>
            <span className="text-border">|</span>
            <span className="truncate">{member.trainer_name}</span>
          </>
        )}
      </div>

      {/* Row 3: Join date + sync status */}
      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground/60">
        <span>{formatDate(member.created_at, lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
        {member.sync_status && member.sync_status !== 'synced' && (
          <Badge variant="outline" className="text-[9px] border-warning/30 text-warning bg-warning/10 px-1 py-0">
            {lang === 'ar' ? 'بانتظار المزامنة' : 'Pending sync'}
          </Badge>
        )}
      </div>
    </button>
  );
}
