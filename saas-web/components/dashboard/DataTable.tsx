'use client';

import { ReactNode, useState } from 'react';
import { useLang, t } from '@/lib/i18n';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';

type Column = {
  key: string;
  label: string;
  render?: (row: any) => ReactNode;
  className?: string; // Optional for column-specific styling
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
  const labels = t[lang];

  // Filter rows: check all string fields against search query
  const filtered = searchable && query
    ? data.filter((row) =>
        Object.values(row).some(
          (val) => typeof val === 'string' && val.toLowerCase().includes(query.toLowerCase())
        )
      )
    : data;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      {searchable && (
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.search_placeholder || "Search..."} // Using labels for i18n
          className="max-w-sm"
        />
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyMessage || labels.noData}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row, i) => (
                <TableRow
                  key={row.id || i} // Use row.id if available, otherwise index
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render ? col.render(row) : row[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
