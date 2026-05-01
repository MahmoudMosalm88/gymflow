"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useLang } from "@/lib/i18n";
import LoadingSpinner from "@/components/dashboard/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, UserX, RotateCw, UserCheck } from "lucide-react";

type StaffMember = {
  id: string;
  name: string;
  title: string | null;
  phone: string;
  email: string | null;
  role: "manager" | "staff" | "trainer";
  is_active: boolean;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
  latest_invite_status: string | null;
  latest_invite_expires_at: string | null;
  active_packages_count?: number;
  future_sessions_count?: number;
  assigned_members_count?: number;
};

const copy = {
  en: {
    title: "Team",
    subtitle: "Add staff and trainers, then send their activation link on WhatsApp.",
    addTitle: "Add Team Member",
    name: "Name",
    jobTitle: "Title",
    jobTitlePlaceholder: "e.g. Head Trainer, Front Desk",
    phone: "Phone",
    email: "Email (optional)",
    role: "Role",
    save: "Send WhatsApp Invite",
    saving: "Sending...",
    status: "Status",
    actions: "Actions",
    resend: "Resend",
    deactivate: "Deactivate",
    reactivate: "Reactivate",
    active: "Active",
    inactive: "Inactive",
    pending: "Invite Sent",
    opened: "Opened",
    accepted: "Accepted",
    cancelled: "Cancelled",
    expired: "Expired",
    expires: "Expires",
    manager: "Manager",
    staff: "Staff",
    trainer: "Trainer",
    inviteSent: "Invite sent on WhatsApp.",
    updated: "Team member updated.",
    replacementTitle: "Deactivate Trainer",
    replacementHint: "Move active PT clients and future sessions to another trainer before deactivation.",
    replacementTrainer: "Replacement trainer",
    confirmDeactivate: "Deactivate",
    confirmReactivate: "Reactivate",
    workloadSummary: "Current workload",
    activePackages: "Active PT packages",
    futureSessions: "Future PT sessions",
    assignedMembers: "Assigned members",
    chooseReplacementFirst: "Choose a replacement trainer first.",
    noReplacementTrainer: "This trainer still owns active PT work. Add or reactivate another trainer before deactivation.",
    deactivateFailed: "Could not deactivate trainer.",
    namePlaceholder: "Ahmed Hassan",
    phonePlaceholder: "+2010...",
    emailPlaceholder: "optional@email.com",
    noTeam: "No team members yet. Add your first team member above.",
    roleDesc_manager: "Full access except billing",
    roleDesc_staff: "Members, check-ins, subscriptions",
    roleDesc_trainer: "Own clients and sessions only",
  },
  ar: {
    title: "الفريق",
    subtitle: "أضف الموظفين والمدربين ثم أرسل رابط التفعيل لهم على واتساب.",
    addTitle: "إضافة عضو فريق",
    name: "الاسم",
    jobTitle: "المسمى الوظيفي",
    jobTitlePlaceholder: "مثال: مدرب رئيسي، استقبال",
    phone: "الهاتف",
    email: "البريد - اختياري",
    role: "الدور",
    save: "إرسال دعوة واتساب",
    saving: "جاري الإرسال...",
    status: "الحالة",
    actions: "إجراءات",
    resend: "إعادة الإرسال",
    deactivate: "إيقاف",
    reactivate: "إعادة تفعيل",
    active: "نشط",
    inactive: "غير نشط",
    pending: "تم الإرسال",
    opened: "تم فتح الرابط",
    accepted: "تم التفعيل",
    cancelled: "ملغية",
    expired: "منتهية",
    expires: "تنتهي",
    manager: "مدير",
    staff: "موظف",
    trainer: "مدرب",
    inviteSent: "تم إرسال الدعوة على واتساب.",
    updated: "تم تحديث عضو الفريق.",
    replacementTitle: "إيقاف المدرب",
    replacementHint: "انقل عملاء الـ PT والجلسات القادمة قبل إيقاف هذا المدرب.",
    replacementTrainer: "المدرب البديل",
    confirmDeactivate: "إيقاف",
    confirmReactivate: "إعادة تفعيل",
    workloadSummary: "العمل الحالي",
    activePackages: "باقات PT نشطة",
    futureSessions: "جلسات قادمة",
    assignedMembers: "أعضاء مُسندون",
    chooseReplacementFirst: "اختر مدرباً بديلاً أولاً.",
    noReplacementTrainer: "هذا المدرب ما زال لديه عمل PT نشط. أضف أو أعد تفعيل مدرب آخر قبل الإيقاف.",
    deactivateFailed: "تعذر إيقاف المدرب.",
    namePlaceholder: "أحمد حسن",
    phonePlaceholder: "+2010...",
    emailPlaceholder: "optional@email.com",
    noTeam: "لا يوجد أعضاء فريق بعد. أضف أول عضو أعلاه.",
    roleDesc_manager: "وصول كامل ما عدا الفواتير",
    roleDesc_staff: "الأعضاء، الحضور، الاشتراكات",
    roleDesc_trainer: "عملاؤه وجلساته فقط",
  },
} as const;

