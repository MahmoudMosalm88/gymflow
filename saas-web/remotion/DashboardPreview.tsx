import React from 'react';
import { TransitionSeries, springTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { ScannerScene } from './scenes/ScannerScene';
import { DashboardScene } from './scenes/DashboardScene';
import { MembersScene } from './scenes/MembersScene';
import { MemberDetailScene } from './scenes/MemberDetailScene';
import { HeatMapScene } from './scenes/HeatMapScene';
import { IncomeScene } from './scenes/IncomeScene';

// Snappy 10-frame transitions
const T = 10;
const SNAPPY = springTiming({ config: { damping: 200, stiffness: 400 }, durationInFrames: T });

// Scene durations:
// Scanner: 75f, Dashboard: 80f, Clients: 72f, ClientDetail: 65f, Reports: 75f, Income: 78f
// Total: 75+80+72+65+75+78 - 5×10 = 445-50 = 395f ≈ 13.2s
export const DashboardPreview: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={75}>
        <ScannerScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={SNAPPY} />

      <TransitionSeries.Sequence durationInFrames={80}>
        <DashboardScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={SNAPPY} />

      <TransitionSeries.Sequence durationInFrames={72}>
        <MembersScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={fade()} timing={SNAPPY} />

      <TransitionSeries.Sequence durationInFrames={65}>
        <MemberDetailScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={SNAPPY} />

      <TransitionSeries.Sequence durationInFrames={75}>
        <HeatMapScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={SNAPPY} />

      <TransitionSeries.Sequence durationInFrames={78}>
        <IncomeScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
