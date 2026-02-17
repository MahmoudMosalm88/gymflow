'use client';

type Props = {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string; // tailwind text color class, e.g. "text-green-400"
};

export default function StatCard({ label, value, subtitle, color = 'text-brand' }: Props) {
  return (
    <div className="border-2 border-[#2a2a2a] bg-card p-5 shadow-[6px_6px_0_#000000]">
      {/* Small label on top */}
      <p className="text-sm text-[#8892a8] mb-1">{label}</p>
      {/* Big value */}
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {/* Optional subtitle */}
      {subtitle && <p className="text-xs text-[#8892a8] mt-1">{subtitle}</p>}
    </div>
  );
}
