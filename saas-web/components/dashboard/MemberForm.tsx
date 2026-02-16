'use client';

import { useState } from 'react';
import { useLang, t } from '@/lib/i18n';

/** Shape of the member data this form collects */
type MemberFormData = {
  name: string;
  phone: string;
  gender: 'male' | 'female';
  access_tier: string;
  card_code: string;
  address: string;
};

type Props = {
  /** Pre-fill the form when editing an existing member */
  initialData?: Partial<MemberFormData>;
  /** Called with form data when user clicks Save */
  onSubmit: (data: MemberFormData) => void;
  /** Called when user clicks Cancel */
  onCancel: () => void;
  /** Disables the submit button and shows loading state */
  loading?: boolean;
};

export default function MemberForm({ initialData, onSubmit, onCancel, loading }: Props) {
  const { lang } = useLang();
  const labels = t[lang];

  // Controlled form state — each field maps to a member property
  const [name, setName] = useState(initialData?.name ?? '');
  const [phone, setPhone] = useState(initialData?.phone ?? '');
  const [gender, setGender] = useState<'male' | 'female'>(initialData?.gender ?? 'male');
  const [accessTier, setAccessTier] = useState(initialData?.access_tier ?? 'full');
  const [cardCode, setCardCode] = useState(initialData?.card_code ?? '');
  const [address, setAddress] = useState(initialData?.address ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, phone, gender, access_tier: accessTier, card_code: cardCode, address });
  };

  // Shared input classes for the dark theme
  const inputClass =
    'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-[#f3f6ff] placeholder-[#8892a8] outline-none focus:border-brand';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name — required */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[#8892a8]">{labels.name} *</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Phone — required */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[#8892a8]">{labels.phone} *</label>
        <input
          type="text"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Gender — dropdown */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[#8892a8]">{labels.gender}</label>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value as 'male' | 'female')}
          className={inputClass}
        >
          <option value="male">{labels.male}</option>
          <option value="female">{labels.female}</option>
        </select>
      </div>

      {/* Access tier — defaults to "full" */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[#8892a8]">
          {lang === 'ar' ? 'مستوى الوصول' : 'Access Tier'}
        </label>
        <input
          type="text"
          value={accessTier}
          onChange={(e) => setAccessTier(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Card code — optional */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[#8892a8]">
          {lang === 'ar' ? 'رمز البطاقة' : 'Card Code'}
        </label>
        <input
          type="text"
          value={cardCode}
          onChange={(e) => setCardCode(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Address — optional */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[#8892a8]">
          {lang === 'ar' ? 'العنوان' : 'Address'}
        </label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? labels.loading : labels.save}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-[#8892a8] transition-colors hover:text-[#f3f6ff]"
        >
          {labels.cancel}
        </button>
      </div>
    </form>
  );
}
