'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatCurrency, formatDate } from '@/lib/format';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type GuestPass = {
  id: string;
  code: string;
  member_name: string;
  phone: string | null;
  amount: string | null;
  inviter_member_id: string | null;
  inviter_subscription_id: number | null;
  inviter_name: string | null;
  expires_at: string;
  used_at: string | null;
  voided_at: string | null;
  converted_member_id: string | null;
  converted_at: string | null;
  converted_member_name: string | null;
  created_at: string;
};

type MemberSearchResult = {
  id: string;
  name: string;
  phone: string | null;
  card_code: string | null;
  sub_status: 'active' | 'expired' | 'no_sub';
};

type GuestInviteSummary = {
  member: {
    id: string;
    name: string;
    phone: string | null;
    card_code: string | null;
  };
  allowance: number;
  used: number;
  remaining: number;
  hasActiveCycle: boolean;
  currentCycle: {
    id: number;
    startDate: number;
    endDate: number;
    planMonths: number;
    sessionsPerMonth: number | null;
  } | null;
  recentGuests: Array<{
    id: string;
    guest_name: string;
  }>;
};

type SettingsPayload = {
  guest_invites_per_cycle?: number;
};

function getPassStatus(row: GuestPass, lang: 'ar' | 'en') {
  if (row.voided_at) {
    return {
      label: lang === 'ar' ? 'ملغاة' : 'Voided',
      className: 'bg-muted text-muted-foreground border border-border',
    };
  }
  if (row.converted_at) {
    return {
      label: lang === 'ar' ? 'تم التحويل' : 'Converted',
      className: 'bg-info/10 text-info border border-info/30',
    };
  }
  if (row.used_at) {
    return {
      label: lang === 'ar' ? 'تم الاستخدام' : 'Used',
      className: 'bg-success/10 text-success border border-success/30',
    };
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return {
      label: lang === 'ar' ? 'منتهية' : 'Expired',
      className: 'bg-warning/10 text-warning border border-warning/30',
    };
  }
  return {
    label: lang === 'ar' ? 'مفتوحة' : 'Open',
    className: 'bg-success/10 text-success border border-success/30',
  };
}

