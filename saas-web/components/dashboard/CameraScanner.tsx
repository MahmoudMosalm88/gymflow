'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { prepareZXingModule } from 'barcode-detector';

const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner),
  { ssr: false }
);

type ScanResult = {
  success: boolean;
  memberName?: string;
  sessionsRemaining?: number;
  reason?: string;
  memberPhoto?: string;
  offline?: boolean;
};

type CameraScannerProps = {
  lang: 'en' | 'ar';
  labels: {
    closeCamera: string;
    cameraTitle: string;
    cameraHint: string;
    cameraLoading: string;
    cameraUnsupported: string;
    cameraPermissionDenied: string;
    cameraFallback: string;
    offlineBadge: string;
    entryDenied: string;
    welcomeName: string;
    sessionsRemaining: string;
  };
  active: boolean;
  processing: boolean;
  result: ScanResult | null;
  onClose: () => void;
  onDetect: (value: string) => void;
};

function getCameraErrorMessage(error: unknown, labels: CameraScannerProps['labels']) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lowered = message.toLowerCase();

  if (lowered.includes('permission') || lowered.includes('notallowederror')) {
    return labels.cameraPermissionDenied;
  }

  if (lowered.includes('notfounderror') || lowered.includes('no camera')) {
    return labels.cameraUnsupported;
  }

  return labels.cameraFallback;
}

export default function CameraScanner({
  lang,
  labels,
  active,
  processing,
  result,
  onClose,
  onDetect
}: CameraScannerProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastValue, setLastValue] = useState('');
  const [preferEnvironmentCamera, setPreferEnvironmentCamera] = useState(true);
  const [scannerReady, setScannerReady] = useState(false);

  const isRtl = lang === 'ar';

  useEffect(() => {
    prepareZXingModule({
      overrides: {
        locateFile: (path, prefix) => {
          if (path.endsWith('.wasm')) {
            return '/vendor/zxing_reader.wasm';
          }
          return `${prefix}${path}`;
        }
      }
    });
    setScannerReady(true);
  }, []);

  useEffect(() => {
    if (!active) {
      setCameraError(null);
      setLastValue('');
      setPreferEnvironmentCamera(true);
    }
  }, [active]);

  useEffect(() => {
    if (!result && !processing) {
      setLastValue('');
    }
  }, [processing, result]);

  const scannerBody = useMemo(() => {
    if (!active || !scannerReady) return null;

    return (
      <Scanner
        onScan={(codes) => {
          const value = codes[0]?.rawValue?.trim();
          if (!value || value === lastValue || processing || result) return;
          setLastValue(value);
          setCameraError(null);
          onDetect(value);
        }}
        onError={(error) => {
          const message = error instanceof Error ? error.message : String(error ?? '');
          const lowered = message.toLowerCase();

          // Laptops often have only one front-facing webcam. If rear-camera preference
          // fails, retry with the browser's default camera instead of showing a dead view.
          if (
            preferEnvironmentCamera &&
            (lowered.includes('notfounderror') ||
              lowered.includes('overconstrained') ||
              lowered.includes('could not start video source'))
          ) {
            setPreferEnvironmentCamera(false);
            setCameraError(null);
            return;
          }

          setCameraError(getCameraErrorMessage(error, labels));
        }}
        constraints={{
          ...(preferEnvironmentCamera ? { facingMode: { ideal: 'environment' } } : {}),
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }}
        formats={['qr_code']}
        paused={processing || Boolean(result)}
        scanDelay={750}
        allowMultiple={true}
        sound={false}
        components={{
          finder: true,
          torch: true
        }}
        styles={{
          container: {
            width: '100%',
            height: '100%',
            borderRadius: 0
          },
          video: {
            objectFit: 'cover'
          }
        }}
        classNames={{
          container: 'h-full w-full overflow-hidden bg-black',
          video: 'h-full w-full object-cover'
        }}
      />
    );
  }, [active, labels, lastValue, onDetect, preferEnvironmentCamera, processing, result, scannerReady]);

  if (!active) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black text-white" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0">{scannerBody}</div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/90 via-black/55 to-transparent px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              {labels.cameraTitle}
            </p>
            <p className="mt-2 max-w-xl text-sm text-white/90">{labels.cameraHint}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            className="pointer-events-auto border-white/30 bg-black/40 text-white hover:bg-black/70 hover:text-white"
            aria-label={labels.closeCamera}
          >
            <X />
          </Button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-4 py-5 sm:px-6">
        {cameraError ? (
          <div className="pointer-events-auto max-w-xl border-2 border-destructive/80 bg-black/70 p-4 shadow-[6px_6px_0_#000000]">
            <p className="text-sm font-semibold text-destructive">{labels.entryDenied}</p>
            <p className="mt-2 text-sm text-white/85">{cameraError}</p>
          </div>
        ) : processing ? (
          <div className="max-w-sm border-2 border-white/20 bg-black/60 p-4 shadow-[6px_6px_0_#000000]">
            <div className="flex items-center gap-3">
              <Camera className="h-5 w-5 text-white/70" />
              <p className="text-sm font-medium text-white/90">{labels.cameraLoading}</p>
            </div>
          </div>
        ) : result ? (
          <div
            className={`pointer-events-auto max-w-xl border-2 p-4 shadow-[6px_6px_0_#000000] ${
              result.success
                ? 'border-emerald-400/80 bg-emerald-950/80'
                : 'border-destructive/80 bg-black/70'
            }`}
          >
            <div className="flex items-center gap-4">
              {result.memberPhoto ? (
                <img
                  src={result.memberPhoto}
                  alt={result.memberName || ''}
                  className="h-14 w-14 shrink-0 border-2 border-white/20 object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-white/20 bg-white/5">
                  <Camera className="h-6 w-6 text-white/60" />
                </div>
              )}
              <div className="min-w-0">
                <p className={`text-lg font-bold ${result.success ? 'text-emerald-200' : 'text-destructive'}`}>
                  {result.success
                    ? labels.welcomeName.replace('{name}', result.memberName || '')
                    : labels.entryDenied}
                </p>
                {result.success && result.sessionsRemaining !== undefined ? (
                  <p className="mt-1 text-sm text-emerald-100/85">
                    {labels.sessionsRemaining.replace('{sessions}', String(result.sessionsRemaining))}
                  </p>
                ) : null}
                {!result.success && result.reason ? (
                  <p className="mt-1 text-sm text-white/85">{result.reason}</p>
                ) : null}
                {result.offline ? (
                  <p className="mt-2 inline-flex border border-white/20 px-2 py-1 text-xs uppercase tracking-[0.12em] text-white/75">
                    {labels.offlineBadge}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
