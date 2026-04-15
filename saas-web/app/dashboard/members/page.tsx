'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { useAuth } from '@/lib/use-auth';
import { formatDate } from '@/lib/format';
import { getCachedMembers } from '@/lib/offline/read-model';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import StatCard from '@/components/dashboard/StatCard';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { toast } from 'sonner';

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

// Strings moved out of JSX so they're easy to find and update in one place.
const copy = {
  en: {
    delete_error: 'Failed to delete member',
    trainer_col: 'Trainer',
    my_clients: 'My Clients',
    pending_sync: 'Pending sync',
    total_members: 'Total Members',
    active_members: 'Active',
    no_sub_members: 'No Subscription',
    gender_all: 'All',
    gender_male: 'Male',
    gender_female: 'Female',
    clear_filters: 'Clear filters',
  },
  ar: {
    delete_error: 'فشل حذف العضو',
    trainer_col: 'المدرب',
    my_clients: 'عملائي',
    pending_sync: 'بانتظار المزامنة',
    total_members: 'إجمالي الأعضاء',
    active_members: 'نشط',
    no_sub_members: 'بدون اشتراك',
    gender_all: 'الكل',
    gender_male: 'ذكور',
    gender_female: 'إناث',
    clear_filters: 'إزالة الفلاتر',
  },
} as const;

