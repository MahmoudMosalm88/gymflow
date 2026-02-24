import React from 'react';
import { Composition } from 'remotion';
import { DashboardPreview } from './DashboardPreview';

// Total frames: 75+80+72+65+75+78 - 5*10 = 395
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DashboardPreview"
      component={DashboardPreview}
      durationInFrames={395}
      fps={30}
      width={1280}
      height={800}
    />
  );
};
