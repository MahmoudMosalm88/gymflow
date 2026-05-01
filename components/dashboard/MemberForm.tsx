'use client';

import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLang, t } from '@/lib/i18n';
import { useSaveShortcut } from '@/lib/use-save-shortcut';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** Shape of the member data this form collects */
type MemberFormData = {
  name: string;
  phone: string;
  access_tier: 'full' | 'limited';
  card_code: string;
  address: string;
};

type MemberFormInput = z.input<typeof memberFormSchema>;
type MemberFormOutput = z.output<typeof memberFormSchema>;

// Zod schema for form validation
const memberFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  phone: z.string().min(1, { message: "Phone number is required." }).regex(/^\+?[1-9]\d{9,14}$/, { message: "Invalid phone number format." }),
  access_tier: z.enum(['full', 'limited']).default('full'),
  card_code: z.string().optional(),
  address: z.string().optional(),
});

type Props = {
  /** Pre-fill the form when editing an existing member */
  initialData?: Partial<MemberFormData & { gender?: string }>;
  /** Called with form data when user clicks Save */
  onSubmit: (data: MemberFormData) => void;
  /** Called when user clicks Cancel */
  onCancel: () => void;
  /** Disables the submit button and shows loading state */
  loading?: boolean;
  /** Hide the internal card title (use when parent already renders a heading) */
  hideTitle?: boolean;
};

export default function MemberForm({ initialData, onSubmit, onCancel, loading, hideTitle }: Props) {
  const { lang } = useLang();
  const labels = t[lang];
  const formRef = useRef<HTMLFormElement | null>(null);

  const form = useForm<MemberFormInput, undefined, MemberFormOutput>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      phone: initialData?.phone || '',
      access_tier: (initialData?.access_tier === 'limited' ? 'limited' : 'full'),
      card_code: initialData?.card_code || '',
      address: initialData?.address || '',
    },
  });

  const handleSubmit = (values: MemberFormOutput) => {
    onSubmit({
      name: values.name,
      phone: values.phone,
      access_tier: values.access_tier,
      card_code: values.card_code ?? '',
      address: values.address ?? '',
    });
  };

  useSaveShortcut({
    scopeRef: formRef,
    onSave: () => formRef.current?.requestSubmit(),
    disabled: Boolean(loading),
    enterMode: 'form',
  });

  return (
    <Card className="w-full">
      {!hideTitle && (
        <CardHeader>
          <CardTitle>{initialData ? labels.edit_member : labels.add_member}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <Form {...form}>
          <form ref={formRef} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.name} *</FormLabel>
                  <FormControl>
                    <Input placeholder={labels.member_name_placeholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.phone} *</FormLabel>
                  <FormControl>
                    <Input placeholder={labels.phone_placeholder} dir="ltr" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Access Tier */}
            <FormField
              control={form.control}
              name="access_tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.access_tier}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col sm:flex-row gap-3 sm:gap-6"
                    >
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="full" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">{labels.access_tier_full}</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="limited" />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">{labels.access_tier_limited}</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Card Code */}
            <FormField
              control={form.control}
              name="card_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.card_code}</FormLabel>
                  <FormControl>
                    <Input placeholder={labels.card_code_placeholder} {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'ar'
                      ? 'اتركه فارغاً للعمل بالـ QR الرقمي فقط. سيستخدم GymFlow رمز دخول تلقائياً لهذا العميل.'
                      : 'Leave empty for digital-only QR. GymFlow will use an automatic check-in code for this client.'}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.address}</FormLabel>
                  <FormControl>
                    <Input placeholder={labels.address_placeholder} {...field} />
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
              <Button type="submit" disabled={loading}>
                {loading ? labels.loading : labels.save}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
