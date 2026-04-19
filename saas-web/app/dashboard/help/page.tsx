'use client';

import { useState, useMemo, useCallback } from 'react';
import { useLang, t } from '@/lib/i18n';
import { useAuth } from '@/lib/use-auth';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  HELP_CATEGORIES,
  HELP_ARTICLES,
  searchArticles,
  getArticlesByCategory,
  type HelpCategory,
  type HelpArticle,
} from '@/lib/help-content';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';

// Category label keys mapped to i18n
const CATEGORY_LABEL_KEYS: Record<HelpCategory, string> = {
  getting_started: 'help_getting_started',
  members: 'help_members',
  subscriptions: 'help_subscriptions',
  guest_passes: 'help_guest_passes',
  pt: 'help_pt',
  whatsapp: 'help_whatsapp',
  reports: 'help_reports',
  income: 'help_income',
  settings: 'help_settings',
  faq: 'help_faq',
};

export default function HelpPage() {
  const { lang } = useLang();
  const { profile } = useAuth();
  const labels = t[lang] as Record<string, string>;

  const [activeCategory, setActiveCategory] = useState<HelpCategory>('getting_started');
  const [searchQuery, setSearchQuery] = useState('');
  const [openArticles, setOpenArticles] = useState<Set<string>>(new Set());

  // Support form state
  const [supportMessage, setSupportMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'success' | 'error' | null>(null);

  // Filter articles by search or active category
  const displayedArticles = useMemo(() => {
    if (searchQuery.trim()) {
      return searchArticles(searchQuery, lang);
    }
    return getArticlesByCategory(activeCategory);
  }, [searchQuery, activeCategory, lang]);

  // Toggle an article open/closed
  const toggleArticle = useCallback((id: string) => {
    setOpenArticles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Send support message via WhatsApp
  const handleSendSupport = useCallback(async () => {
    if (!supportMessage.trim() || sending) return;
    setSending(true);
    setSendResult(null);
    try {
      await api.post('/api/support/message', { message: supportMessage.trim() });
      setSendResult('success');
      setSupportMessage('');
    } catch {
      setSendResult('error');
    }
    setSending(false);
  }, [supportMessage, sending]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight text-foreground">
          {labels.help}
        </h1>
        <p className="text-sm text-muted-foreground">{labels.help_subtitle}</p>
      </div>

      {/* ── Search ── */}
      <Input
        type="text"
        placeholder={labels.help_search_placeholder}
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setSendResult(null);
        }}
        className="max-w-md"
      />

      {/* ── Category Tabs ── */}
      {!searchQuery.trim() && (
        <div
          className="flex gap-0 border-b border-border -mb-2 overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label={labels.help}
        >
          {HELP_CATEGORIES.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCategory === cat}
              onClick={() => {
                setActiveCategory(cat);
                setOpenArticles(new Set());
              }}
              className={cn(
                'px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-[3px] -mb-[1px]',
                activeCategory === cat
                  ? 'border-destructive text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {labels[CATEGORY_LABEL_KEYS[cat]] || cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Search indicator ── */}
      {searchQuery.trim() && (
        <p className="text-sm text-muted-foreground">
          {lang === 'ar'
            ? `${displayedArticles.length} نتيجة في جميع الأقسام`
            : `${displayedArticles.length} result${displayedArticles.length !== 1 ? 's' : ''} across all categories`}
        </p>
      )}

      {/* ── Articles ── */}
      <div className="flex flex-col gap-3" role="tabpanel">
        {displayedArticles.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {labels.help_no_results}
          </p>
        ) : (
          displayedArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              lang={lang}
              open={openArticles.has(article.id)}
              onToggle={() => toggleArticle(article.id)}
            />
          ))
        )}
      </div>

      {/* ── Contact Support ── */}
      <Card>
        <CardHeader>
          <CardTitle>{labels.help_contact_support}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-attached context */}
          {profile && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              {profile.organizationName && (
                <span>{lang === 'ar' ? 'الصالة' : 'Gym'}: {profile.organizationName}</span>
              )}
              {profile.branchName && (
                <span>{lang === 'ar' ? 'الفرع' : 'Branch'}: {profile.branchName}</span>
              )}
            </div>
          )}

          <textarea
            value={supportMessage}
            onChange={(e) => {
              setSupportMessage(e.target.value);
              setSendResult(null);
            }}
            placeholder={labels.help_message_placeholder}
            rows={4}
            className="w-full px-4 py-3 bg-card border-2 border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-destructive resize-none"
          />

          {/* Feedback */}
          {sendResult === 'success' && (
            <p className="text-sm text-success font-medium">{labels.help_message_sent}</p>
          )}
          {sendResult === 'error' && (
            <p className="text-sm text-destructive font-medium">{labels.help_message_failed}</p>
          )}

          <button
            onClick={handleSendSupport}
            disabled={!supportMessage.trim() || sending}
            className={cn(
              'px-6 py-2.5 text-sm font-semibold border-2 border-border transition-colors',
              supportMessage.trim() && !sending
                ? 'bg-destructive text-white border-destructive hover:bg-destructive/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {sending
              ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending...')
              : labels.help_send_message}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Article Card with Collapsible ──
function ArticleCard({
  article,
  lang,
  open,
  onToggle,
}: {
  article: HelpArticle;
  lang: 'en' | 'ar';
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <Card className="transition-colors hover:border-muted-foreground/40">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-6 py-4 text-start">
            <span className="text-sm font-semibold text-foreground">
              {article.title[lang]}
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={cn(
                'shrink-0 text-muted-foreground transition-transform ms-4',
                open && 'rotate-180'
              )}
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-6 pb-5 pt-0 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {article.content[lang]}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
