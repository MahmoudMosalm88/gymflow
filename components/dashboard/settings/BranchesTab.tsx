"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, Check, Pencil, Plus } from "lucide-react";
import { api } from "@/lib/api-client";
import { useLang, t } from "@/lib/i18n";
import { getStoredBranchId, persistBranchLocally, switchBranch, type BranchOption } from "@/lib/branch-session";
import { useSaveShortcut } from "@/lib/use-save-shortcut";
import LoadingSpinner from "@/components/dashboard/LoadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const copy = {
  en: {
    title: "Branches",
    description: "Manage the branches in this organization. Each branch keeps separate clients, subscriptions, settings, WhatsApp queue, and reports.",
    addTitle: "Add branch",
    addDescription: "Use the real branch name your team recognizes. You can switch to it after it is created.",
    name: "Branch name",
    create: "Create branch",
    save: "Save name",
    cancel: "Cancel",
    switch: "Switch",
    current: "Current",
    created: "Branch created.",
    renamed: "Branch renamed.",
    failed: "Could not save branch.",
    emptyName: "Enter a branch name.",
    noBranches: "No branches found.",
    openForm: "Add branch",
    timezone: "Timezone",
    currency: "Currency",
  },
  ar: {
    title: "الفروع",
    description: "أدر فروع هذه المؤسسة. لكل فرع عملاؤه واشتراكاته وإعداداته ورسائل واتساب وتقاريره المستقلة.",
    addTitle: "إضافة فرع",
    addDescription: "استخدم اسم الفرع الحقيقي الذي يعرفه فريقك. يمكنك التبديل إليه بعد إنشائه.",
    name: "اسم الفرع",
    create: "إنشاء الفرع",
    save: "حفظ الاسم",
    cancel: "إلغاء",
    switch: "تبديل",
    current: "الحالي",
    created: "تم إنشاء الفرع.",
    renamed: "تم تعديل اسم الفرع.",
    failed: "تعذر حفظ الفرع.",
    emptyName: "أدخل اسم الفرع.",
    noBranches: "لا توجد فروع.",
    openForm: "إضافة فرع",
    timezone: "المنطقة الزمنية",
    currency: "العملة",
  },
} as const;

export default function BranchesTab() {
  const { lang } = useLang();
  const labels = t[lang];
  const c = copy[lang];
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLDivElement | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(searchParams.get("add") === "1");
  const [message, setMessage] = useState<{ type: "success" | "destructive"; text: string } | null>(null);

  const currentBranchId = getStoredBranchId();
  const sorted = useMemo(
    () => [...branches].sort((a, b) => Number(b.id === currentBranchId) - Number(a.id === currentBranchId) || a.name.localeCompare(b.name)),
    [branches, currentBranchId]
  );

  async function loadBranches() {
    setLoading(true);
    try {
      const res = await api.get<BranchOption[]>("/api/branches");
      if (res.success && res.data) setBranches(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBranches();
  }, []);

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setFormOpen(true);
      window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [searchParams]);

  function resetForm() {
    setDraftName("");
    setEditingId(null);
    setFormOpen(false);
  }

  function startCreate() {
    setDraftName("");
    setEditingId(null);
    setFormOpen(true);
    setMessage(null);
    window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function startEdit(branch: BranchOption) {
    setDraftName(branch.name);
    setEditingId(branch.id);
    setFormOpen(true);
    setMessage(null);
    window.requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function saveBranch() {
    const name = draftName.trim();
    if (!name) {
      setMessage({ type: "destructive", text: c.emptyName });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = editingId
        ? await api.patch<BranchOption>("/api/branches", { id: editingId, name })
        : await api.post<BranchOption>("/api/branches", { name });
      if (!res.success) {
        setMessage({ type: "destructive", text: res.message || c.failed });
        return;
      }
      if (editingId && editingId === currentBranchId && res.data) {
        persistBranchLocally(res.data);
      }
      setMessage({ type: "success", text: editingId ? c.renamed : c.created });
      resetForm();
      await loadBranches();
    } catch {
      setMessage({ type: "destructive", text: c.failed });
    } finally {
      setSaving(false);
    }
  }

  async function handleSwitch(branch: BranchOption) {
    if (branch.id === currentBranchId || switchingId) return;
    setSwitchingId(branch.id);
    await switchBranch(branch);
  }

  useSaveShortcut({
    scopeRef: formRef,
    onSave: () => {
      void saveBranch();
    },
    disabled: saving || !formOpen,
    enterMode: "all",
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className={`grid gap-6 ${formOpen ? "lg:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="space-y-1.5">
            <CardTitle>{c.title}</CardTitle>
            <CardDescription>{c.description}</CardDescription>
          </div>
          <Button type="button" onClick={startCreate}>
            <Plus className="h-4 w-4" />
            {c.openForm}
          </Button>
        </CardHeader>
        <CardContent>
          {message ? (
            <Alert variant={message.type} className="mb-4">
              {message.type === "success" ? <Check className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              <AlertTitle>{message.type === "success" ? labels.success_title : labels.error_title}</AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          ) : null}
          {sorted.length === 0 ? (
            <p className="border-2 border-dashed border-border p-6 text-sm text-muted-foreground">{c.noBranches}</p>
          ) : (
            <div className="divide-y divide-border">
              {sorted.map((branch) => {
                const current = branch.id === currentBranchId;
                return (
                  <div key={branch.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-medium">{branch.name}</h3>
                        {current ? (
                          <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
                            {c.current}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.timezone}: {branch.timezone || "UTC"} · {c.currency}: {branch.currency || "EUR"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => startEdit(branch)}>
                        <Pencil className="h-4 w-4" />
                        {labels.edit}
                      </Button>
                      <Button type="button" size="sm" disabled={current || Boolean(switchingId)} onClick={() => void handleSwitch(branch)}>
                        {switchingId === branch.id ? labels.loading : c.switch}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {formOpen ? (
        <Card ref={formRef} className="h-fit">
          <CardHeader>
            <CardTitle>{editingId ? c.save : c.addTitle}</CardTitle>
            <CardDescription>{c.addDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="branch-name">{c.name}</Label>
              <Input
                id="branch-name"
                className="mt-1"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
                {c.cancel}
              </Button>
              <Button type="button" onClick={saveBranch} disabled={saving || !draftName.trim()}>
                {saving ? labels.saving : editingId ? c.save : c.create}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
