'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Props = {
  subscriptionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFrozen: () => void;
};

export default function FreezeDialog({ subscriptionId, open, onOpenChange, onFrozen }: Props) {
  const { lang } = useLang();
  const labels = t[lang];
  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [startDate, setStartDate] = useState<Date>(today);
  const [days, setDays] = useState(3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Calculate end date for display
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);

  const formatDisplay = (d: Date) =>
    d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    const startUnix = Math.floor(startDate.getTime() / 1000);

    try {
      const res = await api.post(`/api/subscriptions/${subscriptionId}/freeze`, {
        startDate: startUnix,
        days,
      });
      if (res.success) {
        onFrozen();
        onOpenChange(false);
      } else {
        setError(res.message || labels.error);
      }
    } catch {
      setError(labels.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md bg-[#141414] border-[#2a2a2a]"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <DialogHeader>
          <DialogTitle className="text-[#e8e4df]">{labels.freeze_subscription}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Start date with calendar popover */}
          <div>
            <label className="text-xs text-[#8a8578] block mb-1.5">{labels.freeze_start}</label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#3a3a3a] text-sm text-[#e8e4df] text-start hover:border-[#e63946] transition-colors flex items-center justify-between"
                >
                  <span>{formatDisplay(startDate)}</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#8a8578" strokeWidth="1.5">
                    <rect x="2" y="3" width="12" height="11" rx="0" />
                    <path d="M2 6h12M5 1v3M11 1v3" />
                  </svg>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#141414] border-[#2a2a2a]" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => {
                    if (d) {
                      setStartDate(d);
                      setCalendarOpen(false);
                    }
                  }}
                  disabled={(d) => d < today}
                  className="[--cell-size:2.75rem]"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Days selector — larger touch targets for mobile */}
          <div>
            <label className="text-xs text-[#8a8578] block mb-1.5">
              {labels.freeze_days} <span className="text-[#8a8578]/60">({labels.max_freeze_days})</span>
            </label>
            <div className="grid grid-cols-7 gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`py-3 text-base font-medium border transition-colors ${
                    days === d
                      ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                      : 'bg-[#1e1e1e] border-[#2a2a2a] text-[#8a8578] hover:text-[#e8e4df]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* End date display */}
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] px-4 py-3">
            <p className="text-xs text-[#8a8578]">{labels.freeze_end}</p>
            <p className="text-sm font-medium text-[#e8e4df]">{formatDisplay(endDate)}</p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-[#e63946]">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {labels.cancel}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#e63946] hover:bg-[#d32f3b] text-white"
            >
              {submitting ? labels.loading : labels.freeze_confirm}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
