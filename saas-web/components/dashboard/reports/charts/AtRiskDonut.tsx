'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface AtRiskDonutProps {
  high: number;
  medium: number;
  low: number;
  lang: string;
}

// Custom brutalist tooltip — dark bg, square border, no border-radius
function BrutalistTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
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
      <p style={{ margin: 0, fontWeight: 700 }}>{payload[0].name}</p>
      <p style={{ margin: 0 }}>{payload[0].value}</p>
    </div>
  );
}

export default function AtRiskDonut({ high, medium, low, lang }: AtRiskDonutProps) {
  const total = high + medium + low;

  // Chart data — only include non-zero segments
  const rawData = [
    { name: lang === 'ar' ? 'خطر مرتفع'  : 'High Risk',   value: high,   color: '#e63946' },
    { name: lang === 'ar' ? 'خطر متوسط'  : 'Medium Risk', value: medium, color: '#f59e0b' },
    { name: lang === 'ar' ? 'خطر منخفض'  : 'Low Risk',    value: low,    color: '#666'    },
  ].filter(d => d.value > 0);

  // Fallback when all counts are zero
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
        {lang === 'ar' ? 'لا بيانات' : 'No data'}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* dir="ltr" prevents CSS RTL from mirroring the SVG coordinate system */}
      <div dir="ltr">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={rawData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            paddingAngle={2}
            strokeWidth={0}
          >
            {rawData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<BrutalistTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      </div>

      {/* Center label showing total */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{ top: 0 }}
      >
        <span className="font-stat text-3xl text-foreground">{total}</span>
        <span className="text-xs text-muted-foreground">
          {lang === 'ar' ? 'في خطر' : 'at risk'}
        </span>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-2 flex-wrap">
        {rawData.map(d => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-muted-foreground">{d.name} ({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
