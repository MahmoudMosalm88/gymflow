import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { Cursor } from '../components/Cursor';
import { Spotlight } from '../components/Spotlight';

// WhatsApp automation scene (255 frames / 8.5s)
// Show automation toggles → cursor clicks toggle → "message sent" pill springs in
// Spotlight slides down to notification feed at frame 120
// Ken Burns drift from frame 180–255

// ── Frame constants ──────────────────────────────────────────────────────────
const FADE_IN        = 0;
const ZOOM_START     = 8;
const SPOT1_FRAME    = 20;   // spotlight on automation toggles
const CLICK_FRAME    = 40;   // cursor clicks a toggle
const PILL_FRAME     = 60;   // "message sent" pill springs in
const SPOT2_FRAME    = 120;  // spotlight shifts to notification feed
const DRIFT_START    = 180;  // Ken Burns drift begins
const TOTAL          = 255;

export function WhatsAppScene({ lang }: { lang: 'en' | 'ar' }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Fade in ────────────────────────────────────────────────────────────────
  const fadeIn = interpolate(frame, [FADE_IN, FADE_IN + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Zoom: 1→1.25x, anchored to toggles area ───────────────────────────────
  const zoomSpring = spring({
    frame: frame - ZOOM_START,
    fps,
    config: { damping: 200 },
    durationInFrames: 50,
  });
  const zoom = interpolate(zoomSpring, [0, 1], [1, 1.25]);

  // ── Ken Burns vertical drift (frames 180–255): translateY 0→-2% ──────────
  const drift = interpolate(frame, [DRIFT_START, TOTAL], [0, -2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── "Message Sent" pill animation ─────────────────────────────────────────
  // Springs in from scale(0.5) opacity(0) at frame 60
  const pillSpring = spring({
    frame: frame - PILL_FRAME,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  });
  const pillScale   = interpolate(pillSpring, [0, 1], [0.5, 1]);
  const pillOpacity = interpolate(pillSpring, [0, 1], [0, 1]);

  // Pill fades out near end so it doesn't clutter the second spotlight phase
  const pillFadeOut = interpolate(frame, [SPOT2_FRAME - 10, SPOT2_FRAME + 5], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', overflow: 'hidden' }}>

      {/* ── Screenshot ────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: fadeIn,
          transform: `scale(${zoom}) translateY(${drift}%)`,
          transformOrigin: '50% 40%',
        }}
      >
        <Img
          src={staticFile(`demo-screens/${lang}/whatsapp.png`)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* ── Spotlight (slides from toggles to notification feed) ─────────── */}
      <Spotlight
        targets={[
          { frame: SPOT1_FRAME,  cx: 50, cy: 40, rx: 350, ry: 130 },
          { frame: SPOT2_FRAME,  cx: 50, cy: 65, rx: 380, ry: 150 },
        ]}
        intensity={0.4}
      />

      {/* ── "Message Sent" indicator pill ─────────────────────────────────── */}
      {frame >= PILL_FRAME && (
        <div
          style={{
            position: 'absolute',
            // Placed at ~right:25%, top:55% as specified
            right: '25%',
            top: '55%',
            transform: `scale(${pillScale})`,
            transformOrigin: 'center center',
            opacity: pillOpacity * pillFadeOut,
            pointerEvents: 'none',
            zIndex: 20,
            // Green pill styling
            background: '#10b981',
            borderRadius: 999,
            padding: '6px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
          }}
        >
          <span style={{ color: 'white', fontSize: 13, fontWeight: 600, fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>
            ✓ Message Sent
          </span>
        </div>
      )}

      {/* ── Cursor ────────────────────────────────────────────────────────── */}
      {/* Moves to toggle area, clicks at frame 40, then idles */}
      <Cursor
        waypoints={[
          { frame: SPOT1_FRAME - 5, x: 55, y: 50 },   // start near centre
          { frame: SPOT1_FRAME,     x: 50, y: 38 },   // move to toggles area
          { frame: CLICK_FRAME,     x: 62, y: 41 },   // hover over a specific toggle
          { frame: CLICK_FRAME + 20, x: 62, y: 41 },  // hold briefly after click
        ]}
        clicks={[CLICK_FRAME]}
        hideAfter={SPOT2_FRAME - 5}
      />
    </div>
  );
}
