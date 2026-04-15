import React from 'react';
import { Composition } from 'remotion';
import { DashboardPreview } from './DashboardPreview';
import { LandingPagePromo } from './LandingPagePromo';
import { SalesPromo } from './SalesPromo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DashboardPreview"
        component={DashboardPreview}
        durationInFrames={395}
        fps={30}
        width={1280}
        height={800}
      />

      <Composition
        id="LandingPagePromo"
        component={LandingPagePromo}
        durationInFrames={395}
        fps={30}
        width={1280}
        height={800}
      />

      <Composition
        id="SalesPromo"
        component={SalesPromo}
        // 120 + 395 + 150 - 30 = 635 frames
        durationInFrames={635}
        fps={30}
        width={1280}
        height={800}
      />
    </>
  );
};
