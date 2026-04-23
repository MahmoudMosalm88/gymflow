import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { Cursor } from '../components/Cursor';
import { Spotlight } from '../components/Spotlight';

// Reports scene: overview → zoom to stats → pan down to chart
// Screenshot coords: stat row ~y=200–280, chart area ~y=350–700

const FADE_IN = 0;
const ZOOM_START = 8;
const SPOT_STATS = 24;
const SPOT_CHART = 48;

export function HeatMapScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [FADE_IN, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Two-stage zoom
  const zoom1 = spring({
    frame: frame - ZOOM_START,
    fps,
    config: { damping: 28, stiffness: 100 },
    durationInFrames: 40,
  });
  const zoom2 = spring({
    frame: frame - SPOT_CHART,
    fps,
    config: { damping: 28, stiffness: 100 },
    durationInFrames: 40,
  });
  const zoom = interpolate(zoom1, [0, 1], [1, 1.2]) + interpolate(zoom2, [0, 1], [0, 0.35]);
  const panY = interpolate(zoom2, [0, 1], [0, -10]);

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', overflow: 'hidden' }}>
      {/* Screenshot */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: fadeIn,
          transform: `scale(${zoom}) translateY(${panY}%)`,
          transformOrigin: '50% 52%',
        }}
      >
        <Img
          src={staticFile('demo-screens/reports.png')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Spotlight: stats row → chart area */}
      <Spotlight
        targets={[
          { frame: SPOT_STATS, cx: 55, cy: 28, rx: 360, ry: 80 },
          { frame: SPOT_CHART, cx: 55, cy: 52, rx: 420, ry: 200 },
        ]}
        intensity={0.4}
      />

      {/* Cursor moves from stats to chart */}
      <Cursor
        waypoints={[
          { frame: SPOT_STATS, x: 60, y: 50 },
          { frame: SPOT_STATS + 4, x: 45, y: 28 },
          { frame: SPOT_CHART, x: 50, y: 48 },
        ]}
        clicks={[SPOT_STATS + 4]}
      />
    </div>
  );
}
