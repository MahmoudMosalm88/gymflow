import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { Cursor } from '../components/Cursor';

// Scanner scene: cursor clicks the input → scan line sweeps → green flash → ACCESS GRANTED
// Screenshot: scanner input at y≈183–243, x≈346–1194 (1280×800)
// At 1.5x zoom origin 50% 27%: input stays near 27% vertically

const FADE_IN = 0;
const ZOOM_START = 6;
const CURSOR_APPEAR = 12;
const CURSOR_CLICK = 20;
const SCAN_START = 22;
const SCAN_END = 46;
const FLASH_START = 48;
const FLASH_PEAK = 52;
const FLASH_END = 64;
const BADGE_IN = 52;

export function ScannerScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [FADE_IN, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Zoom into scanner bar
  const zoomSpring = spring({
    frame: frame - ZOOM_START,
    fps,
    config: { damping: 28, stiffness: 100 },
    durationInFrames: 40,
  });
  const zoom = interpolate(zoomSpring, [0, 1], [1, 1.5]);

  // Scan line animation
  const scanProgress = interpolate(frame, [SCAN_START, SCAN_END], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scanOpacity = interpolate(
    frame,
    [SCAN_START, SCAN_START + 4, SCAN_END - 4, SCAN_END],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Green flash on successful scan
  const flashIntensity = interpolate(
    frame,
    [FLASH_START, FLASH_PEAK, FLASH_END],
    [0, 0.18, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // ACCESS GRANTED badge springs in
  const badgeSpring = spring({
    frame: frame - BADGE_IN,
    fps,
    config: { damping: 10, stiffness: 340 },
    durationInFrames: 20,
  });
  const badgeScale = interpolate(badgeSpring, [0, 1], [0.5, 1]);
  const badgeOpacity = interpolate(badgeSpring, [0, 0.2], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Checkmark draw-on animation
  const checkDraw = interpolate(frame, [BADGE_IN + 6, BADGE_IN + 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', overflow: 'hidden' }}>
      {/* Screenshot zoomed into scanner */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: fadeIn,
          transform: `scale(${zoom})`,
          transformOrigin: '50% 27%',
        }}
      >
        <Img
          src={staticFile('demo-screens/dashboard.png')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Green flash overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `rgba(16,185,129,${flashIntensity})`,
          pointerEvents: 'none',
        }}
      />

      {/* Scan line — red laser sweeping across input */}
      {frame >= SCAN_START && frame <= SCAN_END && (
        <div
          style={{
            position: 'absolute',
            top: '27%',
            left: '16%',
            right: '0%',
            height: 3,
            opacity: scanOpacity,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${scanProgress * 100 - 12}%`,
              width: '12%',
              background: 'linear-gradient(to right, transparent, #e63946, transparent)',
            }}
          />
        </div>
      )}

      {/* ACCESS GRANTED badge */}
      <div
        style={{
          position: 'absolute',
          bottom: '12%',
          left: '50%',
          transform: `translateX(-50%) scale(${badgeScale})`,
          transformOrigin: 'center bottom',
          opacity: badgeOpacity,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '14px 24px',
          background: 'rgba(10,26,20,0.95)',
          border: '2px solid #10b981',
          boxShadow: '6px 6px 0 #000',
          minWidth: 300,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            background: '#0d2a1e',
            border: '2px solid #10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: '#10b981',
            fontWeight: 800,
          }}
        >
          R
        </div>
        <div>
          <div style={{ fontSize: 15, color: '#f0f0f0', fontWeight: 700 }}>Rania Mansour</div>
          <div
            style={{
              fontSize: 11,
              color: '#10b981',
              fontWeight: 800,
              letterSpacing: '0.08em',
              marginTop: 2,
            }}
          >
            ACCESS GRANTED
          </div>
        </div>
        {/* Animated checkmark */}
        <svg
          style={{ marginLeft: 'auto' }}
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#10b981"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M20 6L9 17l-5-5"
            strokeDasharray="24"
            strokeDashoffset={interpolate(checkDraw, [0, 1], [24, 0])}
          />
        </svg>
      </div>

      {/* Cursor: moves to scanner input, clicks, then hides during badge */}
      <Cursor
        waypoints={[
          { frame: CURSOR_APPEAR, x: 60, y: 50 },
          { frame: CURSOR_APPEAR + 6, x: 42, y: 28 },
        ]}
        clicks={[CURSOR_CLICK]}
        hideAfter={FLASH_START}
      />
    </div>
  );
}
