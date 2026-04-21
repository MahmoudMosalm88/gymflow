import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { Cursor } from '../components/Cursor';
import { Spotlight } from '../components/Spotlight';

// Revenue scene: income page (0–160) → crossfade to subscriptions page (160–315)
// Phase 1: spotlight on revenue cards, cursor clicks collection rate badge
// Phase 2: spotlight on renewal alerts / expiring plans, cursor scrolls down the list

// ── Frame constants ──────────────────────────────────────────────────────────
const FADE_IN        = 0;
const ZOOM1_START    = 8;
const SPOT1_FRAME    = 20;   // spotlight on revenue cards area
const CLICK1_FRAME   = 40;   // cursor clicks collection rate badge

const XFADE_START    = 160;  // crossfade begins
const XFADE_END      = 175;  // crossfade ends (15 frames)

const ZOOM2_START    = 165;
const SPOT2_FRAME    = 190;  // spotlight on renewal alerts
const DRIFT_START    = 250;  // Ken Burns drift begins
const TOTAL          = 315;

export function RevenueScene({ lang }: { lang: 'en' | 'ar' }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Phase 1: income page opacity ───────────────────────────────────────────
  const fadeIn = interpolate(frame, [FADE_IN, FADE_IN + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Fade income.png OUT during crossfade
  const incomeOpacity = interpolate(frame, [XFADE_START, XFADE_END], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Income page zoom: 1→1.2x, anchored to revenue cards (top half)
  const zoom1Spring = spring({
    frame: frame - ZOOM1_START,
    fps,
    config: { damping: 200 },
    durationInFrames: 50,
  });
  const zoom1 = interpolate(zoom1Spring, [0, 1], [1, 1.2]);

  // ── Phase 2: subscriptions page opacity ────────────────────────────────────
  // Fade subscriptions.png IN during crossfade
  const subsOpacity = interpolate(frame, [XFADE_START, XFADE_END], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Subscriptions page zoom: 1→1.15x
  const zoom2Spring = spring({
    frame: frame - ZOOM2_START,
    fps,
    config: { damping: 200 },
    durationInFrames: 50,
  });
  const zoom2 = interpolate(zoom2Spring, [0, 1], [1, 1.15]);

  // Ken Burns vertical drift on subscriptions page (frames 250–315): translateY 0→-2%
  const drift = interpolate(frame, [DRIFT_START, TOTAL], [0, -2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', overflow: 'hidden' }}>

      {/* ── Income page (Phase 1) ─────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: fadeIn * incomeOpacity,
          transform: `scale(${zoom1})`,
          transformOrigin: '50% 35%',
        }}
      >
        <Img
          src={staticFile(`demo-screens/${lang}/income.png`)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* ── Subscriptions page (Phase 2) ─────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: subsOpacity,
          transform: `scale(${zoom2}) translateY(${drift}%)`,
          transformOrigin: '50% 45%',
        }}
      >
        <Img
          src={staticFile(`demo-screens/${lang}/subscriptions.png`)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* ── Spotlight ─────────────────────────────────────────────────────── */}
      {/* Phase 1: revenue cards area */}
      {frame < XFADE_END && (
        <Spotlight
          targets={[{ frame: SPOT1_FRAME, cx: 50, cy: 35, rx: 400, ry: 120 }]}
          intensity={0.4}
        />
      )}
      {/* Phase 2: renewal alerts / expiring plans */}
      {frame >= XFADE_START && (
        <Spotlight
          targets={[{ frame: SPOT2_FRAME, cx: 50, cy: 50, rx: 380, ry: 160 }]}
          intensity={0.4}
          fadeInFrame={SPOT2_FRAME}
        />
      )}

      {/* ── Cursor ────────────────────────────────────────────────────────── */}
      {/* Phase 1: move to collection rate badge, click at frame 40 */}
      {frame < XFADE_START && (
        <Cursor
          waypoints={[
            { frame: SPOT1_FRAME - 5, x: 55, y: 50 },  // start near centre
            { frame: SPOT1_FRAME,     x: 50, y: 33 },  // move to revenue cards area
            { frame: CLICK1_FRAME,    x: 58, y: 38 },  // hover over collection rate badge
          ]}
          clicks={[CLICK1_FRAME]}
          hideAfter={XFADE_START - 10}
        />
      )}
      {/* Phase 2: cursor moves down the subscriptions list */}
      {frame >= XFADE_END && (
        <Cursor
          waypoints={[
            { frame: XFADE_END,       x: 50, y: 42 },  // appear at top of list
            { frame: SPOT2_FRAME,     x: 50, y: 50 },  // scroll down to renewal alerts
            { frame: SPOT2_FRAME + 40, x: 50, y: 60 }, // continue scrolling
          ]}
          clicks={[]}
          hideAfter={TOTAL - 15}
        />
      )}
    </div>
  );
}
