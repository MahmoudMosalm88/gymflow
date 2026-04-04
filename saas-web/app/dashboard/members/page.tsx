'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { useAuth } from '@/lib/use-auth';
import { formatDate } from '@/lib/format';
import { getCachedMembers } from '@/lib/offline/read-model';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';

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

// Keep the add-member form out of the list bundle until staff actually open it.
const AddMemberModal = dynamic(() => import('@/components/dashboard/AddMemberModal'));

type Member = {
  id: string;
  name: string;
  phone: string;
  gender: 'male' | 'female';
  card_code?: string | null;
  created_at: number;
  sub_status: 'active' | 'expired' | 'no_sub';
  trainer_name?: string | null;
  sync_status?: string;
};

export default function MembersPage() {
  const router = useRouter();
  const { lang } = useLang();
  const { profile } = useAuth();
  const labels = t[lang];
  const isTrainer = profile?.role === 'trainer';

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'no_sub'>('all');
  const hasMountedSearch = useRef(false);

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
      if (res.data) {
        setMembers(res.data);
      } else {
        try {
      setMembers((await getCachedMembers(q || '')) as Member[]);
        } catch {
          // silently fail — table will show "no data"
        }
      }
    } catch {
      try {
        setMembers(await getCachedMembers(q || ''));
      } catch {
        // silently fail — table will show "no data"
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    if (!navigator.onLine || members.length === 0 || typeof caches === 'undefined') return;

    const visibleMembers = members.slice(0, 25);
    const routes = visibleMembers.flatMap((member) =>
      isTrainer
        ? [`/dashboard/members/${member.id}`]
        : [`/dashboard/members/${member.id}`, `/dashboard/members/${member.id}/edit`]
    );

    routes.forEach((route) => {
      router.prefetch(route);
    });

    void (async () => {
      try {
        const cache = await caches.open('gymflow-shell-v3');
        await Promise.all(routes.map(async (route) => {
          try {
            const response = await fetch(route, {
              cache: 'no-store',
              credentials: 'same-origin',
              headers: { accept: 'text/html' },
            });
            if (response.ok) {
              await cache.put(route, response.clone());
            }
          } catch {
            // Ignore individual route warm failures.
          }
        }));
      } catch {
        // Ignore cache warm failures.
      }
    })();
  }, [isTrainer, members, router]);

  // Re-fetch when search changes (with debounce)
  useEffect(() => {
    // Skip the first run because the initial load already fetched the list.
    if (!hasMountedSearch.current) {
      hasMountedSearch.current = true;
      return;
    }

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
    { key: 'trainer_name', label: lang === 'ar' ? 'المدرب' : 'Trainer', className: 'hidden md:table-cell' },
    { key: 'gender',     label: labels.gender,   className: 'hidden md:table-cell' },
    { key: 'card_code',  label: labels.card_code, className: 'hidden lg:table-cell' },
    { key: 'created_at', label: labels.date,     className: 'hidden lg:table-cell' },
    { key: '_actions',   label: labels.actions,  className: 'w-[50px] text-end' },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      {/* Header row: title + add button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{isTrainer ? (lang === 'ar' ? 'عملائي' : 'My Clients') : labels.members}</h1>
        {!isTrainer ? (
          <Button onClick={() => setAddOpen(true)} className="text-base">
            + {labels.add_member}
          </Button>
        ) : null}
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
                      {member.sync_status && member.sync_status !== 'synced' ? (
                        <span className="ms-2 inline-block text-[10px] font-semibold px-1.5 py-0.5 border border-warning/30 text-warning bg-warning/10">
                          {lang === 'ar' ? 'بانتظار المزامنة' : 'Pending sync'}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell" dir="ltr">{member.phone}</TableCell>
                    <TableCell className="hidden md:table-cell">{member.trainer_name || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {member.gender === 'male' ? labels.male : labels.female}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{member.card_code}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatDate(member.created_at, lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </TableCell>
                    <TableCell className="text-end">
                      {!isTrainer ? (
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
                      ) : null}
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
      {!isTrainer && addOpen ? (
        <AddMemberModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onSuccess={() => fetchMembers(search || undefined)}
        />
      ) : null}

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
