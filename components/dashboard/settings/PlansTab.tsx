'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatCurrency } from '@/lib/format';
import { useSaveShortcut } from '@/lib/use-save-shortcut';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Archive, ArrowDown, ArrowUp, CheckCircle, Pencil, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type PlanTemplate = {
  id: string;
  name: string;
  duration_months: number;
  price: number;
  sessions_per_month: number | null;
  perks: string[];
  freeze_days_per_cycle: number;
  guest_invites_per_cycle: number;
  is_archived: boolean;
  sort_order: number;
};

type Draft = {
  id: string | null;
  name: string;
  duration_months: string;
  price: string;
  sessions_per_month: string;
  perks: string;
  freeze_days_per_cycle: string;
  guest_invites_per_cycle: string;
};

const emptyDraft: Draft = {
  id: null,
  name: '',
  duration_months: '1',
  price: '',
  sessions_per_month: '',
  perks: '',
  freeze_days_per_cycle: '0',
  guest_invites_per_cycle: '0',
};

const copy = {
  en: {
    title: 'Plan templates',
    description: 'Build reusable subscription plans for this branch. Sold subscriptions keep a snapshot when templates change later.',
    emptyTitle: 'Create your first branch plan',
    emptyDescription: 'Start with the plan your team sells most often, then add perks and cycle rules if they matter.',
    newPlan: 'New plan',
    editPlan: 'Edit plan',
    name: 'Plan name',
    duration: 'Months',
    price: 'Price',
    sessions: 'Sessions per month',
    sessionsPlaceholder: 'Leave blank for unlimited',
    perks: 'Perks',
    perksPlaceholder: 'One perk per line',
    freeze: 'Freeze days per cycle',
    guests: 'Guest invites per cycle',
    create: 'Create plan',
    save: 'Save changes',
    cancel: 'Cancel',
    archived: 'Archived',
    active: 'Active',
    archive: 'Archive',
    restore: 'Restore',
    moveUp: 'Move up',
    moveDown: 'Move down',
    noPerks: 'No perks listed',
    saved: 'Plan saved.',
    failed: 'Could not save plan.',
    requiredFields: 'Plan name, months, and price are required.',
    invalidNumbers: 'Months must be positive and numeric fields cannot be negative.',
    essentials: 'Essentials',
    rules: 'Cycle rules',
  },
  ar: {
    title: 'قوالب الاشتراكات',
    description: 'أنشئ خطط اشتراك قابلة لإعادة الاستخدام لهذا الفرع. الاشتراكات المباعة تحتفظ بنسخة ثابتة عند تعديل القالب لاحقاً.',
    emptyTitle: 'أنشئ أول خطة للفرع',
    emptyDescription: 'ابدأ بالخطة الأكثر بيعاً، ثم أضف المزايا وقواعد الدورة إذا كانت مهمة.',
    newPlan: 'خطة جديدة',
    editPlan: 'تعديل الخطة',
    name: 'اسم الخطة',
    duration: 'الأشهر',
    price: 'السعر',
    sessions: 'الحصص شهرياً',
    sessionsPlaceholder: 'اتركها فارغة لغير محدود',
    perks: 'المزايا',
    perksPlaceholder: 'ميزة واحدة في كل سطر',
    freeze: 'أيام التجميد لكل دورة',
    guests: 'دعوات الضيوف لكل دورة',
    create: 'إنشاء الخطة',
    save: 'حفظ التعديلات',
    cancel: 'إلغاء',
    archived: 'مؤرشفة',
    active: 'نشطة',
    archive: 'أرشفة',
    restore: 'استعادة',
    moveUp: 'تحريك لأعلى',
    moveDown: 'تحريك لأسفل',
    noPerks: 'لا توجد مزايا',
    saved: 'تم حفظ الخطة.',
    failed: 'تعذر حفظ الخطة.',
    requiredFields: 'اسم الخطة وعدد الأشهر والسعر مطلوبة.',
    invalidNumbers: 'يجب أن تكون الأشهر موجبة ولا يمكن أن تكون الأرقام سالبة.',
    essentials: 'الأساسيات',
    rules: 'قواعد الدورة',
  },
} as const;

