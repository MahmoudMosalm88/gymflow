'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import { toUnixSeconds } from '@/lib/subscription-dates';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const schema = z.object({
  // Member fields
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(5, 'Phone number is required'),
  gender: z.enum(['male', 'female']),
  access_tier: z.enum(['full', 'limited']),
  card_code: z.string().optional(),
  address: z.string().optional(),
  // Subscription fields
  plan_months: z.enum(['1', '3', '6', '12', '18', '24']),
  sessions_per_month: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().int().positive().optional()
  ),
  price_paid: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().optional()
  ),
  // Existing member toggle
  is_existing: z.boolean().default(false),
  start_date_str: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export default function AddMemberModal({ open, onClose, onSuccess }: Props) {
  const { lang } = useLang();
  const labels = t[lang];
  const isRtl = lang === 'ar';

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: '',
      phone: '',
      gender: 'male',
      access_tier: 'full',
      card_code: '',
      address: '',
      plan_months: '1',
      sessions_per_month: undefined,
      price_paid: undefined,
      is_existing: false,
      start_date_str: '',
    },
  });

  const isExisting = form.watch('is_existing');

  const handleClose = () => {
    form.reset();
    setError('');
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setError('');

    try {
      // 1. Create the member
      const memberRes = await api.post<{ id: string }>('/api/members', {
        name: data.name,
        phone: data.phone,
        gender: data.gender,
        access_tier: data.access_tier,
        card_code: data.card_code || null,
        address: data.address || null,
      });

      if (!memberRes.success || !memberRes.data?.id) {
        throw new Error(memberRes.message || labels.error);
      }

      const memberId = memberRes.data.id;

      // 2. Compute start & end dates
      const planMonths = parseInt(data.plan_months, 10);

      let startDate: Date;
      if (data.is_existing && data.start_date_str) {
        startDate = parseDateInput(data.start_date_str);
      } else {
        startDate = new Date();
        // Normalize to start of day
        startDate.setHours(0, 0, 0, 0);
      }

      const startTs = toUnixSeconds(startDate);

      // 3. Create the subscription
      const subRes = await api.post('/api/subscriptions', {
        member_id: memberId,
        start_date: startTs,
        plan_months: planMonths,
        sessions_per_month: data.sessions_per_month ?? null,
        price_paid: data.price_paid ?? null,
      });

      if (!subRes.success) {
        throw new Error(subRes.message || labels.error);
      }

      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err?.message || labels.error);
    } finally {
      setSubmitting(false);
    }
  };

  // Shared radio button styles
  const radioOption = (selected: boolean) =>
    `flex-1 py-2 px-3 text-sm font-medium border-2 cursor-pointer text-center transition-colors ${
      selected
        ? 'border-[#e63946] bg-[#2b0d0d] text-[#e63946]'
        : 'border-[#2a2a2a] bg-[#1e1e1e] text-[#8a8578] hover:border-[#3a3a3a]'
    }`;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar p-0"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#2a2a2a]">
          <DialogTitle className="text-xl font-bold">{labels.add_member}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 pb-6 pt-4 space-y-5">

            {/* ── Member Info ── */}
            <p className="text-xs font-semibold uppercase tracking-wider text-[#8a8578]">
              {labels.member_information}
            </p>

            {/* Name */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>{labels.name} *</FormLabel>
                <FormControl>
                  <Input placeholder={labels.member_name_placeholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Phone */}
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>{labels.phone} *</FormLabel>
                <FormControl>
                  <Input placeholder={labels.phone_placeholder} dir="ltr" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Gender */}
            <FormField control={form.control} name="gender" render={({ field }) => (
              <FormItem>
                <FormLabel>{labels.gender}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={labels.select_gender} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">{labels.male}</SelectItem>
                    <SelectItem value="female">{labels.female}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Access Tier — radio buttons */}
            <FormField control={form.control} name="access_tier" render={({ field }) => (
              <FormItem>
                <FormLabel>{labels.access_tier}</FormLabel>
                <FormControl>
                  <div className="flex gap-0">
                    <button
                      type="button"
                      className={radioOption(field.value === 'full')}
                      onClick={() => field.onChange('full')}
                    >
                      {labels.access_tier_full}
                    </button>
                    <button
                      type="button"
                      className={radioOption(field.value === 'limited')}
                      onClick={() => field.onChange('limited')}
                    >
                      {labels.access_tier_limited}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Card Code */}
            <FormField control={form.control} name="card_code" render={({ field }) => (
              <FormItem>
                <FormLabel>{labels.card_code}</FormLabel>
                <FormControl>
                  <Input placeholder={labels.card_code_placeholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Address */}
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>{labels.address}</FormLabel>
                <FormControl>
                  <Input placeholder={labels.address_placeholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* ── Subscription ── */}
            <div className="pt-2 border-t border-border" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {labels.subscription}
            </p>

            {/* Plan Duration — radio buttons */}
            <FormField control={form.control} name="plan_months" render={({ field }) => (
              <FormItem>
                <FormLabel>{labels.plan_duration}</FormLabel>
                <FormControl>
                  <div className="flex flex-wrap gap-0">
                    {(['1', '3', '6', '12', '18', '24'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={radioOption(field.value === m)}
                        onClick={() => field.onChange(m)}
                      >
                        {labels[`month_${m}` as keyof typeof labels]}
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Sessions per Month */}
            <FormField control={form.control} name="sessions_per_month" render={({ field }) => (
              <FormItem>
                <FormLabel>{labels.sessionsPerMonth}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 12"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Price Paid */}
            <FormField control={form.control} name="price_paid" render={({ field }) => (
              <FormItem>
                <FormLabel>{labels.pricePaid}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 500"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Existing member checkbox */}
            <FormField control={form.control} name="is_existing" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => {
                        field.onChange(e.target.checked);
                        if (!e.target.checked) form.setValue('start_date_str', '');
                      }}
                      className="h-4 w-4 accent-[#e63946]"
                    />
                    <span className="text-sm text-[#e8e4df]">{labels.is_existing_member}</span>
                  </label>
                </FormControl>
              </FormItem>
            )} />

            {/* Start date — only when is_existing is checked */}
            {isExisting && (
              <FormField control={form.control} name="start_date_str" render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.start_date}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Error message */}
            {error && (
              <p className="text-sm text-[#e63946] border border-[#5c2a2a] bg-[#2b0d0d] px-3 py-2">
                {error}
              </p>
            )}

            {/* Footer actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                {labels.cancel}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? labels.adding_member : `+ ${labels.add_member}`}
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
