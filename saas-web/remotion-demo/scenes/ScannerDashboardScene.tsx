import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { Cursor } from '../components/Cursor';
import { Spotlight } from '../components/Spotlight';

// ─── Frame constants ───────────────────────────────────────────────────────────
// Act 1: Scanner zoom-in (frames 0–100)
const FADE_IN        = 0;
const ZOOM_START     = 6;
const SCAN_START     = 22;
const SCAN_END       = 42;
const FLASH_START    = 48;
const FLASH_PEAK     = 56;
const FLASH_END      = 64;
const BADGE_IN       = 52;
const BADGE_OUT      = 100;

// Act 2: Dashboard overview (frames 100–375)
const ZOOM_BACK      = 100;  // start un-zooming
const SPOT_START     = 130;  // spotlight first card
const SPOT_2         = 180;  // middle card
const SPOT_3         = 230;  // right card

// ─── Stat card viewport positions (approximated from dashboard layout) ─────────
// Cards sit at roughly y=42% of the viewport.
// Left card ~33%, middle ~55%, right ~77% horizontally.
const CARD_Y  = 42;
const CARD1_X = 33;
const CARD2_X = 55;
const CARD3_X = 77;

export function ScannerDashboardScene({ lang }: { lang: 'en' | 'ar' }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Fade in ──────────────────────────────────────────────────────────────────
  const fadeIn = interpolate(frame, [FADE_IN, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Act 1: zoom INTO scanner area ────────────────────────────────────────────
  const zoomInSpring = spring({
    frame: frame - ZOOM_START,
    fps,
    config: { damping: 200 },
    durationInFrames: 40,
  });
  // Act 2: zoom BACK out (starts at frame 100)
  const zoomOutSpring = spring({
    frame: frame - ZOOM_BACK,
    fps,
    config: { damping: 200 },
    durationInFrames: 40,
  });

  // Combine: zoom up to 1.4 during act 1, then back to 1.0 in act 2
  const zoomIn  = interpolate(zoomInSpring,  [0, 1], [1, 1.4]);
  const zoomOut = interpolate(zoomOutSpring, [0, 1], [0, 0.4]); // subtract up to 0.4
  const zoom    = Math.max(1, zoomIn - zoomOut);

  // ── Scan line ────────────────────────────────────────────────────────────────
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

  // ── Green flash ───────────────────────────────────────────────────────────────
  const flashIntensity = interpolate(
    frame,
    [FLASH_START, FLASH_PEAK, FLASH_END],
    [0, 0.18, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // ── ACCESS GRANTED badge ──────────────────────────────────────────────────────
  const badgeInSpring = spring({
    frame: frame - BADGE_IN,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  });
  const badgeScale   = interpolate(badgeInSpring, [0, 1], [0.5, 1]);
  const badgeVisible = interpolate(badgeInSpring, [0, 0.2], [0, 1], {
    extrapolateRight: 'clamp',
  });
  // Fade badge OUT when act 2 begins
  const badgeFadeOut = interpolate(frame, [BADGE_OUT, BADGE_OUT + 10], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const badgeOpacity = badgeVisible * badgeFadeOut;

  // Checkmark stroke animation
  const checkDraw = interpolate(frame, [BADGE_IN + 6, BADGE_IN + 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Cursor waypoints ──────────────────────────────────────────────────────────
  // Act 1: moves to scanner area, clicks, then disappears
  // Act 2: reappears at frame 125, follows spotlight across cards
  const cursorWaypoints = [
    // Act 1 — scanner click
    { frame: 14, x: 60, y: 50 },
    { frame: 20, x: 42, y: 28 },
    // Act 2 — card tour (reappear near left card, then traverse)
    { frame: SPOT_START - 5, x: CARD1_X - 4, y: CARD_Y + 4 },
    { frame: SPOT_START,     x: CARD1_X - 2, y: CARD_Y + 4 },
    { frame: SPOT_2,         x: CARD2_X - 2, y: CARD_Y + 4 },
    { frame: SPOT_3,         x: CARD3_X - 2, y: CARD_Y + 4 },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', overflow: 'hidden' }}>

      {/* ── Screenshot (dashboard.png, lang-aware path) ──────────────────────── */}
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
          src={staticFile(`demo-screens/${lang}/dashboard.png`)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* ── Green flash overlay ───────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `rgba(16,185,129,${flashIntensity})`,
          pointerEvents: 'none',
        }}
      />

      {/* ── Laser scan line — sweeps left→right at 27% from top ──────────────── */}
      {frame >= SCAN_START && frame <= SCAN_END && (
        <div
          style={{
            position: 'absolute',
            top: '27%',
            left: '10%',
            right: '10%',
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
              // Move a 12%-wide gradient blob from left to right
              left: `${scanProgress * 100 - 12}%`,
              width: '12%',
              background: 'linear-gradient(to right, transparent, #e63946, transparent)',
            }}
          />
        </div>
      )}

      {/* ── ACCESS GRANTED badge ─────────────────────────────────────────────── */}
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
          pointerEvents: 'none',
        }}
      >
        {/* Avatar initial */}
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
            flexShrink: 0,
          }}
        >
          R
        </div>

        {/* Name + status */}
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

        {/* Animated checkmark (strokeDashoffset draws the path) */}
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

      {/* ── Act 2 spotlight — moves across the three stat cards ───────────────── */}
      <Spotlight
        targets={[
          { frame: SPOT_START, cx: CARD1_X, cy: CARD_Y, rx: 180, ry: 110 },
          { frame: SPOT_2,     cx: CARD2_X, cy: CARD_Y, rx: 180, ry: 110 },
          { frame: SPOT_3,     cx: CARD3_X, cy: CARD_Y, rx: 180, ry: 110 },
        ]}
        intensity={0.42}
        fadeInFrame={SPOT_START}
      />

      {/* ── Cursor ─────────────────────────────────────────────────────────────── */}
      <Cursor
        waypoints={cursorWaypoints}
        clicks={[
          20,           // scanner click (act 1)
          SPOT_START,   // card 1
          SPOT_2,       // card 2
          SPOT_3,       // card 3
        ]}
        hideAfter={FLASH_START}
      />
    </div>
  );
}
