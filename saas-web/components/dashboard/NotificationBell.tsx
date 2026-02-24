'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

type NotificationItem = {
  notification_id: string;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
  delivered_at: string;
};

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

type NotificationsResponse = {
  items: NotificationItem[];
};

type UnreadCountResponse = {
  unread: number;
};

export default function NotificationBell() {
  const { lang } = useLang();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  const unreadLabel = useMemo(() => (unread > 99 ? '99+' : String(unread)), [unread]);

  async function load() {
    try {
      const [countRes, listRes] = await Promise.all([
        api.get<UnreadCountResponse>('/api/notifications/unread-count'),
        api.get<NotificationsResponse>('/api/notifications?limit=5&status=all'),
      ]);

      if (countRes.success && countRes.data) {
        setUnread(Number(countRes.data.unread || 0));
      }
      if (listRes.success && listRes.data) {
        setItems(Array.isArray(listRes.data.items) ? listRes.data.items : []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = window.setInterval(load, 30000);
    return () => window.clearInterval(id);
  }, []);

  async function markRead(id: string, actionUrl: string | null) {
    await api.post(`/api/notifications/${id}/read`, {});
    if (actionUrl) {
      window.location.assign(actionUrl);
      return;
    }
    await load();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative border-[#2a2a2a] bg-[#1e1e1e] hover:bg-[#262626]" aria-label={t[lang].notifications}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
            <path d="M9 17a3 3 0 0 0 6 0" />
          </svg>
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 min-w-[18px] bg-[#e63946] px-1 py-0.5 text-[10px] font-bold leading-none text-white text-center">
              {unreadLabel}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[320px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>{t[lang].notifications}</span>
          <Link href="/dashboard/notifications" className="text-xs text-[#e63946] hover:underline">
            {t[lang].view_all}
          </Link>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading && <DropdownMenuItem disabled>{t[lang].loading}</DropdownMenuItem>}

        {!loading && items.length === 0 && (
          <DropdownMenuItem disabled>{t[lang].no_notifications}</DropdownMenuItem>
        )}

        {!loading &&
          items.map((item) => {
            const i18n = SYSTEM_NOTIF_I18N[item.type]?.[lang];
            const title = i18n?.title || item.title;
            const body = i18n?.body || item.body;
            return (
            <DropdownMenuItem
              key={item.notification_id}
              className="block cursor-pointer"
              onSelect={(event) => {
                event.preventDefault();
                void markRead(item.notification_id, item.action_url);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(item.delivered_at, locale)}</p>
                </div>
                {!item.read_at && <span className="mt-1 h-2 w-2 rounded-full bg-[#e63946]" />}
              </div>
            </DropdownMenuItem>
          ); })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
