import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { Cursor } from '../components/Cursor';
import { Spotlight } from '../components/Spotlight';

// ─── Frame constants ───────────────────────────────────────────────────────────
// Phase 1: Members list (frames 0–150)
const FADE_IN         = 0;
const ZOOM_START      = 8;
const TYPEWRITER_START = 30;
const TYPEWRITER_END  = 58;   // "Samer" = 5 chars × 4 frames each + start
const ROW_HIGHLIGHT   = 60;
const CURSOR_CLICK_ROW = 70;

// Phase 2: Member detail (frames 150–315)
const CROSSFADE_START = 150;
const CROSSFADE_END   = 165;
const DETAIL_SPOT     = 180;  // spotlight on header/subscription area
const CURSOR_DETAIL   = 185;  // cursor moves to subscription badge
const KEN_BURNS_START = 200;

const SEARCH_TEXT = 'Samer'; // typewriter string

// ─── Layout approximations (viewport %) ───────────────────────────────────────
// Members list screenshot:
//   Search bar:   top ~22%, left ~20%
//   Row highlight: top ~35% of viewport
// Member detail screenshot:
//   Header / subscription badge: top ~30%, centre x

export function MembersScene({ lang }: { lang: 'en' | 'ar' }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Fade in ──────────────────────────────────────────────────────────────────
  const fadeIn = interpolate(frame, [FADE_IN, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Phase 1 zoom: 1 → 1.15 ───────────────────────────────────────────────────
  const phase1ZoomSpring = spring({
    frame: frame - ZOOM_START,
    fps,
    config: { damping: 200 },
    durationInFrames: 40,
  });
  const phase1Zoom = interpolate(phase1ZoomSpring, [0, 1], [1, 1.15]);

  // ── Phase 2 zoom: 1.15 → 1.2 (after crossfade) ───────────────────────────────
  const phase2ZoomSpring = spring({
    frame: frame - CROSSFADE_END,
    fps,
    config: { damping: 200 },
    durationInFrames: 25,
  });
  const phase2Zoom = interpolate(phase2ZoomSpring, [0, 1], [0, 0.05]); // adds 0→0.05

  // ── Ken Burns: subtle horizontal drift on detail screen ──────────────────────
  const kenBurnsDrift = interpolate(frame, [KEN_BURNS_START, 315], [0, -1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Crossfade: members.png fades out, member-detail.png fades in ──────────────
  const membersOpacity = interpolate(frame, [CROSSFADE_START, CROSSFADE_END], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const detailOpacity = interpolate(frame, [CROSSFADE_START, CROSSFADE_END], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Typewriter ────────────────────────────────────────────────────────────────
  // One character every 4 frames
  const charsVisible = Math.floor(
    interpolate(frame, [TYPEWRITER_START, TYPEWRITER_END], [0, SEARCH_TEXT.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const displayText  = SEARCH_TEXT.slice(0, charsVisible);
  // Blinking cursor while typing
  const showCaret    = frame >= TYPEWRITER_START && frame <= TYPEWRITER_END + 8 && Math.sin(frame / 5) > 0;
  const typewriterOpacity = interpolate(frame, [TYPEWRITER_START - 2, TYPEWRITER_START + 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── Row highlight bar ─────────────────────────────────────────────────────────
  const rowHighlightSpring = spring({
    frame: frame - ROW_HIGHLIGHT,
    fps,
    config: { damping: 200 },
    durationInFrames: 14,
  });
  const rowHighlightOpacity = interpolate(rowHighlightSpring, [0, 0.3], [0, 1], {
    extrapolateRight: 'clamp',
  });
  // Fade out row highlight once crossfade starts
  const rowHighlightFade = interpolate(frame, [CROSSFADE_START, CROSSFADE_END], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', overflow: 'hidden' }}>

      {/* ── Phase 1: Members list ─────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          // Fade the whole layer: appears at start, crossfades out at frame 150
          opacity: fadeIn * membersOpacity,
          transform: `scale(${phase1Zoom})`,
          transformOrigin: '50% 40%',
        }}
      >
        <Img
          src={staticFile(`demo-screens/${lang}/members.png`)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* ── Typewriter overlay — sits at ~22% from top, ~20% from left ───────── */}
      {frame >= TYPEWRITER_START && frame < CROSSFADE_END && (
        <div
          style={{
            position: 'absolute',
            top: '22%',
            left: '20%',
            padding: '3px 7px',
            background: 'rgba(10,10,10,0.7)',
            fontFamily: 'monospace',
            fontSize: 14,
            color: '#ffffff',
            opacity: typewriterOpacity * membersOpacity,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            letterSpacing: '0.04em',
          }}
        >
          {displayText}
          {showCaret && (
            <span style={{ color: '#e63946', fontWeight: 700 }}>|</span>
          )}
        </div>
      )}

      {/* ── Row highlight bar — semi-transparent white at ~35% from top ───────── */}
      {frame >= ROW_HIGHLIGHT && frame < CROSSFADE_END && (
        <div
          style={{
            position: 'absolute',
            top: '35%',
            left: '5%',
            right: '5%',
            height: '6%',
            background: 'rgba(255,255,255,0.10)',
            borderRadius: 2,
            opacity: rowHighlightOpacity * rowHighlightFade,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── Phase 1 spotlight — member list area ─────────────────────────────── */}
      {frame < CROSSFADE_END && (
        <Spotlight
          targets={[
            { frame: 14, cx: 50, cy: 35, rx: 420, ry: 160 },
          ]}
          intensity={0.38}
          fadeInFrame={14}
        />
      )}

      {/* ── Phase 2: Member detail ────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: detailOpacity,
          // phase2Zoom adds a tiny extra scale after crossfade; ken burns drifts left
          transform: `scale(${1.15 + phase2Zoom}) translateX(${kenBurnsDrift}%)`,
          transformOrigin: '50% 35%',
        }}
      >
        <Img
          src={staticFile(`demo-screens/${lang}/member-detail.png`)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* ── Phase 2 spotlight — header / subscription status area ────────────── */}
      {frame >= CROSSFADE_START && (
        <Spotlight
          targets={[
            // Subscription/header band at ~30% from top
            { frame: DETAIL_SPOT, cx: 50, cy: 30, rx: 380, ry: 100 },
            // Drift spotlight slightly toward subscription badge as cursor moves
            { frame: CURSOR_DETAIL + 20, cx: 60, cy: 33, rx: 300, ry: 90 },
          ]}
          intensity={0.42}
          fadeInFrame={CROSSFADE_END}
        />
      )}

      {/* ── Cursor ─────────────────────────────────────────────────────────────── */}
      <Cursor
        waypoints={[
          // Phase 1: appears near search bar, clicks it, then moves to row
          { frame: 22,              x: 55, y: 50 },
          { frame: 26,              x: 22, y: 22 },   // hover search bar
          { frame: CURSOR_CLICK_ROW, x: 50, y: 37 },  // click the highlighted row
          // Phase 2: re-materialises near subscription badge after crossfade
          { frame: CURSOR_DETAIL,   x: 58, y: 32 },
          { frame: CURSOR_DETAIL + 30, x: 62, y: 34 },
        ]}
        clicks={[
          26,               // click search bar
          CURSOR_CLICK_ROW, // click row
          CURSOR_DETAIL,    // click subscription badge
        ]}
        hideAfter={290}
      />
    </div>
  );
}
