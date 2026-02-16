'use client';

import { ReactNode, useState } from 'react';
import { useLang, t } from '@/lib/i18n';

type Column = {
  key: string;
  label: string;
  render?: (row: any) => ReactNode;
};

type Props = {
  columns: Column[];
  data: any[];
  searchable?: boolean;
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
};

export default function DataTable({ columns, data, searchable, onRowClick, emptyMessage }: Props) {
  const { lang } = useLang();
  const [query, setQuery] = useState('');

  // Filter rows: check all string fields against search query
  const filtered = searchable && query
    ? data.filter((row) =>
        Object.values(row).some(
          (val) => typeof val === 'string' && val.toLowerCase().includes(query.toLowerCase())
        )
      )
    : data;

  return (
    <div>
      {/* Search bar */}
      {searchable && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t[lang].search}
          className="mb-4 w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-[#f3f6ff] placeholder-[#8892a8] outline-none focus:border-brand"
        />
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm text-[#f3f6ff]">
          <thead>
            <tr className="border-b border-border bg-surface-elevated">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-left font-medium text-[#8892a8]">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-[#8892a8]">
                  {emptyMessage || t[lang].noData}
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-border transition-colors hover:bg-surface-elevated ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.render ? col.render(row) : row[col.key]}
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
