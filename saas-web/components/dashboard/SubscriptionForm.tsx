'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLang, t } from '@/lib/i18n';
import { format } from 'date-fns';
import { CalendarIcon } from '@radix-ui/react-icons'; // Assuming an icon for calendar

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar'; // shadcn/ui calendar component
import { cn } from '@/lib/utils'; // cn helper

type Member = { id: string; name: string };

type SubscriptionFormData = {
  member_id: string;
  start_date: Date; // Using Date object for react-hook-form
  plan_months: number;
  price_paid?: number;
  sessions_per_month?: number;
};

type Props = {
  members: Member[];
  preselectedMemberId?: string;
  onSubmit: (data: SubscriptionFormData) => void;
  onCancel: () => void;
  loading?: boolean;
};

// Subscription-specific labels not in global i18n
const formLabels = {
  en: {
    member: 'Member',
    startDate: 'Start Date',
    planMonths: 'Plan (Months)',
    endDate: 'End Date',
    pricePaid: 'Price Paid',
    sessionsPerMonth: 'Sessions / Month',
    newSubscription: 'New Subscription',
    selectMember: 'Select a member...',
    selectDate: 'Select a date',
    invalidNumber: 'Must be a valid number',
    required: 'Required',
    invalidDate: 'Invalid date',
    invalidMonths: 'Plan months must be a positive integer',
  },
  ar: {
    member: 'العضو',
    startDate: 'تاريخ البدء',
    planMonths: 'المدة (أشهر)',
    endDate: 'تاريخ الانتهاء',
    pricePaid: 'المبلغ المدفوع',
    sessionsPerMonth: 'الحصص / شهر',
    newSubscription: 'اشتراك جديد',
    selectMember: 'اختر عضو...',
    selectDate: 'اختر تاريخ',
    invalidNumber: 'يجب أن يكون رقما صحيحا',
    required: 'مطلوب',
    invalidDate: 'تاريخ غير صالح',
    invalidMonths: 'يجب أن تكون أشهر الخطة عددا صحيحا موجبا',
  },
} as const;

// Zod schema for form validation
const subscriptionFormSchema = z.object({
  member_id: z.string().min(1, { message: "Member is required." }),
  start_date: z.date({
    required_error: "Start date is required.",
    invalid_type_error: "Invalid date.",
  }),
  plan_months: z.coerce.number().min(1, { message: "Plan months must be at least 1." }),
  price_paid: z.coerce.number().optional().refine((val) => val === undefined || val === null || val >= 0, {
    message: "Price paid must be a positive number.",
  }),
  sessions_per_month: z.coerce.number().optional().refine((val) => val === undefined || val === null || val >= 0, {
    message: "Sessions per month must be a positive number.",
  }),
});


export default function SubscriptionForm({ members, preselectedMemberId, onSubmit, onCancel, loading }: Props) {
  const { lang } = useLang();
  const labels = { ...t[lang], ...formLabels[lang] };

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionFormSchema),
    defaultValues: {
      member_id: preselectedMemberId || '',
      start_date: new Date(),
      plan_months: 1,
      price_paid: undefined,
      sessions_per_month: undefined,
    },
  });

  // Calculate end date based on start_date and plan_months
  const watchStartDate = form.watch("start_date");
  const watchPlanMonths = form.watch("plan_months");

  const endDate = React.useMemo(() => {
    if (!watchStartDate || !watchPlanMonths) return null;
    const d = new Date(watchStartDate);
    d.setMonth(d.getMonth() + watchPlanMonths);
    // Adjust day to be last day of month if original day was greater
    // For example, Jan 31 + 1 month = Feb 28/29. If not adjusted, it could become March 2.
    const originalDay = watchStartDate.getDate();
    const newDay = d.getDate();
    if (newDay < originalDay) {
        d.setDate(0); // Set to last day of previous month, which is correct
    }
    return d;
  }, [watchStartDate, watchPlanMonths]);


  function handleSubmit(values: SubscriptionFormData) {
    // Convert Date objects to unix seconds before submitting
    const dataToSubmit = {
      ...values,
      start_date: Math.floor(values.start_date.getTime() / 1000),
      end_date: endDate ? Math.floor(endDate.getTime() / 1000) : 0, // Ensure endDate is calculated
      // price_paid and sessions_per_month are already numbers or undefined
    };
    onSubmit(dataToSubmit);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{labels.newSubscription}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Member select */}
            <FormField
              control={form.control}
              name="member_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.member} *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={labels.selectMember} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start date */}
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{labels.startDate} *</FormLabel>
                  <Popover dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>{labels.selectDate}</span>
                          )}
                          <CalendarIcon className={cn(
                            lang === 'ar' ? "mr-auto h-4 w-4 opacity-50" : "ml-auto h-4 w-4 opacity-50"
                          )} />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Plan months */}
            <FormField
              control={form.control}
              name="plan_months"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.planMonths}</FormLabel>
                  <Select onValueChange={value => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="1" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Auto-calculated end date (read only) */}
            <FormItem>
              <FormLabel>{labels.endDate}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  readOnly
                  value={endDate ? format(endDate, "PPP") : ''}
                  className="opacity-60"
                />
              </FormControl>
            </FormItem>

            {/* Price Paid */}
            <FormField
              control={form.control}
              name="price_paid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.pricePaid}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} onChange={e => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sessions Per Month */}
            <FormField
              control={form.control}
              name="sessions_per_month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.sessionsPerMonth}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="—" {...field} onChange={e => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                {labels.cancel}
              </Button>
              <Button type="submit" disabled={loading || !form.formState.isValidating && !form.formState.isValid}>
                {loading ? labels.loading : labels.create}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

