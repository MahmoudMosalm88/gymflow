import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { Cursor } from '../components/Cursor';
import { Spotlight } from '../components/Spotlight';

// Dashboard scene: cursor moves across stat cards, spotlight follows
// Screenshot coords (1280×800): stat cards row y≈277–375
// Card centers: Total Clients cx=421, Active Subs cx=650, Check-ins cx=880, Revenue cx=1114

const FADE_IN = 0;
const ZOOM_START = 8;
const SPOT_1 = 26; // Total Clients
const SPOT_2 = 44; // Today's Check-ins
const SPOT_3 = 62; // Total Revenue (+ pan)

function mapX(xPct: number, zoom: number, originX = 0.5) {
  return (xPct - originX) * zoom + originX;
}
function mapY(yPct: number, zoom: number, originY = 0.45) {
  return (yPct - originY) * zoom + originY;
}

export function DashboardScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [FADE_IN, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Zoom into stat cards
  const zoomSpring = spring({
    frame: frame - ZOOM_START,
    fps,
    config: { damping: 28, stiffness: 100 },
    durationInFrames: 40,
  });
  const zoom = interpolate(zoomSpring, [0, 1], [1, 1.3]);

  // Pan right for Revenue card
  const panSpring = spring({
    frame: frame - SPOT_3,
    fps,
    config: { damping: 28, stiffness: 100 },
    durationInFrames: 30,
  });
  const panX = interpolate(panSpring, [0, 1], [0, -6]);

  // Compute viewport positions for cursor waypoints
  const cardY = mapY(326 / 800, zoom) * 100;
  const card1X = mapX(421 / 1280, zoom) * 100;
  const card2X = mapX(880 / 1280, zoom) * 100;
  const card3X = (mapX(1114 / 1280, zoom) + panX / 100) * 100;

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', overflow: 'hidden' }}>
      {/* Screenshot */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: fadeIn,
          transform: `scale(${zoom}) translateX(${panX}%)`,
          transformOrigin: '50% 45%',
        }}
      >
        <Img
          src={staticFile('demo-screens/dashboard.png')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Spotlight vignette — moves between stat cards */}
      <Spotlight
        targets={[
          { frame: SPOT_1, cx: card1X, cy: cardY, rx: 160, ry: 100 },
          { frame: SPOT_2, cx: card2X, cy: cardY, rx: 160, ry: 100 },
          { frame: SPOT_3, cx: card3X, cy: cardY, rx: 160, ry: 100 },
        ]}
        intensity={0.4}
      />

      {/* Cursor follows the spotlight across cards */}
      <Cursor
        waypoints={[
          { frame: SPOT_1 - 4, x: 50, y: 55 },
          { frame: SPOT_1, x: card1X - 2, y: cardY + 4 },
          { frame: SPOT_2, x: card2X - 2, y: cardY + 4 },
          { frame: SPOT_3, x: card3X - 2, y: cardY + 4 },
        ]}
        clicks={[SPOT_1, SPOT_2, SPOT_3]}
      />
    </div>
  );
}
