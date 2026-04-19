'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, useTransform, useAnimationControls, type PanInfo } from 'framer-motion';
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

const ACTION_WIDTH = 160; // total width of revealed action area
const SNAP_THRESHOLD = 60; // how far to drag before actions snap open

export default function SwipeableMemberCard({ member, index }: Props) {
  const router = useRouter();
  const { lang } = useLang();
  const labels = t[lang];
  const isRtl = lang === 'ar';
  const hasFiredHaptic = useRef(false);

  const x = useMotionValue(0);
  const controls = useAnimationControls();

  // One-time swipe hint on the first card only
  useEffect(() => {
    if (index !== 0) return;
    if (localStorage.getItem('gymflow_swipe_hint_shown')) return;

    const timer = setTimeout(async () => {
      // Peek in the swipe direction to reveal the action buttons, then snap back
      const peekX = isRtl ? 60 : -60;
      await controls.start({ x: peekX, transition: { duration: 0.4, ease: 'easeOut' } });
      await controls.start({ x: 0, transition: { duration: 0.3, ease: 'easeInOut' } });
      localStorage.setItem('gymflow_swipe_hint_shown', '1');
    }, 2000);

    return () => clearTimeout(timer);
  }, [index, isRtl, controls]);

  // Action button opacity — fades in as card drags
  const actionOpacity = useTransform(x, isRtl ? [0, SNAP_THRESHOLD] : [-SNAP_THRESHOLD, 0], [1, 0]);

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

  const accentBorder =
    member.sub_status === 'no_sub'
      ? 'border-s-warning'
      : member.sub_status === 'expired'
      ? 'border-s-destructive/40'
      : 'border-s-success/40';

  const handleDrag = (_: unknown, info: PanInfo) => {
    // Haptic feedback when crossing the snap threshold
    const dist = Math.abs(info.offset.x);
    if (dist >= SNAP_THRESHOLD && !hasFiredHaptic.current) {
      hasFiredHaptic.current = true;
      if (navigator.vibrate) navigator.vibrate(10);
    }
    if (dist < SNAP_THRESHOLD) {
      hasFiredHaptic.current = false;
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    hasFiredHaptic.current = false;
    const threshold = SNAP_THRESHOLD;

    // In RTL: swipe right reveals actions. In LTR: swipe left reveals actions.
    if (isRtl) {
      if (info.offset.x > threshold) {
        x.set(ACTION_WIDTH);
      } else {
        x.set(0);
      }
    } else {
      if (info.offset.x < -threshold) {
        x.set(-ACTION_WIDTH);
      } else {
        x.set(0);
      }
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = member.phone.replace(/[^0-9+]/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
    x.set(0);
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`tel:${member.phone}`, '_self');
    x.set(0);
  };

  return (
    <div
      className="relative overflow-hidden animate-card-enter"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Action buttons revealed behind the card */}
      <motion.div
        className={`absolute top-0 bottom-0 flex ${isRtl ? 'start-0' : 'end-0'}`}
        style={{ opacity: actionOpacity, width: ACTION_WIDTH }}
      >
        {/* WhatsApp button */}
        <button
          onClick={handleWhatsApp}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-success text-white text-xs font-medium"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.11-1.14L4 20l1.14-3.89A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
          </svg>
          WhatsApp
        </button>
        {/* Call button */}
        <button
          onClick={handleCall}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-info text-white text-xs font-medium"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
          </svg>
          {lang === 'ar' ? 'اتصال' : 'Call'}
        </button>
      </motion.div>

      {/* Swipeable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: isRtl ? 0 : -ACTION_WIDTH, right: isRtl ? ACTION_WIDTH : 0 }}
        dragElastic={0.1}
        style={{ x }}
        animate={controls}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        dragDirectionLock
        className={`relative z-10 border-2 border-border bg-card p-4 transition-shadow active:shadow-none cursor-grab active:cursor-grabbing ${accentBorder} border-s-[3px]`}
        onClick={() => {
          // Only navigate if not swiped open
          if (Math.abs(x.get()) < 5) {
            router.push(`/dashboard/members/${member.id}`);
          } else {
            // Close the swipe
            x.set(0);
          }
        }}
      >
        {/* Row 1: Name + status */}
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

        {/* Row 3: Join date */}
        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground/60">
          <span>{formatDate(member.created_at, lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
          {member.sync_status && member.sync_status !== 'synced' && (
            <Badge variant="outline" className="text-[9px] border-warning/30 text-warning bg-warning/10 px-1 py-0">
              {lang === 'ar' ? 'بانتظار المزامنة' : 'Pending sync'}
            </Badge>
          )}
        </div>
      </motion.div>
    </div>
  );
}
