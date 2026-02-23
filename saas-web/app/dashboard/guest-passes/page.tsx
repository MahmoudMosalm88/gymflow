'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { useRouter } from 'next/navigation';
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
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export default function GuestPassesPage() {
  const { lang } = useLang();
  const labels = t[lang];
  const router = useRouter();
  const [rows, setRows] = useState<GuestPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get<GuestPass[]>('/api/guest-passes');
      if (res.success && res.data) setRows(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createPass() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await api.post('/api/guest-passes', {
        member_name: name.trim(),
        phone: phone.trim() || undefined,
      });
      if (res.success) {
        setName('');
        setPhone('');
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function markUsed(id: string) {
    await api.patch('/api/guest-passes', { id, mark_used: true });
    await load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      <h1 className="text-3xl font-bold">{labels.guest_passes}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{labels.add_guest_pass}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>{labels.name}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{labels.phone}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={createPass} disabled={saving}>{saving ? labels.saving : labels.save}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.guest_pass_list}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.guest_code}</TableHead>
                <TableHead>{labels.name}</TableHead>
                <TableHead>{labels.phone}</TableHead>
                <TableHead>{labels.status}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {labels.no_guest_passes}
                  </TableCell>
                </TableRow>
              ) : rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium font-mono text-xs">{row.code}</TableCell>
                  <TableCell>{row.member_name}</TableCell>
                  <TableCell dir="ltr">{row.phone || '-'}</TableCell>
                  <TableCell>
                    <Badge className={row.used_at ? 'bg-muted text-muted-foreground' : 'bg-success/10 text-success border border-success/30'}>
                      {row.used_at ? labels.guest_used : labels.guest_open}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex gap-2 justify-end">
                      {!row.used_at && (
                        <Button size="sm" variant="outline" onClick={() => markUsed(row.id)}>
                          {labels.mark_used}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          // Navigate to add client page with guest data pre-filled
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
