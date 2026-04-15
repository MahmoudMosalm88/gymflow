import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { Cursor } from '../components/Cursor';
import { Spotlight } from '../components/Spotlight';

const { fontFamily } = loadFont('normal', { weights: ['400', '600', '700', '800'] });

// Members scene: cursor clicks search → typewriter → cursor selects result row
// Screenshot coords (1280×800):
// Search bar: y=191–222, x=311–695
// First row (Samer Mahmoud): y=297–345, x=155–1225

const FADE_IN = 0;
const ZOOM_START = 8;
const CURSOR_SEARCH = 16;
const TYPEWRITER_START = 22;
const TYPEWRITER_END = 52;
const CURSOR_TO_ROW = 54;
const ROW_SELECT = 58;

const ZOOM = 1.25;
const ORIGIN_X = 0.5;
const ORIGIN_Y = 0.48;
const SEARCH_TEXT = 'Samer Mahmoud';

function mapX(xPct: number) { return (xPct - ORIGIN_X) * ZOOM + ORIGIN_X; }
function mapY(yPct: number) { return (yPct - ORIGIN_Y) * ZOOM + ORIGIN_Y; }

const SEARCH_TOP = mapY(191 / 800);
const SEARCH_LEFT = mapX(311 / 1280);
const SEARCH_HEIGHT = (222 - 191) / 800 * ZOOM;
const ROW_TOP = mapY(297 / 800);
const ROW_BOTTOM = mapY(345 / 800);
const ROW_MID_X = mapX(690 / 1280);

export function MembersScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [FADE_IN, 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const zoomSpring = spring({
    frame: frame - ZOOM_START,
    fps,
    config: { damping: 28, stiffness: 110 },
    durationInFrames: 40,
  });
  const zoomVal = interpolate(zoomSpring, [0, 1], [1, ZOOM]);

  // Typewriter
  const chars = Math.floor(
    interpolate(frame, [TYPEWRITER_START, TYPEWRITER_END], [0, SEARCH_TEXT.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const displayText = SEARCH_TEXT.slice(0, chars);
  const cursorBlink =
    frame >= TYPEWRITER_START && frame <= TYPEWRITER_END + 10 && Math.sin(frame / 5) > 0;

  const searchOpacity = interpolate(
    frame,
    [TYPEWRITER_START - 2, TYPEWRITER_START + 4],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Row highlight — subtle background glow instead of red border
  const rowGlow = spring({
    frame: frame - ROW_SELECT,
    fps,
    config: { damping: 18, stiffness: 200 },
    durationInFrames: 14,
  });
  const rowGlowOpacity = interpolate(rowGlow, [0, 0.3], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', overflow: 'hidden' }}>
      {/* Screenshot */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: fadeIn,
          transform: `scale(${zoomVal})`,
          transformOrigin: `${ORIGIN_X * 100}% ${ORIGIN_Y * 100}%`,
        }}
      >
        <Img
          src={staticFile('demo-screens/members.png')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Typewriter text overlay */}
      {frame >= TYPEWRITER_START && (
        <div
          style={{
            position: 'absolute',
            top: `${SEARCH_TOP * 100}%`,
            left: `${SEARCH_LEFT * 100 + 3}%`,
            height: `${SEARCH_HEIGHT * 100}%`,
            display: 'flex',
            alignItems: 'center',
            fontFamily,
            fontSize: 13 * (zoomVal / ZOOM),
            color: '#e8e4df',
            opacity: searchOpacity,
            pointerEvents: 'none',
            gap: 1,
          }}
        >
          {displayText}
          {cursorBlink && <span style={{ color: '#e63946', fontWeight: 700 }}>|</span>}
        </div>
      )}

      {/* Subtle row glow on result — warm highlight, no border */}
      {frame >= ROW_SELECT && (
        <div
          style={{
            position: 'absolute',
            top: `${ROW_TOP * 100}%`,
            left: `${mapX(155 / 1280) * 100}%`,
            right: `${(1 - mapX(1225 / 1280)) * 100}%`,
            height: `${(ROW_BOTTOM - ROW_TOP) * 100}%`,
            background: 'rgba(230,57,70,0.08)',
            boxShadow: '0 0 20px 6px rgba(230,57,70,0.06)',
            opacity: rowGlowOpacity,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Spotlight on search → then on result row */}
      <Spotlight
        targets={[
          { frame: CURSOR_SEARCH, cx: SEARCH_LEFT * 100 + 20, cy: SEARCH_TOP * 100, rx: 260, ry: 60 },
          { frame: CURSOR_TO_ROW, cx: ROW_MID_X * 100, cy: ROW_TOP * 100 + 3, rx: 440, ry: 60 },
        ]}
        intensity={0.35}
      />

      {/* Cursor: moves to search, then down to result row */}
      <Cursor
        waypoints={[
          { frame: CURSOR_SEARCH, x: 55, y: 50 },
          { frame: CURSOR_SEARCH + 4, x: SEARCH_LEFT * 100 + 8, y: SEARCH_TOP * 100 + 2 },
          { frame: CURSOR_TO_ROW, x: ROW_MID_X * 100 - 15, y: (ROW_TOP + ROW_BOTTOM) / 2 * 100 },
        ]}
        clicks={[CURSOR_SEARCH + 4, ROW_SELECT]}
      />
    </div>
  );
}
