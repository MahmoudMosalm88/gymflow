import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { Spotlight } from '../components/Spotlight';
import { InsightCallout } from '../components/InsightCallout';

// ReportsHeroScene — 495 frames (16.5s @ 30fps)
// 5-layer progressive disclosure:
//   Layer 1 (0–60):    Fade in + subtle zoom settle  0.98→1.0
//   Layer 2 (60–150):  Zoom to stats area            1.0→1.3
//   Layer 3 (150–300): Deep drill to chart           1.3→1.7, callout at 240
//   Layer 4 (300–380): Pull back to full view        1.7→1.0
//   Layer 5 (380–495): Ken Burns hold                1.0→1.05, gentle drift

export function ReportsHeroScene({ lang }: { lang: 'en' | 'ar' }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ─── LAYER 1: fade + settle (0–60) ───────────────────────────────────────

  // Opacity fades in from 0 to 1 over the first 15 frames
  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Subtle zoom from 0.98 → 1.0 to give the "panels settling" feeling
  const settleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 60,
  });
  const settleZoom = interpolate(settleSpring, [0, 1], [0.98, 1.0]);

  // ─── LAYER 2: zoom into stats (60–150) ────────────────────────────────────

  // Springs in from frame 60 over 90 frames → zoom 1.0→1.3
  const statsSpring = spring({
    frame: Math.max(0, frame - 60),
    fps,
    config: { damping: 200 },
    durationInFrames: 90,
  });
  const statsZoomDelta = interpolate(statsSpring, [0, 1], [0, 0.3]); // adds 0→0.3
  const statsPanYDelta = interpolate(statsSpring, [0, 1], [0, -5]);   // pan up toward stats

  // ─── LAYER 3: deep drill to chart (150–300) ───────────────────────────────

  // Springs in from frame 150 over 150 frames → zoom +0→0.4 (total 1.3→1.7)
  const drillSpring = spring({
    frame: Math.max(0, frame - 150),
    fps,
    config: { damping: 200 },
    durationInFrames: 150,
  });
  const drillZoomDelta = interpolate(drillSpring, [0, 1], [0, 0.4]);   // adds 0→0.4
  const drillPanXDelta = interpolate(drillSpring, [0, 1], [0, -3]);    // pan left toward chart
  const drillPanYDelta = interpolate(drillSpring, [0, 1], [0, -7]);    // pan further down

  // ─── LAYER 4: pull back (300–380) ────────────────────────────────────────

  // Springs from frame 300 over 80 frames — reduces the stats + drill zoom back to 0
  const pullSpring = spring({
    frame: Math.max(0, frame - 300),
    fps,
    config: { damping: 200 },
    durationInFrames: 80,
  });
  // Pull removes the combined stats (0.3) + drill (0.4) delta → takes us back to 1.0
  const pullZoomDelta = interpolate(pullSpring, [0, 1], [0, -(0.3 + 0.4)]);
  // Also returns pan values to 0
  const pullPanXDelta = interpolate(pullSpring, [0, 1], [0, 3]);
  const pullPanYDelta = interpolate(pullSpring, [0, 1], [0, 12]);

  // ─── LAYER 5: Ken Burns hold (380–495) ───────────────────────────────────

  // Gentle drift: zoom 1.0→1.05, nudge left -0.5%
  const kenSpring = spring({
    frame: Math.max(0, frame - 380),
    fps,
    config: { damping: 200 },
    durationInFrames: 115,
  });
  const kenZoomDelta = interpolate(kenSpring, [0, 1], [0, 0.05]);
  const kenPanXDelta = interpolate(kenSpring, [0, 1], [0, -0.5]);

  // ─── COMBINE all deltas into final transform values ───────────────────────

  const zoom =
    settleZoom            // 0.98→1.0
    + statsZoomDelta      // +0→0.3  (total: 1.0→1.3)
    + drillZoomDelta      // +0→0.4  (total: 1.3→1.7)
    + pullZoomDelta       // -0→0.7  (returns to 1.0)
    + kenZoomDelta;       // +0→0.05 (total: 1.0→1.05)

  const panX =
    drillPanXDelta        // 0→-3%
    + pullPanXDelta       // 0→+3%   (returns to 0)
    + kenPanXDelta;       // 0→-0.5% (gentle Ken Burns drift)

  const panY =
    statsPanYDelta        // 0→-5%   (up toward stats)
    + drillPanYDelta      // 0→-7%   (further toward chart)
    + pullPanYDelta;      // 0→+12%  (returns to 0)

  // ─── SPOTLIGHT opacity ────────────────────────────────────────────────────

  // Fades out during Ken Burns hold (frames 380–395)
  const spotlightOpacity = interpolate(frame, [380, 395], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ─── INSIGHT CALLOUT visibility / fade-out ────────────────────────────────

  // Appears at frame 240, manually fades out 300–320
  const calloutVisible = frame >= 240 && frame <= 320;
  const calloutFadeOut = interpolate(frame, [300, 320], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', overflow: 'hidden' }}>

      {/* Screenshot layer — all camera movement handled here */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: fadeIn,
          // Single transform combining scale + translate.
          // translate() runs in the scaled coordinate space, so we divide by zoom
          // to get the correct viewport-percent shift.
          transform: `scale(${zoom}) translate(${panX / zoom}%, ${panY / zoom}%)`,
          transformOrigin: '50% 50%',
        }}
      >
        <Img
          src={staticFile(`demo-screens/${lang}/reports.png`)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Spotlight — dims areas outside the focal zone.
          Layer 2 targets the stats/KPI row; Layer 3 shifts to the chart area.
          Outer div controls opacity so we can fade it out for Layer 5. */}
      <div style={{ position: 'absolute', inset: 0, opacity: spotlightOpacity, pointerEvents: 'none' }}>
        <Spotlight
          targets={[
            // Layer 2: stats row (appears at frame 60)
            { frame: 60,  cx: 50, cy: 30, rx: 500, ry: 100 },
            // Layer 3: chart / heatmap area (transitions from frame 150)
            { frame: 150, cx: 45, cy: 55, rx: 350, ry: 180 },
            // Layer 4: widen to show full dashboard (transitions from frame 300)
            { frame: 300, cx: 50, cy: 50, rx: 600, ry: 400 },
          ]}
          intensity={0.5}
          fadeInFrame={60}
        />
      </div>

      {/* InsightCallout — springs in at frame 240, fades out 300–320 */}
      {calloutVisible && (
        <div style={{ position: 'absolute', inset: 0, opacity: calloutFadeOut, pointerEvents: 'none' }}>
          <InsightCallout
            frame={240}
            x={58}
            y={42}
            title="Peak: Thu 7–9 PM"
            body="+34% above average"
            highlightColor="#e63946"
          />
        </div>
      )}

    </div>
  );
}