function toDraft(template: PlanTemplate): Draft {
  return {
    id: template.id,
    name: template.name,
    duration_months: String(template.duration_months),
    price: String(template.price),
    sessions_per_month: template.sessions_per_month == null ? '' : String(template.sessions_per_month),
    perks: template.perks.join('\n'),
    freeze_days_per_cycle: String(template.freeze_days_per_cycle),
    guest_invites_per_cycle: String(template.guest_invites_per_cycle),
  };
}

export default function PlansTab() {
  const { lang } = useLang();
  const labels = t[lang];
  const c = copy[lang];
  const formRef = useRef<HTMLDivElement | null>(null);
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'destructive'; text: string } | null>(null);

  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => Number(a.is_archived) - Number(b.is_archived) || a.sort_order - b.sort_order),
    [templates]
  );

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await api.get<PlanTemplate[]>('/api/plan-templates?include_archived=1');
      if (res.success && res.data) setTemplates(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTemplates();
  }, []);

  function resetDraft() {
    setDraft(emptyDraft);
    setEditorOpen(false);
    setMessage(null);
  }

  function startNewDraft() {
    setDraft({ ...emptyDraft });
    setEditorOpen(true);
    setMessage(null);
  }

  function editTemplate(template: PlanTemplate) {
    setDraft(toDraft(template));
    setEditorOpen(true);
    setMessage(null);
  }

  async function saveDraft() {
    setMessage(null);
    const name = draft.name.trim();
    const durationMonths = Number(draft.duration_months);
    const price = Number(draft.price);
    const sessionsPerMonth = draft.sessions_per_month.trim() ? Number(draft.sessions_per_month) : null;
    const freezeDays = Number(draft.freeze_days_per_cycle);
    const guestInvites = Number(draft.guest_invites_per_cycle);

    if (!name || !draft.duration_months.trim() || !draft.price.trim()) {
      setMessage({ type: 'destructive', text: c.requiredFields });
      return;
    }
    if (
      !Number.isInteger(durationMonths) ||
      durationMonths < 1 ||
      !Number.isFinite(price) ||
      price < 0 ||
      (sessionsPerMonth !== null && (!Number.isInteger(sessionsPerMonth) || sessionsPerMonth < 0)) ||
      !Number.isInteger(freezeDays) ||
      freezeDays < 0 ||
      !Number.isInteger(guestInvites) ||
      guestInvites < 0
    ) {
      setMessage({ type: 'destructive', text: c.invalidNumbers });
      return;
    }

    setSaving(true);
    const payload = {
      name,
      duration_months: durationMonths,
      price,
      sessions_per_month: sessionsPerMonth,
      perks: draft.perks.split('\n').map((item) => item.trim()).filter(Boolean),
      freeze_days_per_cycle: freezeDays,
      guest_invites_per_cycle: guestInvites,
    };

    try {
      const res = draft.id
        ? await api.patch<PlanTemplate>('/api/plan-templates', { id: draft.id, ...payload })
        : await api.post<PlanTemplate>('/api/plan-templates', payload);
      if (!res.success || !res.data) {
        setMessage({ type: 'destructive', text: res.message || c.failed });
        return;
      }
      setMessage({ type: 'success', text: c.saved });
      setDraft({ ...emptyDraft });
      setEditorOpen(false);
      await loadTemplates();
    } catch {
      setMessage({ type: 'destructive', text: c.failed });
    } finally {
      setSaving(false);
    }
  }

  async function patchTemplate(id: string, patch: Partial<PlanTemplate>) {
    const res = await api.patch<PlanTemplate>('/api/plan-templates', { id, ...patch });
    if (res.success) await loadTemplates();
  }

  async function moveTemplate(id: string, direction: -1 | 1) {
    const active = sortedTemplates.filter((template) => !template.is_archived);
    const index = active.findIndex((template) => template.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= active.length) return;
    const next = [...active];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    const res = await api.patch<PlanTemplate[]>('/api/plan-templates', {
      reorder: next.map((template, sort_order) => ({ id: template.id, sort_order })),
    });
    if (res.success && res.data) setTemplates(res.data);
  }

  useSaveShortcut({
    scopeRef: formRef,
    onSave: () => {
      void saveDraft();
    },
    disabled: saving,
    enterMode: 'all',
  });

  const canSave = !saving && draft.name.trim() !== '' && draft.duration_months.trim() !== '' && draft.price.trim() !== '';

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <Card className="shadow-[6px_6px_0_#000000]">
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="font-heading">{c.title}</CardTitle>
            <CardDescription>{c.description}</CardDescription>
          </div>
          {sortedTemplates.length > 0 ? (
            <Button onClick={startNewDraft} disabled={saving} className="gap-1.5">
              <Plus className="h-4 w-4" />
              {c.newPlan}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {message && !editorOpen ? (
            <Alert variant={message.type} className="mb-4">
              {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{message.type === 'success' ? labels.success_title : labels.error_title}</AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          ) : null}
          {sortedTemplates.length === 0 ? (
            <div className="border-2 border-dashed border-border p-6">
              <h3 className="font-semibold">{c.emptyTitle}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.emptyDescription}</p>
              <Button className="mt-4 gap-1.5" onClick={startNewDraft}>
                <Plus className="h-4 w-4" />
                {c.newPlan}
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedTemplates.map((template) => (
                <div key={template.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{template.name}</h3>
                      <Badge variant="outline" className={template.is_archived ? 'text-muted-foreground' : 'border-success/30 bg-success/10 text-success'}>
                        {template.is_archived ? c.archived : c.active}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="font-stat">{template.duration_months}</span> {labels.months_label} · {formatCurrency(template.price)}
                      {template.sessions_per_month != null ? ` · ${template.sessions_per_month} ${labels.sessions_per_month_label}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {template.freeze_days_per_cycle} {c.freeze} · {template.guest_invites_per_cycle} {c.guests}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {template.perks.length > 0 ? template.perks.join(' · ') : c.noPerks}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {!template.is_archived ? (
                      <>
                        <Button size="icon" variant="outline" aria-label={c.moveUp} onClick={() => moveTemplate(template.id, -1)}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" aria-label={c.moveDown} onClick={() => moveTemplate(template.id, 1)}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </>
                    ) : null}
                    <Button size="icon" variant="outline" aria-label={labels.edit} onClick={() => editTemplate(template)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => patchTemplate(template.id, { is_archived: !template.is_archived })}
                    >
                      <Archive className="me-2 h-4 w-4" />
                      {template.is_archived ? c.restore : c.archive}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editorOpen} onOpenChange={(o) => { if (!o) resetDraft(); }}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
              {draft.id ? c.editPlan : c.newPlan}
            </DialogTitle>
          </DialogHeader>

          <div ref={formRef} className="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
            {message && editorOpen ? (
              <Alert variant={message.type}>
                {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-heading">{c.essentials}</p>
              <div className="space-y-2">
                <Label htmlFor="plan-name">{c.name}</Label>
                <Input id="plan-name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="border-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="plan-months">{c.duration}</Label>
                  <Input id="plan-months" type="number" min={1} value={draft.duration_months} onChange={(e) => setDraft((d) => ({ ...d, duration_months: e.target.value }))} className="border-2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-price">{c.price}</Label>
                  <Input id="plan-price" type="number" min={0} step="0.01" value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} className="border-2" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-sessions">{c.sessions}</Label>
                <Input id="plan-sessions" type="number" min={1} placeholder={c.sessionsPlaceholder} value={draft.sessions_per_month} onChange={(e) => setDraft((d) => ({ ...d, sessions_per_month: e.target.value }))} className="border-2" />
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-heading">{c.rules}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="plan-freeze">{c.freeze}</Label>
                  <Input id="plan-freeze" type="number" min={0} value={draft.freeze_days_per_cycle} onChange={(e) => setDraft((d) => ({ ...d, freeze_days_per_cycle: e.target.value }))} className="border-2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-guests">{c.guests}</Label>
                  <Input id="plan-guests" type="number" min={0} value={draft.guest_invites_per_cycle} onChange={(e) => setDraft((d) => ({ ...d, guest_invites_per_cycle: e.target.value }))} className="border-2" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-perks">{c.perks}</Label>
                <Textarea id="plan-perks" rows={3} placeholder={c.perksPlaceholder} value={draft.perks} onChange={(e) => setDraft((d) => ({ ...d, perks: e.target.value }))} className="border-2" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 pb-6 pt-2">
            <Button variant="outline" onClick={resetDraft} disabled={saving}>{c.cancel}</Button>
            <Button onClick={saveDraft} disabled={!canSave} className={cn(saving && 'animate-pulse')}>
              {saving ? labels.saving : draft.id ? c.save : c.create}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}