export default function MembersPage() {
  const router = useRouter();
  const { lang } = useLang();
  const { profile } = useAuth();
  const labels = t[lang];
  const c = copy[lang];
  const isTrainer = profile?.role === 'trainer';

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'no_sub'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [trainerFilter, setTrainerFilter] = useState('all');
  const hasMountedSearch = useRef(false);
  const fetchCounterRef = useRef(0);

  // Add member modal state
  const [addOpen, setAddOpen] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** Fetch members from API, optionally filtered by search query */
  const fetchMembers = useCallback(async (q?: string) => {
    const thisRequest = ++fetchCounterRef.current;
    setLoading(true);
    try {
      const url = q ? `/api/members?q=${encodeURIComponent(q)}` : '/api/members';
      const res = await api.get<Member[]>(url);
      if (thisRequest !== fetchCounterRef.current) return;
      if (res.data) {
        setMembers(res.data);
      } else {
        try {
          setMembers((await getCachedMembers(q || '')) as Member[]);
        } catch (error) {
          console.error('Failed to load cached members list', error);
        }
      }
    } catch (error) {
      if (thisRequest !== fetchCounterRef.current) return;
      try {
        setMembers(await getCachedMembers(q || ''));
      } catch (cacheError) {
        console.error('Failed to load members list', error);
        console.error('Failed to load cached members list', cacheError);
      }
    } finally {
      if (thisRequest === fetchCounterRef.current) setLoading(false);
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
          } catch (error) {
            console.error(`Failed to warm route cache for ${route}`, error);
          }
        }));
      } catch (error) {
        console.error('Failed to warm member route cache', error);
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
    } catch (error) {
      // keep modal open on error so user can retry
      console.error('Failed to delete member', error);
      toast.error(c.delete_error);
    } finally {
      setDeleting(false);
    }
  };

  // Stat card counts derived from the full unfiltered members list
  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter((m) => m.sub_status === 'active').length;
    const noSub = members.filter((m) => m.sub_status === 'no_sub').length;
    return { total, active, noSub };
  }, [members]);

  // Unique trainer names for filter dropdown
  const trainerNames = useMemo(() => {
    const names = new Set<string>();
    for (const m of members) {
      if (m.trainer_name) names.add(m.trainer_name);
    }
    return [...names].sort();
  }, [members]);

  // Client-side status + gender + trainer filter
  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (statusFilter !== 'all' && m.sub_status !== statusFilter) return false;
      if (genderFilter !== 'all' && m.gender !== genderFilter) return false;
      if (trainerFilter !== 'all' && (m.trainer_name || '') !== trainerFilter) return false;
      return true;
    });
  }, [members, statusFilter, genderFilter, trainerFilter]);

  // Column definitions — Gender and Card Code columns removed (gender is now a filter, card code belongs on detail page)
  const columns = [
    { key: 'name',         label: labels.name,       className: 'w-[150px]' },
    { key: 'sub_status',   label: labels.status,     className: '' },
    { key: 'phone',        label: labels.phone,      className: 'hidden sm:table-cell' },
    { key: 'trainer_name', label: c.trainer_col,     className: 'hidden md:table-cell' },
    { key: 'created_at',   label: labels.date,       className: 'hidden lg:table-cell' },
    { key: '_actions',     label: labels.actions,    className: 'w-[50px] text-end' },
  ];

  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8">
      {/* Header row: title + add button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-heading font-bold tracking-tight">
          {isTrainer ? c.my_clients : labels.members}
        </h1>
        {!isTrainer ? (
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus size={14} />{labels.add_member}
          </Button>
        ) : null}
      </div>

      {/* Stat cards — clickable, filter the table */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <button className="text-start" onClick={() => setStatusFilter('all')}>
          <StatCard label={c.total_members} value={stats.total} color="text-foreground" />
        </button>
        <button className="text-start" onClick={() => setStatusFilter('active')}>
          <StatCard label={c.active_members} value={stats.active} color="text-success" />
        </button>
        <button className="text-start" onClick={() => setStatusFilter('no_sub')}>
          <StatCard label={c.no_sub_members} value={stats.noSub} color={stats.noSub > 0 ? 'text-warning' : 'text-foreground'} />
        </button>
      </div>

      {/* Search + filters row */}
      <div className="flex flex-wrap gap-3 mt-4">
        <Input
          type="text"
          placeholder={labels.search_members}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        {/* Status filter */}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
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
        {/* Gender filter */}
        <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as typeof genderFilter)} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{c.gender_all}</SelectItem>
            <SelectItem value="male">{c.gender_male}</SelectItem>
            <SelectItem value="female">{c.gender_female}</SelectItem>
          </SelectContent>
        </Select>
        {/* Trainer filter — only when trainers exist */}
        {!isTrainer && trainerNames.length > 0 && (
          <Select value={trainerFilter} onValueChange={setTrainerFilter} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{c.trainer_col}: {c.gender_all}</SelectItem>
              {trainerNames.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Members table */}
      <div className="mt-4">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <Card className="shadow-[6px_6px_0_#000000] border-2 border-border">
            <CardContent className="p-0">
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
                        tabIndex={0}
                        role="link"
                        onClick={() => router.push(`/dashboard/members/${member.id}`)}
                        onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/dashboard/members/${member.id}`); }}
                        className={`cursor-pointer ${member.sub_status === 'no_sub' ? 'border-s-2 border-s-warning' : member.sub_status === 'expired' ? 'opacity-60' : ''}`}
                      >
                        <TableCell className="font-medium max-w-[200px]">
                          <span className="truncate block">{member.name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs font-semibold ${
                              member.sub_status === 'active'
                                ? 'bg-success/20 text-success border-success/30'
                                : member.sub_status === 'expired'
                                ? 'bg-destructive/20 text-destructive border-destructive/30'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {member.sub_status === 'active'
                              ? labels.active
                              : member.sub_status === 'expired'
                              ? labels.expired
                              : labels.no_sub}
                          </Badge>
                          {member.sync_status && member.sync_status !== 'synced' ? (
                            <Badge
                              variant="outline"
                              className="ms-2 text-[10px] font-semibold border-warning/30 text-warning bg-warning/10"
                            >
                              {c.pending_sync}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell" dir="ltr">{member.phone}</TableCell>
                        <TableCell className="hidden md:table-cell">{member.trainer_name || '—'}</TableCell>
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
                        <p className="text-sm text-muted-foreground">{labels.no_members_found}</p>
                        {(statusFilter !== 'all' || genderFilter !== 'all' || trainerFilter !== 'all') && (
                          <button
                            className="text-xs text-destructive hover:underline mt-2"
                            onClick={() => { setStatusFilter('all'); setGenderFilter('all'); setTrainerFilter('all'); }}
                          >
                            {c.clear_filters}
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

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
