import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { Spotlight } from '../components/Spotlight';

// Montage scene (195 frames / 6.5s)
// Quick look at PT hub using pt.png (guest-passes.png not yet available — update later)
// No cursor — spotlight tells the story.
// First half (0–95): spotlight on upper portion (trainer cards / header)
// Second half (95–195): spotlight slides to lower portion (schedule / session list)
// Slow Ken Burns zoom throughout: 1.0→1.1x over full duration

// ── Frame constants ──────────────────────────────────────────────────────────
const FADE_IN      = 0;
const SPOT1_FRAME  = 15;   // first spotlight appears
const SPOT2_FRAME  = 95;   // spotlight slides down
const TOTAL        = 195;

export function MontageScene({ lang }: { lang: 'en' | 'ar' }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Fade in over 10 frames ─────────────────────────────────────────────────
  const fadeIn = interpolate(frame, [FADE_IN, FADE_IN + 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Ken Burns zoom: slow 1.0→1.1x over the full 195 frames ───────────────
  // Using a spring that settles gently rather than a linear interpolate so
  // there's no abrupt stop if the scene is extended.
  const zoomSpring = spring({
    frame: frame,
    fps,
    config: { damping: 200 },
    durationInFrames: TOTAL,
  });
  const zoom = interpolate(zoomSpring, [0, 1], [1.0, 1.1]);

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', overflow: 'hidden' }}>

      {/* ── Screenshot ────────────────────────────────────────────────────── */}
      {/*
        Using pt.png for both halves.
        When guest-passes.png is available, swap the first half to that asset.
      */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          // Slightly elevated brightness to give the "self-evident features" feel
          opacity: fadeIn,
          filter: 'brightness(1.06) contrast(1.03)',
          transform: `scale(${zoom})`,
          transformOrigin: '50% 50%',
        }}
      >
        <Img
          src={staticFile(`demo-screens/${lang}/pt.png`)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* ── Spotlight: upper half → lower half ────────────────────────────── */}
      <Spotlight
        targets={[
          // First half — trainer cards / header area
          { frame: SPOT1_FRAME, cx: 50, cy: 35, rx: 400, ry: 150 },
          // Second half — schedule / session list
          { frame: SPOT2_FRAME, cx: 50, cy: 60, rx: 400, ry: 150 },
        ]}
        intensity={0.42}
        fadeInFrame={SPOT1_FRAME}
      />
    </div>
  );
}
