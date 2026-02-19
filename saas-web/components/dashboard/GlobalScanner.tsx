'use client';

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { useScanContext, type GlobalScanResult } from '@/lib/scan-context';

// --- Sound helpers (Web Audio API, no files needed) ---

let audioCtx: AudioContext | null = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playBeep(freq: number, durationMs: number) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Audio not available — ignore silently
  }
}

function playSuccess() {
  playBeep(800, 150);
}

function playDenied() {
  playBeep(300, 100);
  setTimeout(() => playBeep(300, 100), 150);
}

// --- Barcode detection constants ---
const MIN_CHARS = 4;
const MAX_SCAN_DURATION_MS = 500; // barcode scanners finish in <300ms, allow margin
const BUFFER_TIMEOUT_MS = 600;

export default function GlobalScanner() {
  const { lang } = useLang();
  const labels = t[lang];
  const { setScan } = useScanContext();

  // Buffer to accumulate fast keystrokes
  const bufferRef = useRef<string>('');
  const firstKeystrokeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const reasonLabels: Record<string, string> = {
    unknown_member: labels.scan_reason_unknown_member,
    cooldown: labels.scan_reason_cooldown,
    already_checked_in_today: labels.scan_reason_already_checked_in_today,
    no_active_subscription: labels.scan_reason_no_active_subscription,
    quota_exceeded: labels.scan_reason_quota_exceeded,
    subscription_frozen: labels.scan_reason_subscription_frozen,
  };

  const handleBarcodeScan = useCallback(async (value: string) => {
    // Clear any barcode text that leaked into a focused input
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      const input = active as HTMLInputElement | HTMLTextAreaElement;
      // Remove the scanned value from the input if it ended up there
      if (input.value.endsWith(value)) {
        input.value = input.value.slice(0, -value.length);
        // Trigger React's onChange by dispatching an input event
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    try {
      const res = await api.post<{
        success: boolean;
        member?: { name: string };
        sessionsRemaining?: number;
        reason?: string;
      }>('/api/attendance/check', {
        scannedValue: value,
        method: 'scan',
      });

      const data = res.data ?? { success: false, reason: labels.error };
      const result: GlobalScanResult = {
        success: data.success,
        memberName: data.member?.name,
        sessionsRemaining: data.sessionsRemaining,
        reason: data.success
          ? undefined
          : (data.reason ? (reasonLabels[data.reason] ?? data.reason) : labels.error),
        timestamp: Date.now(),
      };

      setScan(result);

      if (result.success) {
        playSuccess();
        toast.custom(() => (
          <div className="bg-[#0d2b1a] border-2 border-[#4ade80]/30 px-4 py-3 shadow-[4px_4px_0_#000000] min-w-[280px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <p className="text-sm font-bold text-[#4ade80]">
              {labels.welcome_name.replace('{name}', result.memberName || '')}
            </p>
            {result.sessionsRemaining !== undefined && (
              <p className="text-xs text-[#4ade80]/70">
                {labels.sessions_remaining.replace('{sessions}', String(result.sessionsRemaining))}
              </p>
            )}
          </div>
        ), { duration: 5000, position: lang === 'ar' ? 'top-left' : 'top-right' });
      } else {
        playDenied();
        toast.custom(() => (
          <div className="bg-[#2b0d0d] border-2 border-[#e63946]/30 px-4 py-3 shadow-[4px_4px_0_#000000] min-w-[280px]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <p className="text-sm font-bold text-[#e63946]">
              {lang === 'ar' ? 'دخول مرفوض' : 'Entry Denied'}
            </p>
            <p className="text-xs text-[#e63946]/70">{result.reason}</p>
          </div>
        ), { duration: 5000, position: lang === 'ar' ? 'top-left' : 'top-right' });
      }
    } catch {
      // Network error — ignore (offline mode could be added later)
    }
  }, [lang, labels, reasonLabels, setScan]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys, function keys, etc.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'Enter') {
        const buffer = bufferRef.current;
        const elapsed = Date.now() - firstKeystrokeRef.current;

        // Clear timeout
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Check if this looks like a barcode scan: enough chars, typed fast
        if (buffer.length >= MIN_CHARS && elapsed < MAX_SCAN_DURATION_MS) {
          e.preventDefault();
          e.stopPropagation();
          handleBarcodeScan(buffer);
        }

        // Reset buffer
        bufferRef.current = '';
        firstKeystrokeRef.current = 0;
        return;
      }

      // Only accumulate printable single characters
      if (e.key.length !== 1) return;

      if (bufferRef.current.length === 0) {
        firstKeystrokeRef.current = Date.now();
      }
      bufferRef.current += e.key;

      // Auto-clear buffer after timeout (human typing is slow)
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = '';
        firstKeystrokeRef.current = 0;
      }, BUFFER_TIMEOUT_MS);
    };

    // Use capture phase to intercept before other handlers
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleBarcodeScan]);

  // No visible UI
  return null;
}
