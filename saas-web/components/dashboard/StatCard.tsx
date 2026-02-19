'use client';

import { useLang } from '@/lib/i18n';

type Props = {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  valueSize?: string; // override value font size, e.g. "text-2xl"
};

export default function StatCard({ label, value, subtitle, color = 'text-brand', valueSize = 'text-4xl' }: Props) {
  const { lang } = useLang();
  const isRtl = lang === 'ar';

  return (
    <div className="flex flex-col justify-between border-2 border-[#2a2a2a] bg-card p-4 min-h-[100px] shadow-[6px_6px_0_#000000]">
      {/* Label — top-left (EN) or top-right (AR) */}
      <p className="text-xs text-[#8892a8]" style={{ textAlign: isRtl ? 'right' : 'left' }}>
        {label}
      </p>
      {/* Value — bottom-right (EN) or bottom-left (AR) */}
      <div className="flex flex-col" style={{ alignItems: isRtl ? 'flex-start' : 'flex-end' }}>
        <p className={`font-stat ${valueSize} leading-none tracking-wide ${color}`}>{value}</p>
        {subtitle && <p className="text-xs text-[#8892a8] mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}
