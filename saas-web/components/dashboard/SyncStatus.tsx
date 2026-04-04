"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { getOfflineWarningState } from "@/lib/offline/read-model";
import { getOperationCounts, retryAllFailedOperations } from "@/lib/offline/operations";
import { getReviewQueueSummary, triggerSync } from "@/lib/offline/sync-manager";
import { getFailedCount, getPendingCount, getSyncingCount } from "@/lib/offline/sync-queue";

type ReviewItem = {
  id: string;
  kind: string;
  message: string;
  updatedAt: number;
};

function formatRelativeAge(seconds: number, lang: "en" | "ar") {
  const hours = Math.floor(seconds / 3600);
  if (lang === "ar") return `${hours} ساعة`;
  return `${hours}h`;
}

export default function SyncStatus() {
  const { lang } = useLang();
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [online, setOnline] = useState(true);
  const [open, setOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [stale, setStale] = useState<{ stale: boolean; ageSeconds: number; maxAgeHours: number } | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);

    const updateCounts = async () => {
      try {
        const [checkinPending, checkinFailed, checkinSyncing, operationCounts, reviewSummary, staleState] = await Promise.all([
          getPendingCount(),
          getFailedCount(),
          getSyncingCount(),
          getOperationCounts(),
          getReviewQueueSummary(),
          getOfflineWarningState(),
        ]);

        setPending(checkinPending + checkinSyncing + operationCounts.pending + operationCounts.syncing);
        setFailed(checkinFailed + operationCounts.failed);
        setReviewItems(reviewSummary);
        setStale(staleState);
      } catch {
        // Ignore unavailable IndexedDB states.
      }
    };

    void updateCounts();
    const interval = setInterval(() => void updateCounts(), 5000);

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const labels = useMemo(() => {
    if (lang === "ar") {
      return {
        offline: "أوفلاين",
        syncing: "قيد المزامنة",
        synced: "تمت المزامنة",
        review: "بحاجة مراجعة",
        stale: "البيانات قديمة",
        details: "تفاصيل الأوفلاين",
        syncNow: "زامن الآن",
        retryFailed: "أعد محاولة الفاشل",
        noIssues: "لا توجد عمليات أوفلاين معلقة حالياً.",
        age: "عمر البيانات المخزنة",
        max: "الحد الموصى به",
      };
    }
    return {
      offline: "Offline",
      syncing: "Syncing",
      synced: "Synced",
      review: "Needs Review",
      stale: "Stale Cache",
      details: "Offline Sync",
      syncNow: "Sync now",
      retryFailed: "Retry failed",
      noIssues: "No offline operations need attention right now.",
      age: "Cached data age",
      max: "Recommended max",
    };
  }, [lang]);

  if (online && pending === 0 && failed === 0 && !stale?.stale) return null;

  const dotColor = failed > 0
    ? "bg-red-500"
    : pending > 0
      ? "bg-orange-400"
      : !online
        ? "bg-gray-500"
        : stale?.stale
          ? "bg-yellow-400"
          : "bg-green-500";

  const label = !online
    ? stale?.stale ? `${labels.offline} · ${labels.stale}` : labels.offline
    : failed > 0
      ? `${failed} ${labels.review}`
      : pending > 0
        ? `${pending} ${labels.syncing}`
        : stale?.stale
          ? labels.stale
          : labels.synced;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#8a8578] hover:text-[#e8e4df] transition-colors"
        title={labels.details}
      >
        <span className={`w-2 h-2 ${dotColor} ${pending > 0 && online ? "animate-pulse" : ""}`} />
        {label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{labels.details}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between border border-border p-3">
              <span>{labels.syncing}</span>
              <span className="font-semibold">{pending}</span>
            </div>
            <div className="flex items-center justify-between border border-border p-3">
              <span>{labels.review}</span>
              <span className="font-semibold">{failed}</span>
            </div>

            {stale ? (
              <div className={`border p-3 ${stale.stale ? "border-yellow-500/40 bg-yellow-500/10" : "border-border"}`}>
                <div className="flex items-center justify-between">
                  <span>{labels.age}</span>
                  <span className="font-semibold">{formatRelativeAge(stale.ageSeconds, lang)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{labels.max}</span>
                  <span>{stale.maxAgeHours}h</span>
                </div>
              </div>
            ) : null}

            {reviewItems.length > 0 ? (
              <div className="max-h-64 overflow-y-auto border border-border">
                {reviewItems.map((item) => (
                  <div key={item.id} className="border-b border-border px-3 py-3 last:border-b-0">
                    <p className="font-medium">{item.kind.replace(/_/g, " ")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{labels.noIssues}</p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  void retryAllFailedOperations();
                }}
                disabled={failed === 0}
              >
                {labels.retryFailed}
              </Button>
              <Button
                onClick={() => {
                  triggerSync();
                }}
                disabled={!online || pending === 0}
              >
                {labels.syncNow}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