export default function GuestPassesPage() {
  const { lang } = useLang();
  const labels = t[lang];
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviterFromQuery = searchParams.get('inviter_member_id') || '';

  const [rows, setRows] = useState<GuestPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [inviterSearching, setInviterSearching] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [allowanceInput, setAllowanceInput] = useState('1');
  const [inviterQuery, setInviterQuery] = useState('');
  const [inviterResults, setInviterResults] = useState<MemberSearchResult[]>([]);
  const [selectedInviterId, setSelectedInviterId] = useState<string>('');
  const [selectedInviterSummary, setSelectedInviterSummary] = useState<GuestInviteSummary | null>(null);

  const load = useCallback(async () => {
    const [passesRes, settingsRes] = await Promise.all([
      api.get<GuestPass[]>('/api/guest-passes'),
      api.get<SettingsPayload>('/api/settings'),
    ]);

    if (passesRes.success && passesRes.data) {
      setRows(passesRes.data);
    }

    if (settingsRes.success && settingsRes.data) {
      const configured = settingsRes.data.guest_invites_per_cycle;
      setAllowanceInput(String(typeof configured === 'number' ? configured : 1));
    }
  }, []);

  const loadInviterSummary = useCallback(async (memberId: string) => {
    const res = await api.get<GuestInviteSummary>(`/api/members/${memberId}/guest-invites`);
    if (res.success && res.data) {
      setSelectedInviterSummary(res.data);
      setSelectedInviterId(memberId);
      setInviterQuery(res.data.member.name);
      setInviterResults([]);
      return;
    }
    setSelectedInviterSummary(null);
    setSelectedInviterId('');
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        await load();
        if (!cancelled && inviterFromQuery) {
          await loadInviterSummary(inviterFromQuery);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [inviterFromQuery, load, loadInviterSummary]);

  useEffect(() => {
    if (selectedInviterId || inviterQuery.trim().length < 2) {
      setInviterResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setInviterSearching(true);
      try {
        const res = await api.get<MemberSearchResult[]>(`/api/members?q=${encodeURIComponent(inviterQuery.trim())}`);
        if (res.success && res.data) {
          setInviterResults(res.data.slice(0, 8));
        }
      } finally {
        setInviterSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [inviterQuery, selectedInviterId]);

  function clearInviter() {
    setSelectedInviterId('');
    setSelectedInviterSummary(null);
    setInviterQuery('');
    setInviterResults([]);
  }

  async function saveAllowance() {
    if (policySaving) return;
    const parsed = Number(allowanceInput);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setPolicySaving(true);
    try {
      const res = await api.put('/api/settings', {
        values: {
          guest_invites_per_cycle: Math.floor(parsed),
        },
      });
      if (res.success && selectedInviterId) {
        await loadInviterSummary(selectedInviterId);
      }
    } finally {
      setPolicySaving(false);
    }
  }

  async function createPass() {
    if (!name.trim() || saving) return;
    const parsedAmount = amount ? Number(amount) : undefined;
    if (amount && (isNaN(parsedAmount!) || parsedAmount! < 0)) return;
    if (selectedInviterId) {
      if (!selectedInviterSummary?.hasActiveCycle) return;
      if (selectedInviterSummary.remaining <= 0) return;
    }

    setSaving(true);
    try {
      const res = await api.post('/api/guest-passes', {
        member_name: name.trim(),
        phone: phone.trim() || undefined,
        amount: parsedAmount,
        inviter_member_id: selectedInviterId || undefined,
      });
      if (res.success) {
        setName('');
        setPhone('');
        setAmount('');
        await load();
        if (selectedInviterId) {
          await loadInviterSummary(selectedInviterId);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function markUsed(id: string) {
    await api.patch('/api/guest-passes', { id, mark_used: true });
    await load();
    if (selectedInviterId) {
      await loadInviterSummary(selectedInviterId);
    }
  }

  async function voidPass(id: string) {
    await api.patch('/api/guest-passes', { id, void_pass: true });
    await load();
    if (selectedInviterId) {
      await loadInviterSummary(selectedInviterId);
    }
  }

  if (loading) return <LoadingSpinner />;

  const canCreateInvite = !selectedInviterId || Boolean(selectedInviterSummary?.hasActiveCycle && selectedInviterSummary.remaining > 0);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <h1 className="text-3xl font-bold">{labels.guest_passes}</h1>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{lang === 'ar' ? 'سياسة دعوات الضيوف' : 'Guest Invite Policy'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>{lang === 'ar' ? 'العدد المسموح لكل دورة اشتراك' : 'Allowed invites per subscription cycle'}</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={allowanceInput}
                onChange={(e) => setAllowanceInput(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {lang === 'ar'
                ? 'هذا العدد يحدد رصيد الضيوف لكل عميل داخل دورته الحالية. إلغاء دعوة غير مستخدمة يعيد الرصيد.'
                : 'This sets each client\'s guest invite balance for their current cycle. Voiding an unused pass restores the balance.'}
            </p>
            <Button onClick={saveAllowance} disabled={policySaving}>
              {policySaving ? labels.saving : labels.save}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{labels.add_guest_pass}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1 xl:col-span-2">
              <Label>{lang === 'ar' ? 'الضيف' : 'Guest name'}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{labels.phone}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{labels.guest_amount}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={createPass} disabled={saving || !canCreateInvite}>
                {saving ? labels.saving : labels.save}
              </Button>
            </div>

            <div className="space-y-1 md:col-span-2 xl:col-span-3">
              <Label>{lang === 'ar' ? 'العضو الداعي - اختياري' : 'Inviting member - optional'}</Label>
              <Input
                value={inviterQuery}
                onChange={(e) => {
                  setInviterQuery(e.target.value);
                  setSelectedInviterId('');
                  setSelectedInviterSummary(null);
                }}
                placeholder={lang === 'ar' ? 'ابحث بالاسم أو الهاتف أو الكود' : 'Search by name, phone, or card code'}
              />
              {inviterSearching && (
                <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'جارٍ البحث...' : 'Searching...'}</p>
              )}
              {!selectedInviterId && inviterResults.length > 0 && (
                <div className="rounded-lg border bg-card">
                  {inviterResults.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className="flex w-full items-center justify-between border-b px-3 py-2 text-start last:border-b-0 hover:bg-muted/40"
                      onClick={() => loadInviterSummary(member.id)}
                    >
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.phone || member.card_code || '—'}</p>
                      </div>
                      <Badge className={member.sub_status === 'active' ? 'bg-success/10 text-success border border-success/30' : 'bg-muted text-muted-foreground border border-border'}>
                        {member.sub_status === 'active'
                          ? labels.active
                          : member.sub_status === 'expired'
                          ? labels.expired
                          : (lang === 'ar' ? 'بدون اشتراك' : 'No sub')}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2 xl:col-span-5">
              {selectedInviterSummary ? (
                <div className="rounded-lg border border-dashed p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{selectedInviterSummary.member.name}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{selectedInviterSummary.member.phone || '—'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-info/10 text-info border border-info/30">
                        {lang === 'ar'
                          ? `المتاح ${selectedInviterSummary.remaining} من ${selectedInviterSummary.allowance}`
                          : `${selectedInviterSummary.remaining} of ${selectedInviterSummary.allowance} left`}
                      </Badge>
                      <Button type="button" variant="ghost" size="sm" onClick={clearInviter}>
                        {lang === 'ar' ? 'إزالة' : 'Clear'}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedInviterSummary.currentCycle
                      ? (lang === 'ar'
                          ? `الدورة الحالية تنتهي في ${formatDate(selectedInviterSummary.currentCycle.endDate, locale)}.`
                          : `Current cycle ends on ${formatDate(selectedInviterSummary.currentCycle.endDate, locale)}.`)
                      : (lang === 'ar'
                          ? 'هذا العضو لا يملك دورة اشتراك نشطة حالياً، لذلك لا يمكن ربط دعوة به.'
                          : 'This member has no active subscription cycle, so an invite cannot be attached to them.')}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {lang === 'ar'
                    ? 'اترك الحقل فارغاً لتسجيل زائر عادي، أو اختر عضواً لاحتساب الدعوة من رصيده.'
                    : 'Leave this blank for a normal walk-in guest, or pick a member to deduct from their invite balance.'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{labels.guest_pass_list}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.guest_code}</TableHead>
                <TableHead>{labels.name}</TableHead>
                <TableHead>{lang === 'ar' ? 'الداعي' : 'Inviter'}</TableHead>
                <TableHead>{labels.phone}</TableHead>
                <TableHead>{labels.guest_amount}</TableHead>
                <TableHead>{labels.status}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {labels.no_guest_passes}
                  </TableCell>
                </TableRow>
              ) : rows.map((row) => {
                const status = getPassStatus(row, lang);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium font-mono text-xs">{row.code}</TableCell>
                    <TableCell>{row.member_name}</TableCell>
                    <TableCell>{row.inviter_name || '—'}</TableCell>
                    <TableCell dir="ltr">{row.phone || '-'}</TableCell>
                    <TableCell>{row.amount ? formatCurrency(Number(row.amount)) : '-'}</TableCell>
                    <TableCell>
                      <Badge className={status.className}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex flex-wrap gap-2 justify-end">
                        {!row.used_at && !row.voided_at && !row.converted_at && (
                          <Button size="sm" variant="outline" onClick={() => markUsed(row.id)}>
                            {labels.mark_used}
                          </Button>
                        )}
                        {!row.used_at && !row.voided_at && !row.converted_at && (
                          <Button size="sm" variant="ghost" onClick={() => voidPass(row.id)}>
                            {lang === 'ar' ? 'إلغاء' : 'Void'}
                          </Button>
                        )}
                        {row.converted_member_id ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => router.push(`/dashboard/members/${row.converted_member_id}`)}
                          >
                            {lang === 'ar' ? 'عرض العميل' : 'View Client'}
                          </Button>
                        ) : !row.voided_at ? (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              const params = new URLSearchParams({
                                name: row.member_name,
                                ...(row.phone ? { phone: row.phone } : {}),
                                from_guest: row.id,
                              });
                              router.push(`/dashboard/members/new?${params.toString()}`);
                            }}
                          >
                            {labels.convert_to_client}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
