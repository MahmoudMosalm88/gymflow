'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type NotificationItem = {
  notification_id: string;
  source: 'system' | 'broadcast';
  type: string;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical';
  action_url: string | null;
  created_at: string;
  delivered_at: string;
  read_at: string | null;
};

type NotificationsResponse = {
  items: NotificationItem[];
  hasMore: boolean;
  nextCursor: string | null;
};

// System notification i18n — renders in active language regardless of DB text
const SYSTEM_NOTIF_I18N: Record<string, { en: { title: string; body: string }; ar: { title: string; body: string } }> = {
  whatsapp_connecting: {
    en: { title: 'WhatsApp connection started', body: 'Scan the QR code in Settings to finish linking your WhatsApp account.' },
    ar: { title: 'بدأ الاتصال بواتساب', body: 'امسح رمز QR في الإعدادات لإكمال ربط حساب واتساب.' },
  },
  whatsapp_disconnected: {
    en: { title: 'WhatsApp disconnected', body: 'Automatic WhatsApp messages are paused until you reconnect.' },
    ar: { title: 'تم قطع اتصال واتساب', body: 'تم إيقاف رسائل واتساب التلقائية مؤقتاً حتى تعيد الاتصال.' },
  },
  member_created: {
    en: { title: 'New client added', body: 'A new client was added to your client list.' },
    ar: { title: 'تمت إضافة عميل جديد', body: 'تمت إضافة عميل جديد إلى قائمة العملاء.' },
  },
};

export default function NotificationsPage() {
  const { lang } = useLang();
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const unreadCount = useMemo(() => items.filter((x) => !x.read_at).length, [items]);

  async function fetchList(next = false) {
    if (next) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    const params = new URLSearchParams();
    params.set('limit', '25');
    params.set('status', unreadOnly ? 'unread' : 'all');
    if (next && cursor) params.set('cursor', cursor);

    try {
      const res = await api.get<NotificationsResponse>(`/api/notifications?${params.toString()}`);
      if (!res.success || !res.data) return;

      const incoming = Array.isArray(res.data.items) ? res.data.items : [];
      setItems((prev) => (next ? [...prev, ...incoming] : incoming));
      setCursor(res.data.nextCursor || null);
      setHasMore(Boolean(res.data.hasMore));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    void fetchList(false);
  }, [unreadOnly]);

  async function markOneRead(id: string) {
    await api.post(`/api/notifications/${id}/read`, {});
    setItems((prev) => prev.map((item) => (item.notification_id === id ? { ...item, read_at: item.read_at || new Date().toISOString() } : item)));
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      const res = await api.post('/api/notifications/read-all', {});
      if (res.success) {
        setItems((prev) => prev.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
      }
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{t[lang].notifications}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={unreadOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUnreadOnly((v) => !v)}
          >
            {t[lang].unread_only}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={markingAll || unreadCount === 0}
          >
            {markingAll ? t[lang].saving : t[lang].mark_all_read}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{unreadOnly ? t[lang].unread_only : t[lang].all_notifications}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40 mb-3">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p className="text-sm text-muted-foreground">{t[lang].no_notifications}</p>
            </div>
          )}

          {!loading && items.map((item) => {
            const severityColor = item.severity === 'critical' ? 'bg-[#e63946]'
              : item.severity === 'warning' ? 'bg-[#f59e0b]'
              : 'bg-[#3b82f6]';

            // Use i18n text for known system notification types
            const i18n = SYSTEM_NOTIF_I18N[item.type]?.[lang];
            const title = i18n?.title || item.title;
            const body = i18n?.body || item.body;

            return (
              <article
                key={item.notification_id}
                className={`flex border border-[#2a2a2a] ${item.read_at ? 'bg-[#1a1a1a]' : 'bg-[#1e1e1e]'}`}
              >
                {/* Severity strip */}
                <div className={`w-1 shrink-0 ${severityColor}`} />

                <div className="flex-1 p-4">
                  {/* Top row: unread dot + title — timestamp */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {!item.read_at && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[#e63946]" aria-label="unread" />
                      )}
                      <h3 className={`text-sm font-semibold ${item.read_at ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {title}
                      </h3>
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(item.delivered_at, locale)}
                    </time>
                  </div>

                  {/* Body */}
                  {body && (
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-[#8a8578]">{body}</p>
                  )}

                  {/* Actions */}
                  {(!item.read_at || item.action_url) && (
                    <div className="mt-3 flex items-center gap-2">
                      {!item.read_at && (
                        <Button size="sm" variant="outline" onClick={() => void markOneRead(item.notification_id)}>
                          {t[lang].mark_read}
                        </Button>
                      )}
                      {item.action_url && (
                        <Button size="sm" variant="ghost" onClick={() => window.location.assign(item.action_url as string)}>
                          {t[lang].view}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}

          {!loading && hasMore && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void fetchList(true)}
              disabled={loadingMore}
            >
              {loadingMore ? t[lang].loading : t[lang].load_more}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
