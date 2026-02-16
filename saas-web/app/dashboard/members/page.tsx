'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import DataTable from '@/components/dashboard/DataTable';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import Modal from '@/components/dashboard/Modal';

type Member = {
  id: string;
  name: string;
  phone: string;
  gender: 'male' | 'female';
  card_code?: string;
  created_at: number;
};

export default function MembersPage() {
  const router = useRouter();
  const { lang } = useLang();
  const labels = t[lang];

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** Fetch members from API, optionally filtered by search query */
  const fetchMembers = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const url = q ? `/api/members?q=${encodeURIComponent(q)}` : '/api/members';
      const res = await api.get<Member[]>(url);
      setMembers(res.data ?? []);
    } catch {
      // silently fail — table will show "no data"
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Re-fetch when search changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => fetchMembers(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchMembers]);

  /** Soft-delete a member after confirmation */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete('/api/members', { id: deleteTarget.id });
      // Remove from local list so the table updates instantly
      setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // keep modal open on error so user can retry
    } finally {
      setDeleting(false);
    }
  };

  // Table column definitions
  const columns = [
    { key: 'name', label: labels.name },
    { key: 'phone', label: labels.phone },
    {
      key: 'gender',
      label: labels.gender,
      render: (row: Member) => (row.gender === 'male' ? labels.male : labels.female),
    },
    { key: 'card_code', label: lang === 'ar' ? 'رمز البطاقة' : 'Card Code' },
    {
      key: 'created_at',
      label: labels.date,
      render: (row: Member) => formatDate(row.created_at, lang === 'ar' ? 'ar-EG' : 'en-US'),
    },
    {
      key: '_actions',
      label: labels.actions,
      render: (row: Member) => (
        <button
          onClick={(e) => {
            e.stopPropagation(); // prevent row click navigation
            setDeleteTarget(row);
          }}
          className="rounded px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-500/10"
        >
          {labels.delete}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header row: title + add button */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#f3f6ff]">{labels.members}</h1>
        <button
          onClick={() => router.push('/dashboard/members/new')}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          + {lang === 'ar' ? 'إضافة عضو' : 'Add Member'}
        </button>
      </div>

      {/* Search bar — server-side search via API */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={labels.search}
        className="w-full rounded-lg border border-border bg-surface-card px-3 py-2 text-sm text-[#f3f6ff] placeholder-[#8892a8] outline-none focus:border-brand"
      />

      {/* Members table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          columns={columns}
          data={members}
          onRowClick={(row) => router.push(`/dashboard/members/${row.id}`)}
        />
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`${labels.delete} ${deleteTarget?.name ?? ''}?`}
      >
        <p className="mb-4 text-sm text-[#8892a8]">
          {lang === 'ar'
            ? 'هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.'
            : 'Are you sure? This action cannot be undone.'}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {deleting ? labels.loading : labels.delete}
          </button>
          <button
            onClick={() => setDeleteTarget(null)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-[#8892a8] transition-colors hover:text-[#f3f6ff]"
          >
            {labels.cancel}
          </button>
        </div>
      </Modal>
    </div>
  );
}
