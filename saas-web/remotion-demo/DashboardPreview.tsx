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

const T = 10;
const SNAPPY = springTiming({ config: { damping: 200, stiffness: 400 }, durationInFrames: T });

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
