'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface CohortRetentionBarProps {
  data: Array<{ cohortMonth: string; retentionRate: number }>;
  lang: string;
}

type RetentionTooltipPayload = ReadonlyArray<{
  value?: number;
}>;

function BrutalistTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: RetentionTooltipPayload;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value ?? 0;

  return (
    <div
      style={{
        background: '#141414',
        border: '2px solid #333',
        borderRadius: 0,
        padding: '8px 12px',
        color: '#fff',
        fontSize: 13,
      }}
    >
      <p style={{ margin: 0, fontWeight: 700 }}>{label}</p>
      <p style={{ margin: 0 }}>{value.toFixed(1)}%</p>
    </div>
  );
}

export default function CohortRetentionBar({ data, lang }: CohortRetentionBarProps) {
  if (!data?.length) return null;

  const isRtl = lang === 'ar';

  return (
    // dir="ltr" prevents CSS RTL from flipping the SVG — axis positions are swapped manually below
    <div dir="ltr">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
          <CartesianGrid
            vertical={false}
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="cohortMonth"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            interval={0}
            tickLine={false}
            axisLine={false}
            reversed={isRtl}
          />
          <YAxis
            orientation={isRtl ? 'right' : 'left'}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            width={40}
          />
          <Tooltip
            content={<BrutalistTooltip />}
            cursor={{ fill: 'hsl(var(--muted)/0.15)' }}
          />
          <Bar
            dataKey="retentionRate"
            fill="#e63946"
            radius={0}
            name={isRtl ? 'الاحتفاظ' : 'Retention Rate'}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
