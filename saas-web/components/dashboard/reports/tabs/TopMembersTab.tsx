'use client';

import { api } from '@/lib/api-client';
import StatCard from '@/components/dashboard/StatCard';
import DataTable from '@/components/dashboard/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

// Gold / silver / bronze colours for top 3 ranks
const RANK_COLORS: Record<number, string> = {
  1: '#FFD700', // gold
  2: '#C0C0C0', // silver
  3: '#CD7F32', // bronze
};

interface TopMembersTabProps {
  data: any;
  lang: string;
  labels: any;
}

export default function TopMembersTab({ data, lang, labels }: TopMembersTabProps) {
  // data is an array of member objects (rank added by parent via index)
  const rows = Array.isArray(data)
    ? data.map((m: any, i: number) => ({ ...m, rank: i + 1 }))
    : [];

  if (!rows.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {lang === 'ar' ? 'لا توجد زيارات بعد.' : 'No visits yet.'}
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.top_members}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={[
            {
              key: 'rank',
              label: labels.rank,
              render: (row: any) => {
                const color = RANK_COLORS[row.rank];
                return color ? (
                  // Coloured badge for top 3
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 font-bold text-sm border-2"
                    style={{ borderColor: color, color }}
                  >
                    {row.rank}
                  </span>
                ) : (
                  // Plain number for everyone else
                  <span className="text-muted-foreground">{row.rank}</span>
                );
              },
            },
            { key: 'name',   label: labels.name },
            { key: 'visits', label: labels.visits },
          ]}
          data={rows}
        />
      </CardContent>
    </Card>
  );
}
