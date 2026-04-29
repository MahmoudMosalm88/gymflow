import type { Metadata } from 'next';

import StartTrialRouter from '@/app/components/landing/StartTrialRouter';

export const metadata: Metadata = {
  title: 'ابدأ تجربتك المجانية | GymFlow',
  description:
    'أجب عن أربعة أسئلة قصيرة لاختيار مسار GymFlow الأنسب. الجيمات الأصغر يمكنها متابعة التجربة مباشرة، أما الإطلاقات الأكبر فيمكنها حجز عرض موجه.'
};

export default function ArabicStartTrialPage() {
  return <StartTrialRouter locale="ar" />;
}
