import type { Metadata } from 'next';

import StartTrialRouter from '@/app/components/landing/StartTrialRouter';

export const metadata: Metadata = {
  title: 'Start Free Trial | GymFlow',
  description:
    'Answer four quick questions to start the right GymFlow path. Smaller gyms can continue directly to trial, while larger rollouts can book a guided demo.'
};

export default function StartTrialPage() {
  return <StartTrialRouter />;
}
