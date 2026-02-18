"use client";

import { useEffect, useState } from "react";
import { getPendingCount, getFailedCount } from "@/lib/offline/sync-queue";
import { triggerSync } from "@/lib/offline/sync-manager";

/**
 * Small indicator showing offline sync queue status.
 * Green = all synced, Orange = items pending, Red = failed items.
 */
export default function SyncStatus() {
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Check initial online state
    setOnline(navigator.onLine);

    const updateCounts = async () => {
      try {
        setPending(await getPendingCount());
        setFailed(await getFailedCount());
      } catch {
        // IndexedDB not available
      }
    };

    updateCounts();
    const interval = setInterval(updateCounts, 5000);

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

  // Nothing to show when everything is clean and online
  if (online && pending === 0 && failed === 0) return null;

  const dotColor = failed > 0
    ? "bg-red-500"
    : pending > 0
      ? "bg-orange-400"
      : online
        ? "bg-green-500"
        : "bg-gray-500";

  const label = !online
    ? "Offline"
    : failed > 0
      ? `${failed} failed`
      : pending > 0
        ? `${pending} syncing`
        : "Synced";

  return (
    <button
      type="button"
      onClick={() => { if (online && pending > 0) triggerSync(); }}
      className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#8a8578] hover:text-[#e8e4df] transition-colors"
      title={online ? "Click to sync now" : "Waiting for connection"}
    >
      <span className={`w-2 h-2 ${dotColor} ${pending > 0 && online ? "animate-pulse" : ""}`} />
      {label}
    </button>
  );
}
