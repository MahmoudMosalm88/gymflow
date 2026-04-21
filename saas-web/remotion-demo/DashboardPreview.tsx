import React from 'react';
import { useCurrentFrame, interpolate, staticFile } from 'remotion';
import { TransitionSeries, springTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { Audio } from '@remotion/media';

import { HookScene } from './scenes/HookScene';
import { ScannerDashboardScene } from './scenes/ScannerDashboardScene';
import { MembersScene } from './scenes/MembersScene';
import { RevenueScene } from './scenes/RevenueScene';
import { WhatsAppScene } from './scenes/WhatsAppScene';
import { MontageScene } from './scenes/MontageScene';
import { ReportsHeroScene } from './scenes/ReportsHeroScene';
import { CTAScene } from './scenes/CTAScene';

// Transition duration: 15 frames (0.5s) — overlaps between scenes
const T = 15;
const SMOOTH = springTiming({ config: { damping: 200 }, durationInFrames: T });

// Scene durations (in frames at 30fps)
// Total visible: 2250 frames = 75s
// 7 transitions × 15 frames = 105 frames overlap
// Sum of scene durations: 2250 + 105 = 2355
const HOOK = 165;           // 5.5s
const SCANNER_DASH = 375;   // 12.5s
const MEMBERS = 315;        // 10.5s
const REVENUE = 315;        // 10.5s
const WHATSAPP = 255;       // 8.5s
const MONTAGE = 195;        // 6.5s
const REPORTS_HERO = 495;   // 16.5s
const CTA = 240;            // 8.0s

// Music volume envelope — frame positions in the global timeline
// Insight callout lands at roughly frame 1770 (sum of scenes before Reports + ~240 into Reports)
const MUSIC_FADE_IN_END = 30;
const MUSIC_DIP_START = 1750;
const MUSIC_DIP_END = 1810;
const MUSIC_FADE_OUT_START = 2200;

type Props = {
  lang: 'en' | 'ar';
};

export const DashboardPreview: React.FC<Props> = ({ lang }) => {
  const frame = useCurrentFrame();

  // Music volume envelope: fade in → hold → dip at insight → fade out
  const musicVolume = interpolate(
    frame,
    [0, MUSIC_FADE_IN_END, MUSIC_DIP_START, MUSIC_DIP_START + 10, MUSIC_DIP_END, MUSIC_DIP_END + 10, MUSIC_FADE_OUT_START, 2250],
    [0, 0.35, 0.35, 0.05, 0.05, 0.35, 0.35, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a' }}>
      {/* Background music */}
      <Audio
        src={staticFile('audio/ambient.mp3')}
        volume={musicVolume}
      />

      {/* Scene sequence with transitions */}
      <TransitionSeries>
        {/* Scene 1: Hook / Problem statement */}
        <TransitionSeries.Sequence durationInFrames={HOOK}>
          <HookScene lang={lang} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={SMOOTH} />

        {/* Scene 2: QR Scanner + Dashboard overview */}
        <TransitionSeries.Sequence durationInFrames={SCANNER_DASH}>
          <ScannerDashboardScene lang={lang} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={SMOOTH} />

        {/* Scene 3: Members list → Member detail */}
        <TransitionSeries.Sequence durationInFrames={MEMBERS}>
          <MembersScene lang={lang} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={SMOOTH} />

        {/* Scene 4: Revenue + Subscriptions */}
        <TransitionSeries.Sequence durationInFrames={REVENUE}>
          <RevenueScene lang={lang} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={SMOOTH} />

        {/* Scene 5: WhatsApp Automation */}
        <TransitionSeries.Sequence durationInFrames={WHATSAPP}>
          <WhatsAppScene lang={lang} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={SMOOTH} />

        {/* Scene 6: Guest Passes + PT Hub Montage */}
        <TransitionSeries.Sequence durationInFrames={MONTAGE}>
          <MontageScene lang={lang} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={SMOOTH} />

        {/* Scene 7: HERO — Reports & Analytics */}
        <TransitionSeries.Sequence durationInFrames={REPORTS_HERO}>
          <ReportsHeroScene lang={lang} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={SMOOTH} />

        {/* Scene 8: CTA */}
        <TransitionSeries.Sequence durationInFrames={CTA}>
          <CTAScene lang={lang} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </div>
  );
};
