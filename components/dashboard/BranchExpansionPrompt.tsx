"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, Clock, X } from "lucide-react";
import { api } from "@/lib/api-client";
import type { BranchOption } from "@/lib/branch-session";
import { useAuth } from "@/lib/use-auth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

type SettingsMap = Record<string, unknown>;

const copy = {
  en: {
    title: "Add your other branches",
    body: "You selected multiple branches during signup. Add each location so staff, members, plans, WhatsApp, and reports stay separated by branch.",
    add: "Add branch",
    later: "Remind me later",
    dismiss: "I only need one"
  },
  ar: {
    title: "أضف باقي الفروع",
    body: "اخترت أكثر من فرع أثناء التسجيل. أضف كل موقع حتى تبقى الفرق والعملاء والخطط وواتساب والتقارير منفصلة حسب الفرع.",
    add: "إضافة فرع",
    later: "ذكرني لاحقاً",
    dismiss: "أحتاج فرعاً واحداً فقط"
  }
} as const;

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return false;
}

export default function BranchExpansionPrompt() {
  const { profile } = useAuth();
  const { lang } = useLang();
  const c = copy[lang];
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [branchCount, setBranchCount] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);
  const [savingKey, setSavingKey] = useState<"later" | "dismiss" | null>(null);

  useEffect(() => {
    if (profile?.role !== "owner") return;
    let cancelled = false;

    void Promise.all([
      api.get<SettingsMap>("/api/settings"),
      api.get<BranchOption[]>("/api/branches")
    ])
      .then(([settingsRes, branchesRes]) => {
        if (cancelled) return;
        if (settingsRes.success && settingsRes.data) setSettings(settingsRes.data);
        if (branchesRes.success && branchesRes.data) setBranchCount(branchesRes.data.length);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [profile?.role]);

  const visible = useMemo(() => {
    if (hidden || profile?.role !== "owner" || !settings || branchCount === null) return false;
    if (branchCount > 1) return false;

    const intent = asString(settings.signup_branch_count_intent);
    if (intent !== "two_to_four" && intent !== "five_plus") return false;
    if (asBoolean(settings.branch_expansion_prompt_dismissed)) return false;

    const snoozedUntil = asString(settings.branch_expansion_prompt_snoozed_until);
    if (snoozedUntil) {
      const time = new Date(snoozedUntil).getTime();
      if (Number.isFinite(time) && time > Date.now()) return false;
    }

    return true;
  }, [branchCount, hidden, profile?.role, settings]);

  async function save(values: Record<string, string | boolean | null>, key: "later" | "dismiss") {
    setSavingKey(key);
    try {
      await api.put("/api/settings", { values });
      setHidden(true);
    } finally {
      setSavingKey(null);
    }
  }

  if (!visible) return null;

  return (
    <section className="mb-4 border-2 border-destructive/50 bg-destructive/10 p-4 text-foreground shadow-[4px_4px_0_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="min-w-0">
            <h2 className="font-heading text-base font-bold">{c.title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{c.body}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button asChild size="sm">
            <Link href="/dashboard/settings?tab=branches&add=1">{c.add}</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              void save(
                {
                  branch_expansion_prompt_snoozed_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                },
                "later"
              )
            }
            disabled={savingKey !== null}
          >
            <Clock className="h-4 w-4" />
            {savingKey === "later" ? "..." : c.later}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void save({ branch_expansion_prompt_dismissed: true }, "dismiss")}
            disabled={savingKey !== null}
          >
            <X className="h-4 w-4" />
            {savingKey === "dismiss" ? "..." : c.dismiss}
          </Button>
        </div>
      </div>
    </section>
  );
}
