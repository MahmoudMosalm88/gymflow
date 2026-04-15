import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { Cursor } from '../components/Cursor';
import { Spotlight } from '../components/Spotlight';

// Member detail: smooth pan down through profile, cursor follows key fields
// Screenshot coords (1280×800):
// Name header row: y≈108–162
// Client Info card: y≈180–730
//   Name field: y≈390  Phone: y≈430  Access Tier: y≈470  Card Code: y≈510

const FADE_IN = 0;
const ZOOM_START = 6;
const SPOT_HEADER = 16;  // spotlight on name/avatar area
const SPOT_FIELDS = 34;  // pan down to data fields
const ZOOM = 1.3;
const ORIGIN_Y = 0.46;

function mapY(yPct: number) { return (yPct - ORIGIN_Y) * ZOOM + ORIGIN_Y; }
function mapX(xPct: number) { return (xPct - 0.5) * ZOOM + 0.5; }

export function MemberDetailScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [FADE_IN, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Two-stage zoom: first normal, then deeper into fields
  const zoom1 = spring({
    frame: frame - ZOOM_START,
    fps,
    config: { damping: 28, stiffness: 100 },
    durationInFrames: 40,
  });
  const zoom2 = spring({
    frame: frame - SPOT_FIELDS,
    fps,
    config: { damping: 28, stiffness: 80 },
    durationInFrames: 30,
  });

  const zoomVal = interpolate(zoom1, [0, 1], [1, ZOOM]) + interpolate(zoom2, [0, 1], [0, 0.15]);

  // Pan down to fields
  const panY = interpolate(zoom2, [0, 1], [0, -5]);

  // Viewport positions for cursor
  const headerY = mapY(135 / 800) * 100;
  const headerX = mapX(600 / 1280) * 100;
  const fieldsY = mapY(450 / 800) * 100;
  const fieldsX = mapX(700 / 1280) * 100;

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', overflow: 'hidden' }}>
      {/* Screenshot */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: fadeIn,
          transform: `scale(${zoomVal}) translateY(${panY}%)`,
          transformOrigin: `50% ${ORIGIN_Y * 100}%`,
        }}
      >
        <Img
          src={staticFile('demo-screens/member-detail.png')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Spotlight: header area → then data fields */}
      <Spotlight
        targets={[
          { frame: SPOT_HEADER, cx: headerX, cy: headerY, rx: 320, ry: 80 },
          { frame: SPOT_FIELDS, cx: fieldsX, cy: fieldsY + 4, rx: 360, ry: 140 },
        ]}
        intensity={0.4}
      />

      {/* Cursor: moves from header down to fields */}
      <Cursor
        waypoints={[
          { frame: SPOT_HEADER, x: headerX + 8, y: headerY + 6 },
          { frame: SPOT_FIELDS, x: fieldsX - 5, y: fieldsY + 8 },
        ]}
        clicks={[SPOT_HEADER + 2]}
      />
    </div>
  );
}
