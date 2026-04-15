'use client';

import { ReactNode, useState } from 'react';
import { useLang, t } from '@/lib/i18n';
import { Input } from '@/components/ui/input';

type Column<T extends Record<string, unknown>> = {
  key: keyof T & string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

type Props<T extends Record<string, unknown>> = {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
};

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  searchable,
  onRowClick,
  emptyMessage,
}: Props<T>) {
  const { lang } = useLang();
  const [query, setQuery] = useState('');
  const labels = t[lang];
  const isRtl = lang === 'ar';

  const filtered = searchable && query
    ? data.filter((row) =>
        Object.values(row).some(
          (val) => typeof val === 'string' && val.toLowerCase().includes(query.toLowerCase())
        )
      )
    : data;

  return (
    <div className="space-y-4">
      {searchable && (
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.search_placeholder || 'Search...'}
          className="max-w-sm"
        />
      )}

      <div className="border-2 border-[#2a2a2a] overflow-x-auto">
        <table className="w-full text-sm" dir={isRtl ? 'rtl' : 'ltr'}>

          {/* Header — dark sidebar background, uppercase muted labels */}
          <thead>
            <tr className="bg-[#0a0a0a] border-b-2 border-[#2a2a2a]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#8a8578] ${isRtl ? 'text-right' : 'text-left'} ${col.className || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 text-center text-[#8a8578] bg-[#1e1e1e]"
                >
                  {emptyMessage || labels.noData}
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
              <tr
                  key={(() => {
                    const id = (row as { id?: string | number }).id;
                    return id !== undefined ? String(id) : i;
                  })()}
                  onClick={() => onRowClick?.(row)}
                  className={[
                    'border-b border-[#2a2a2a] transition-colors',
                    i % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#141414]',
                    onRowClick ? 'cursor-pointer hover:bg-[#2a2a2a]' : 'hover:bg-[#222222]',
                  ].join(' ')}
                >
                  {columns.map((col) => (
                  <td
                      key={col.key}
                      className={`px-4 py-3 text-[#e8e4df] tabular-nums ${col.className || ''}`}
                    >
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

        </table>
      </div>
    </div>
  );
}
