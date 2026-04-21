import React from 'react';
import { Composition } from 'remotion';
import { DashboardPreview } from './DashboardPreview';
import { LandingPagePromo } from './LandingPagePromo';
import { SalesPromo } from './SalesPromo';

// 75 seconds × 30 fps = 2250 visible frames
const TOTAL_FRAMES = 2250;
const FPS = 30;
const WIDTH = 1280;
const HEIGHT = 800;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* New bilingual demo videos */}
      <Composition
        id="DashboardPreview-EN"
        component={DashboardPreview}
        defaultProps={{ lang: 'en' as const }}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      <Composition
        id="DashboardPreview-AR"
        component={DashboardPreview}
        defaultProps={{ lang: 'ar' as const }}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* Legacy compositions (kept for reference) */}
      <Composition
        id="DashboardPreview-Legacy"
        component={DashboardPreview}
        defaultProps={{ lang: 'en' as const }}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      <Composition
        id="LandingPagePromo"
        component={LandingPagePromo}
        durationInFrames={395}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      <Composition
        id="SalesPromo"
        component={SalesPromo}
        durationInFrames={635}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
