'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import AddMemberModal from '@/components/dashboard/AddMemberModal';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';

type Member = {
  id: string;
  name: string;
  phone: string;
  gender: 'male' | 'female';
  card_code?: string;
  created_at: number;
  sub_status: 'active' | 'expired' | 'no_sub';
};

export default function MembersPage() {
  const router = useRouter();
  const { lang } = useLang();
  const labels = t[lang];

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'no_sub'>('all');

  // Add member modal state
  const [addOpen, setAddOpen] = useState(false);

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
      setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // keep modal open on error so user can retry
    } finally {
      setDeleting(false);
    }
  };

  // Client-side status filter
  const filtered = statusFilter === 'all'
    ? members
    : members.filter((m) => m.sub_status === statusFilter);

  // Column definitions
  const columns = [
    { key: 'name',       label: labels.name,     className: 'w-[150px]' },
    { key: 'sub_status', label: labels.status,   className: '' },
    { key: 'phone',      label: labels.phone,    className: 'hidden sm:table-cell' },
    { key: 'gender',     label: labels.gender,   className: 'hidden md:table-cell' },
    { key: 'card_code',  label: labels.card_code, className: 'hidden lg:table-cell' },
    { key: 'created_at', label: labels.date,     className: 'hidden lg:table-cell' },
    { key: '_actions',   label: labels.actions,  className: 'w-[50px] text-end' },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header row: title + add button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{labels.members}</h1>
        <Button onClick={() => setAddOpen(true)} className="text-base">
          + {labels.add_member}
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-3">
        <Input
          type="text"
          placeholder={labels.search_members}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{labels.all_statuses}</SelectItem>
            <SelectItem value="active">{labels.active}</SelectItem>
            <SelectItem value="expired">{labels.expired}</SelectItem>
            <SelectItem value="no_sub">{labels.no_sub}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members table */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="border-2 border-border">
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
              {filtered.length > 0 ? (
                filtered.map((member) => (
                  <TableRow
                    key={member.id}
                    onClick={() => router.push(`/dashboard/members/${member.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-0.5 border ${
                        member.sub_status === 'active'
                          ? 'border-success/30 text-success bg-success/10'
                          : member.sub_status === 'expired'
                          ? 'border-destructive/30 text-destructive bg-destructive/10'
                          : 'border-border text-muted-foreground bg-transparent'
                      }`}>
                        {member.sub_status === 'active'
                          ? labels.active
                          : member.sub_status === 'expired'
                          ? labels.expired
                          : labels.no_sub}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell" dir="ltr">{member.phone}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {member.gender === 'male' ? labels.male : labels.female}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{member.card_code}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatDate(member.created_at, lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </TableCell>
                    <TableCell className="text-end">
                      <DropdownMenu dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">{labels.open_menu}</span>
                            <DotsHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={lang === 'ar' ? 'start' : 'end'}>
                          <DropdownMenuLabel>{labels.actions}</DropdownMenuLabel>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/members/${member.id}`);
                          }}>
                            {labels.view}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/members/${member.id}/edit`);
                          }}>
                            {labels.edit}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(member);
                          }}>
                            {labels.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {labels.no_members_found}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add member modal */}
      <AddMemberModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => fetchMembers(search || undefined)}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.delete_member_confirm.replace('{name}', deleteTarget?.name ?? '')}</DialogTitle>
            <DialogDescription>{labels.delete_member_undo}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {labels.cancel}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? labels.deleting : labels.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
