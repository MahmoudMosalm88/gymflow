'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type WhatsAppStatus = {
  connected: boolean;
  state?: string;
  phone?: string;
  qrCode?: string;
};

export default function WhatsAppTab() {
  const { lang } = useLang();
  const labels = t[lang];
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get<WhatsAppStatus>('/api/whatsapp/status');
      if (res.success && res.data) {
        setStatus(res.data);
      } else {
        setError(res.message ?? 'Failed to fetch WhatsApp status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(() => { fetchStatus(); }, 5000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const handleConnect = async () => {
    setActing(true);
    setError(null);
    try {
      const res = await api.post('/api/whatsapp/connect', {});
      if (!res.success) throw new Error(res.message ?? 'Failed to start WhatsApp connection');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(false);
    }
  };

  const handleDisconnect = async () => {
    setActing(true);
    setError(null);
    try {
      const res = await api.post('/api/whatsapp/disconnect', {});
      if (!res.success) throw new Error(res.message ?? 'Failed to disconnect WhatsApp');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const state = status?.state ?? (status?.connected ? 'connected' : 'disconnected');
  const connected = status?.connected ?? state === 'connected';
  const connecting = state === 'connecting' && !connected;
  const showWaitingQr = connecting && !status?.qrCode;
  const statusText = connected ? labels.connected : connecting ? (labels.connecting ?? 'Connecting...') : labels.disconnected;

  const badgeDotColor = connected ? 'bg-emerald-500' : connecting ? 'bg-amber-400' : 'bg-red-500';
  const badgeBgColor = connected
    ? 'bg-emerald-900/40 text-emerald-400 border-emerald-700'
    : connecting
    ? 'bg-amber-900/40 text-amber-400 border-amber-700'
    : 'bg-red-900/40 text-red-400 border-red-700';

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp {labels.integration}</CardTitle>
        <CardDescription>{labels.whatsapp_integration_description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold border ${badgeBgColor}`}>
            <span className={`h-2 w-2 rounded-full ${badgeDotColor}`} />
            {statusText}
          </span>
          {connected && status?.phone && (
            <span className="text-foreground font-medium">{status.phone}</span>
          )}
        </div>

        {!connected && status?.qrCode && (
          <div className="flex flex-col items-center justify-center space-y-3">
            <p className="text-muted-foreground">{labels.scan_qr_code}</p>
            <img src={`data:image/png;base64,${status.qrCode}`} alt="WhatsApp QR Code" className="h-48 w-48 border-2 border-border" />
            <p className="text-sm text-muted-foreground">{labels.scan_qr_instructions}</p>
          </div>
        )}

        {showWaitingQr && (
          <div className="h-48 w-48 border-2 border-border flex items-center justify-center text-sm text-muted-foreground">
            {labels.waiting_for_qr}
          </div>
        )}

        <div>
          {connected ? (
            <Button onClick={handleDisconnect} disabled={acting} variant="destructive" className="min-w-[120px]">
              {acting ? labels.disconnecting : labels.disconnect}
            </Button>
          ) : connecting ? (
            <Button onClick={handleDisconnect} disabled={acting} variant="outline" className="min-w-[120px]">
              {acting ? labels.disconnecting : (labels.cancel ?? 'Cancel')}
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={acting} className="min-w-[120px]">
              {acting ? labels.connecting : labels.connect}
            </Button>
          )}
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
