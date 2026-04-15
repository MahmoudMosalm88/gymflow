import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { Cursor } from '../components/Cursor';
import { Spotlight } from '../components/Spotlight';

// Income scene: spotlight moves across revenue cards → pan down to breakdown table
// Screenshot coords: revenue cards ~y=200–300, table ~y=400+

const FADE_IN = 0;
const ZOOM_START = 8;
const SPOT_REVENUE = 22;
const SPOT_EXPECTED = 42;
const SPOT_TABLE = 60;

export function IncomeScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [FADE_IN, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Zoom into revenue area
  const zoomSpring = spring({
    frame: frame - ZOOM_START,
    fps,
    config: { damping: 28, stiffness: 100 },
    durationInFrames: 40,
  });
  const zoom = interpolate(zoomSpring, [0, 1], [1, 1.45]);

  // Pan down to table
  const panSpring = spring({
    frame: frame - SPOT_TABLE,
    fps,
    config: { damping: 26, stiffness: 90 },
    durationInFrames: 35,
  });
  const panY = interpolate(panSpring, [0, 1], [0, -12]);

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', overflow: 'hidden' }}>
      {/* Screenshot */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: fadeIn,
          transform: `scale(${zoom}) translateY(${panY}%)`,
          transformOrigin: '50% 40%',
        }}
      >
        <Img
          src={staticFile('demo-screens/income.png')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Spotlight: revenue → expected → table */}
      <Spotlight
        targets={[
          { frame: SPOT_REVENUE, cx: 38, cy: 30, rx: 200, ry: 90 },
          { frame: SPOT_EXPECTED, cx: 68, cy: 30, rx: 200, ry: 90 },
          { frame: SPOT_TABLE, cx: 55, cy: 55, rx: 400, ry: 180 },
        ]}
        intensity={0.4}
      />

      {/* Cursor: revenue card → expected → table */}
      <Cursor
        waypoints={[
          { frame: SPOT_REVENUE - 4, x: 55, y: 50 },
          { frame: SPOT_REVENUE, x: 36, y: 32 },
          { frame: SPOT_EXPECTED, x: 66, y: 32 },
          { frame: SPOT_TABLE, x: 48, y: 52 },
        ]}
        clicks={[SPOT_REVENUE, SPOT_EXPECTED]}
      />
    </div>
  );
}