const ROLE_COLORS: Record<string, string> = {
  manager: "bg-info/20 text-info border-info/30",
  staff: "bg-muted text-muted-foreground border-border",
  trainer: "bg-success/20 text-success border-success/30",
};

function formatInviteStatus(status: string | null, acceptedAt: string | null, lang: "en" | "ar") {
  const labels = copy[lang];
  if (acceptedAt) return { text: labels.accepted, color: "text-success" };
  switch (status) {
    case "sent":
    case "pending":
      return { text: labels.pending, color: "text-warning" };
    case "opened":
      return { text: labels.opened, color: "text-warning" };
    case "cancelled":
      return { text: labels.cancelled, color: "text-muted-foreground" };
    case "expired":
      return { text: labels.expired, color: "text-destructive" };
    default:
      return { text: labels.pending, color: "text-warning" };
  }
}

function formatInviteExpiry(value: string | null, lang: "en" | "ar") {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function normalizePhoneInput(value: string) {
  const arabicIndicDigits = "٠١٢٣٤٥٦٧٨٩";
  const easternArabicDigits = "۰۱۲۳۴۵۶۷۸۹";
  let normalized = value
    .trim()
    .replace(/\s+/g, "")
    .replace(/[()\-]/g, "")
    .replace(/[٠-٩]/g, (digit) => String(arabicIndicDigits.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(easternArabicDigits.indexOf(digit)));
  if (normalized.startsWith("00")) normalized = `+${normalized.slice(2)}`;
  return normalized;
}

export default function TeamTab() {
  const { lang } = useLang();
  const labels = copy[lang];
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<StaffMember[]>([]);
  const [message, setMessage] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<StaffMember | null>(null);
  const [replacementTrainerId, setReplacementTrainerId] = useState("");
  const [deactivationError, setDeactivationError] = useState("");
  const [deactivating, setDeactivating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    title: "",
    phone: "",
    email: "",
    role: "staff" as StaffMember["role"],
  });

  async function load() {
    const res = await api.get<StaffMember[]>("/api/staff");
    if (res.success && res.data) setRows(res.data);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function createStaff() {
    if (!form.name.trim() || !form.phone.trim() || saving) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await api.post("/api/staff", {
        name: form.name.trim(),
        title: form.title.trim() || undefined,
        phone: normalizePhoneInput(form.phone),
        email: form.email.trim() || undefined,
        role: form.role,
      });
      if (res.success) {
        setForm({ name: "", title: "", phone: "", email: "", role: "staff" });
        setAddOpen(false);
        setMessage(labels.inviteSent);
        await load();
      } else {
        setMessage(res.message || "");
      }
    } finally {
      setSaving(false);
    }
  }

  async function patchMember(id: string, payload: Record<string, unknown>) {
    const res = await api.patch(`/api/staff/${id}`, payload);
    if (res.success) {
      setMessage(labels.updated);
      await load();
    } else {
      setMessage(res.message || "");
    }
  }

  const replacementOptions = rows.filter(
    (row) => row.role === "trainer" && row.is_active && row.id !== deactivateTarget?.id
  );
  const deactivateTargetHasWorkload = deactivateTarget
    ? Number(deactivateTarget.active_packages_count || 0) > 0 ||
      Number(deactivateTarget.future_sessions_count || 0) > 0 ||
      Number(deactivateTarget.assigned_members_count || 0) > 0
    : false;

  async function confirmDeactivateTrainer() {
    if (!deactivateTarget || deactivating) return;

    if (deactivateTargetHasWorkload && replacementOptions.length === 0) {
      setDeactivationError(labels.noReplacementTrainer);
      return;
    }

    if (deactivateTargetHasWorkload && !replacementTrainerId) {
      setDeactivationError(labels.chooseReplacementFirst);
      return;
    }

    setDeactivating(true);
    setDeactivationError("");
    try {
      const res = await api.patch(`/api/staff/${deactivateTarget.id}`, {
        is_active: false,
        replacement_trainer_staff_user_id: replacementTrainerId || undefined,
      });
      if (!res.success) {
        setDeactivationError(res.message || labels.deactivateFailed);
        return;
      }
      setMessage(labels.updated);
      await load();
      setDeactivateTarget(null);
      setReplacementTrainerId("");
    } catch (error) {
      setDeactivationError(error instanceof Error ? error.message : labels.deactivateFailed);
    } finally {
      setDeactivating(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  const activeRows = rows.filter((row) => row.is_active && !!row.accepted_at);
  const pendingRows = rows.filter((row) => row.is_active && !row.accepted_at);
  const inactiveRows = rows.filter(r => !r.is_active);

  return (
    <div className="space-y-6">
      {/* Header + Add button */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">{labels.title}</h2>
          <p className="text-sm text-muted-foreground">{labels.subtitle}</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5 shrink-0">
          <Plus size={14} />
          {labels.addTitle}
        </Button>
      </div>

      {/* Message feedback */}
      {message && (
        <p className="text-sm text-muted-foreground border-s-2 border-success/40 ps-3">{message}</p>
      )}

      {/* Staff cards */}
      {rows.length === 0 ? (
        <div className="border-2 border-border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">{labels.noTeam}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active staff */}
          {activeRows.map((row) => (
            <StaffCard key={row.id} row={row} labels={labels} lang={lang} onPatch={patchMember} onDeactivate={(r) => { setDeactivateTarget(r); setReplacementTrainerId(""); setDeactivationError(""); }} />
          ))}

          {pendingRows.length > 0 && (
            <>
              <div className="pt-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  {labels.pending} ({pendingRows.length})
                </p>
              </div>
              {pendingRows.map((row) => (
                <StaffCard key={row.id} row={row} labels={labels} lang={lang} onPatch={patchMember} onDeactivate={(r) => { setDeactivateTarget(r); setReplacementTrainerId(""); setDeactivationError(""); }} />
              ))}
            </>
          )}

          {/* Inactive staff — muted section */}
          {inactiveRows.length > 0 && (
            <>
              <div className="pt-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  {labels.inactive} ({inactiveRows.length})
                </p>
              </div>
              {inactiveRows.map((row) => (
                <StaffCard key={row.id} row={row} labels={labels} lang={lang} onPatch={patchMember} onDeactivate={(r) => { setDeactivateTarget(r); setReplacementTrainerId(""); setDeactivationError(""); }} />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Add Team Member Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{labels.addTitle}</DialogTitle>
            <DialogDescription>
              {lang === "ar"
                ? "أدخل بيانات عضو الفريق وحدد الدور قبل إرسال رابط التفعيل على واتساب."
                : "Enter the team member details, choose their role, then send the activation link on WhatsApp."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{labels.name}</Label>
                <Input placeholder={labels.namePlaceholder} value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{labels.jobTitle}</Label>
                <Input placeholder={labels.jobTitlePlaceholder} value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{labels.phone}</Label>
                <Input placeholder={labels.phonePlaceholder} dir="ltr" className="text-start" value={form.phone} onChange={(e) => setForm(prev => ({ ...prev, phone: normalizePhoneInput(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>{labels.email}</Label>
                <Input placeholder={labels.emailPlaceholder} value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{labels.role}</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["manager", "staff", "trainer"] as const).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, role }))}
                    className={`border-2 p-3 text-start transition-colors ${
                      form.role === role
                        ? "border-destructive bg-destructive/5"
                        : "border-border bg-card hover:border-border/80"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">{labels[role]}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {labels[`roleDesc_${role}` as keyof typeof labels]}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button onClick={createStaff} disabled={saving || !form.name.trim() || !form.phone.trim()}>
                {saving ? labels.saving : labels.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Deactivate Trainer Dialog ── */}
      <Dialog open={!!deactivateTarget} onOpenChange={(open) => { if (!open) { setDeactivateTarget(null); setReplacementTrainerId(""); setDeactivationError(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{labels.replacementTitle}</DialogTitle>
            <DialogDescription className="sr-only">{labels.replacementHint}</DialogDescription>
          </DialogHeader>
          {deactivateTarget && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{labels.replacementHint}</p>
              <div className="border-2 border-border p-3 space-y-1 text-sm">
                <p className="font-medium">{labels.workloadSummary}</p>
                <div className="text-muted-foreground space-y-0.5">
                  <p>{labels.activePackages}: <span className="text-foreground font-stat">{Number(deactivateTarget.active_packages_count || 0)}</span></p>
                  <p>{labels.futureSessions}: <span className="text-foreground font-stat">{Number(deactivateTarget.future_sessions_count || 0)}</span></p>
                  <p>{labels.assignedMembers}: <span className="text-foreground font-stat">{Number(deactivateTarget.assigned_members_count || 0)}</span></p>
                </div>
              </div>
              {deactivateTargetHasWorkload && replacementOptions.length === 0 ? (
                <Alert variant="warning">
                  <AlertDescription>{labels.noReplacementTrainer}</AlertDescription>
                </Alert>
              ) : null}
              {deactivateTargetHasWorkload && replacementOptions.length > 0 ? (
                <div className="space-y-2">
                  <Label>{labels.replacementTrainer}</Label>
                  <Select value={replacementTrainerId} onValueChange={setReplacementTrainerId} dir={lang === "ar" ? "rtl" : "ltr"}>
                    <SelectTrigger>
                      <SelectValue placeholder={labels.replacementTrainer} />
                    </SelectTrigger>
                    <SelectContent>
                      {replacementOptions.map((trainer) => (
                        <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!replacementTrainerId ? (
                    <p className="text-xs text-muted-foreground">{labels.chooseReplacementFirst}</p>
                  ) : null}
                </div>
              ) : null}
              {deactivationError ? (
                <Alert variant="destructive">
                  <AlertDescription>{deactivationError}</AlertDescription>
                </Alert>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeactivateTarget(null)} disabled={deactivating}>
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeactivateTrainer}
                  disabled={
                    deactivating ||
                    (deactivateTargetHasWorkload && (!replacementTrainerId || replacementOptions.length === 0))
                  }
                >
                  {deactivating ? labels.saving : labels.confirmDeactivate}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Individual Staff Card ──

function StaffCard({ row, labels, lang, onPatch, onDeactivate }: {
  row: StaffMember;
  labels: typeof copy["en"] | typeof copy["ar"];
  lang: string;
  onPatch: (id: string, payload: Record<string, unknown>) => Promise<void>;
  onDeactivate: (row: StaffMember) => void;
}) {
  const inviteStatus = formatInviteStatus(row.latest_invite_status, row.accepted_at, lang as "en" | "ar");
  const roleColor = ROLE_COLORS[row.role] ?? ROLE_COLORS.staff;
  const isPendingAcceptance = row.is_active && !row.accepted_at;
  const isInactive = !row.is_active;
  const primaryStatus = isPendingAcceptance ? labels.pending : row.is_active ? labels.active : labels.inactive;
  const primaryStatusColor = isPendingAcceptance
    ? "text-warning"
    : row.is_active
      ? "text-success"
      : "text-muted-foreground";
  const statusDotClass = isPendingAcceptance
    ? "bg-warning"
    : row.is_active
      ? "bg-success"
      : "bg-muted-foreground/40";
  const inviteExpiry = formatInviteExpiry(row.latest_invite_expires_at, lang as "en" | "ar");
  const secondaryStatus = isPendingAcceptance
    ? inviteExpiry
      ? `${labels.expires} ${inviteExpiry}`
      : inviteStatus.text
    : inviteStatus.text;

  return (
    <div className={`border-2 bg-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between transition-colors ${
      isInactive ? "border-border/50 opacity-60" : "border-border"
    }`}>
      {/* Left: identity */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Initials avatar */}
        <div className={`h-10 w-10 border-2 flex items-center justify-center shrink-0 ${isInactive ? "border-border/50 bg-muted/30" : "border-border bg-secondary"}`}>
          <span className="font-stat text-sm text-muted-foreground">
            {row.name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground truncate">{row.name}</p>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${roleColor}`}>
              {labels[row.role]}
            </Badge>
          </div>
          {row.title && <p className="text-xs text-muted-foreground truncate">{row.title}</p>}
          <div className="flex items-center gap-3 mt-0.5">
            <span dir="ltr" className="text-xs text-muted-foreground">{row.phone}</span>
            {row.email && <span className="text-xs text-muted-foreground hidden sm:inline">{row.email}</span>}
          </div>
        </div>
      </div>

      {/* Right: status + actions */}
      <div className="flex items-center gap-3 shrink-0 sm:ms-4">
        {/* Status */}
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${statusDotClass}`} />
            <span className={`text-xs font-medium ${primaryStatusColor}`}>
              {primaryStatus}
            </span>
          </div>
          {secondaryStatus ? <span className={`text-[10px] ${inviteStatus.color}`}>{secondaryStatus}</span> : null}
        </div>

        {/* Action buttons */}
        <div className="flex gap-1">
          {!row.accepted_at && row.is_active && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2"
              title={labels.resend}
              onClick={() => onPatch(row.id, { resend_invite: true })}
            >
              <RotateCw size={14} />
              <span className="text-[11px]">{labels.resend}</span>
            </Button>
          )}
          {row.is_active ? (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-destructive/30 text-destructive hover:bg-destructive hover:text-white hover:border-destructive"
              title={labels.deactivate}
              onClick={() => {
                if (row.role === "trainer") {
                  onDeactivate(row);
                } else {
                  onPatch(row.id, { is_active: false });
                }
              }}
            >
              <UserX size={14} />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-success/30 text-success hover:bg-success hover:text-white hover:border-success"
              title={labels.reactivate}
              onClick={() => onPatch(row.id, { is_active: true })}
            >
              <UserCheck size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
