"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardList } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export type PlanTemplateOption = {
  id: string;
  name: string;
  duration_months: number;
  price: number;
  sessions_per_month: number | null;
  perks: string[];
  freeze_days_per_cycle: number;
  guest_invites_per_cycle: number;
  is_archived?: boolean;
  sort_order?: number;
};

type Props = {
  selectedId: string | null;
  manualSelected: boolean;
  onSelectTemplate: (template: PlanTemplateOption) => void;
  onSelectManual: () => void;
  onAvailabilityChange?: (count: number) => void;
};

const copy = {
  en: {
    title: "Plan templates",
    loading: "Loading branch plans...",
    manual: "Manual custom",
    sessions: "Sessions / Month",
    unlimited: "Unlimited sessions",
    freeze: "freeze days",
    guest: "guest invites",
    noPerks: "No perks listed"
  },
  ar: {
    title: "قوالب الخطط",
    loading: "جاري تحميل خطط الفرع...",
    manual: "تخصيص يدوي",
    sessions: "جلسة / شهر",
    unlimited: "جلسات غير محدودة",
    freeze: "أيام تجميد",
    guest: "دعوات ضيوف",
    noPerks: "لا توجد مزايا"
  }
} as const;

export default function PlanTemplateSelector({
  selectedId,
  manualSelected,
  onSelectTemplate,
  onSelectManual,
  onAvailabilityChange
}: Props) {
  const { lang } = useLang();
  const c = copy[lang];
  const [templates, setTemplates] = useState<PlanTemplateOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<PlanTemplateOption[]>("/api/plan-templates")
      .then((res) => {
        if (cancelled) return;
        const active = (res.success && res.data ? res.data : []).filter((template) => !template.is_archived);
        setTemplates(active);
        onAvailabilityChange?.(active.length);
      })
      .catch(() => {
        if (!cancelled) {
          setTemplates([]);
          onAvailabilityChange?.(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [onAvailabilityChange]);

  const sorted = useMemo(
    () => [...templates].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)),
    [templates]
  );

  if (loading) {
    return (
      <section className="border-2 border-border bg-card p-4 text-sm text-muted-foreground">
        {c.loading}
      </section>
    );
  }

  if (sorted.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-destructive" />
        <h3 className="font-medium">{c.title}</h3>
      </div>
      <div className="grid gap-2">
        {sorted.map((template) => {
          const selected = selectedId === template.id && !manualSelected;
          const details = [
            `${template.duration_months} mo`,
            formatCurrency(template.price),
            template.sessions_per_month == null ? c.unlimited : `${template.sessions_per_month} ${c.sessions}`,
            template.freeze_days_per_cycle > 0 ? `${template.freeze_days_per_cycle} ${c.freeze}` : null,
            template.guest_invites_per_cycle > 0 ? `${template.guest_invites_per_cycle} ${c.guest}` : null
          ].filter(Boolean);

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template)}
              className={`w-full border-2 p-3 text-start transition-colors ${
                selected
                  ? "border-destructive bg-destructive/10 text-foreground"
                  : "border-border bg-background text-foreground hover:border-muted-foreground/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{template.name}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{details.join(" · ")}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {template.perks.length > 0 ? template.perks.join(" · ") : c.noPerks}
                  </p>
                </div>
                {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> : null}
              </div>
            </button>
          );
        })}
      </div>
      <Button type="button" variant={manualSelected ? "default" : "outline"} className="w-full" onClick={onSelectManual}>
        {c.manual}
      </Button>
    </section>
  );
}
