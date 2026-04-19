'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import PullToRefresh from '@/components/dashboard/mobile/PullToRefresh';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { NotificationListItem, NotificationListResponse } from '@/lib/notifications';


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

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-destructive',
  warning: 'bg-warning',
  info: 'bg-info',
};

// Group notifications by date
function getDateGroup(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  if (date >= today) return lang === 'ar' ? 'اليوم' : 'Today';
  if (date >= yesterday) return lang === 'ar' ? 'أمس' : 'Yesterday';
  if (date >= weekAgo) return lang === 'ar' ? 'هذا الأسبوع' : 'This Week';
  return lang === 'ar' ? 'أقدم' : 'Older';
}

export default function NotificationsPage() {
  const router = useRouter();
  const { lang } = useLang();
  const labels = t[lang];
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';



  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const unreadCount = useMemo(() => items.filter((x) => !x.read_at).length, [items]);

  // Group items by date
  const grouped = useMemo(() => {
    const groups: { label: string; items: NotificationListItem[] }[] = [];
    let currentLabel = '';
    for (const item of items) {
      const label = getDateGroup(item.delivered_at, lang);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, items: [] });
      }
      groups[groups.length - 1].items.push(item);
    }
    return groups;
  }, [items, lang]);

  async function fetchList(next = false) {
    if (next) setLoadingMore(true);
    else setLoading(true);

    const params = new URLSearchParams();
    params.set('limit', '25');
    params.set('status', unreadOnly ? 'unread' : 'all');
    if (next && cursor) params.set('cursor', cursor);

    try {
      const res = await api.get<NotificationListResponse>(`/api/notifications?${params.toString()}`);
      if (!res.success || !res.data) return;
      const incoming = Array.isArray(res.data.items) ? res.data.items : [];
      setItems((prev) => (next ? [...prev, ...incoming] : incoming));
      setCursor(res.data.nextCursor || null);
      setHasMore(Boolean(res.data.hasMore));
    } catch {
      toast.error(lang === 'ar' ? 'تعذر تحميل الإشعارات' : 'Failed to load notifications');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    void fetchList(false);
  }, [unreadOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  async function markOneRead(id: string) {
    if (markingId) return;
    setMarkingId(id);
    try {
      await api.post(`/api/notifications/${id}/read`, {});
      setItems((prev) => prev.map((item) => (item.notification_id === id ? { ...item, read_at: item.read_at || new Date().toISOString() } : item)));
    } catch {
      toast.error(lang === 'ar' ? 'تعذر تحديث الإشعار' : 'Failed to mark as read');
    } finally {
      setMarkingId(null);
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      const res = await api.post('/api/notifications/read-all', {});
      if (res.success) {
        setItems((prev) => prev.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
      }
    } catch {
      toast.error(lang === 'ar' ? 'تعذر تحديث الإشعارات' : 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-heading font-bold tracking-tight">{labels.notifications}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={unreadOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUnreadOnly((v) => !v)}
          >
            {labels.unread_only}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={markingAll || unreadCount === 0}
          >
            {markingAll ? labels.saving : labels.mark_all_read}
          </Button>
        </div>
      </div>

      {/* Notifications list */}
      <PullToRefresh onRefresh={() => fetchList(false)}>
      <Card className="mt-5 shadow-[6px_6px_0_#000000]">
        <CardHeader>
          <CardTitle className="text-sm">{unreadOnly ? labels.unread_only : labels.all_notifications}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          )}

          {!loading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40 mb-3">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p className="text-sm text-muted-foreground">{labels.no_notifications}</p>
            </div>
          )}

          {!loading && grouped.length > 0 && (
            <div role="list" aria-label={labels.notifications}>
              {grouped.map((group) => (
                <div key={group.label}>
                  {/* Date group label */}
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest pt-4 pb-2 first:pt-0">
                    {group.label}
                  </p>

                  {group.items.map((item) => {
                    const severityColor = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.info;
                    const i18n = SYSTEM_NOTIF_I18N[item.type]?.[lang];
                    const title = i18n?.title || item.title;
                    const body = i18n?.body || item.body;

                    return (
                      <article
                        key={item.notification_id}
                        role="listitem"
                        className={`flex border-2 mb-2 ${item.read_at ? 'border-border bg-background' : 'border-border bg-card'}`}
                      >
                        {/* Severity strip */}
                        <div className={`w-1 shrink-0 ${severityColor}`} />

                        <div className="flex-1 p-3">
                          {/* Top row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {!item.read_at && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" aria-label="unread" />
                              )}
                              <h3 className={`text-sm font-semibold truncate ${item.read_at ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {title}
                              </h3>
                            </div>
                            <time className="shrink-0 text-xs text-muted-foreground tabular-nums">
                              {formatDateTime(item.delivered_at, locale)}
                            </time>
                          </div>

                          {/* Body */}
                          {body && (
                            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{body}</p>
                          )}

                          {/* Actions */}
                          {(!item.read_at || item.action_url) && (
                            <div className="mt-2 flex items-center gap-2">
                              {!item.read_at && (
                                <Button size="sm" variant="outline" className="h-9 text-xs" disabled={markingId === item.notification_id} onClick={() => void markOneRead(item.notification_id)}>
                                  {labels.mark_read}
                                </Button>
                              )}
                              {item.action_url && (
                                <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => router.push(item.action_url as string)}>
                                  {labels.view}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {!loading && hasMore && (
            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={() => void fetchList(true)}
              disabled={loadingMore}
            >
              {loadingMore ? labels.loading : labels.load_more}
            </Button>
          )}
        </CardContent>
      </Card>
      </PullToRefresh>
    </div>
  );
}
