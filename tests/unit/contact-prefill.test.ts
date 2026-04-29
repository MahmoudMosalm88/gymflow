import { describe, expect, it } from 'vitest';

import { buildContactPrefill } from '@/app/components/legal/contact-prefill';

describe('buildContactPrefill', () => {
  it('returns undefined when no request context is present', () => {
    expect(buildContactPrefill('en', {})).toBeUndefined();
  });

  it('builds an english demo prefill from the start-trial router answers', () => {
    expect(
      buildContactPrefill('en', {
        request: 'demo',
        source: 'start-trial',
        branches: 'two_to_four',
        clients: 'five_k_plus',
        migration: 'other_system',
        setup: 'want_help'
      })
    ).toEqual({
      requestType: 'demo',
      branchCount: undefined,
      message: [
        'This request came from the start-trial router.',
        'Branches: 2-4 branches',
        'Clients: 5,000+ clients',
        'Migration: Another gym system',
        'Setup preference: Wants help from GymFlow'
      ].join('\n')
    });
  });

  it('builds an arabic demo prefill from the start-trial router answers', () => {
    expect(
      buildContactPrefill('ar', {
        request: 'demo',
        source: 'start-trial',
        branches: 'one',
        clients: 'under_1000',
        migration: 'spreadsheet',
        setup: 'self_serve'
      })
    ).toEqual({
      requestType: 'demo',
      branchCount: undefined,
      message: [
        'جاء هذا الطلب من صفحة بدء التجربة.',
        'الفروع: فرع واحد',
        'العملاء: أقل من 1000 عميل',
        'الترحيل: ملف Excel / CSV',
        'التفضيل: إعداد ذاتي'
      ].join('\n')
    });
  });
});
