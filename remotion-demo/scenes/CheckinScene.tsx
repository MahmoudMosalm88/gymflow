import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, interpolateColors } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';

const { fontFamily } = loadFont('normal', { weights: ['400', '600', '700', '800'] });

// ── Timing constants ───────────────────────────────────────────────────────
const CARD_IN = 0;
const CORNERS_IN = 8;
const SCAN_START = 18;
const SCAN_END = 38;
const FLASH_START = 40;
const FLASH_PEAK = 44;
const FLASH_END = 54;
const BADGE_IN = 44;
const RING_START = 40;

function RippleRing({ delay, maxR }: { delay: number; maxR: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const prog = spring({ frame: frame - delay, fps, config: { damping: 30, stiffness: 100 }, durationInFrames: 28 });
  const r = interpolate(prog, [0, 1], [20, maxR]);
  const opacity = interpolate(prog, [0, 0.15, 1], [0, 0.5, 0], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute',
      top: '50%', left: '50%',
      width: r, height: r,
      marginLeft: -r / 2, marginTop: -r / 2,
      border: '2px solid #10b981',
      borderRadius: '50%',
      opacity,
      pointerEvents: 'none',
    }} />
  );
}

export function CheckinScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Card entrance — drops down with bounce
  const cardSpring = spring({ frame: frame - CARD_IN, fps, config: { damping: 14, stiffness: 290 }, durationInFrames: 24 });
  const cardY = interpolate(cardSpring, [0, 1], [40, 0]);
  const cardOpacity = interpolate(cardSpring, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' });

  // Corner markers: stagger opacity in (no transform — avoids SVG/CSS conflict)
  const c1 = spring({ frame: frame - CORNERS_IN, fps, config: { damping: 16, stiffness: 300 }, durationInFrames: 14 });
  const c2 = spring({ frame: frame - CORNERS_IN - 5, fps, config: { damping: 16, stiffness: 300 }, durationInFrames: 14 });
  const c3 = spring({ frame: frame - CORNERS_IN - 10, fps, config: { damping: 16, stiffness: 300 }, durationInFrames: 14 });

  // Scan line
  const scanY = interpolate(frame, [SCAN_START, SCAN_END], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scanOpacity = interpolate(frame, [SCAN_START, SCAN_START + 4, SCAN_END - 4, SCAN_END], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // QR border color shifts red → green when scan completes
  const qrColorProgress = interpolate(frame, [SCAN_END, FLASH_START], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const qrBorderColor = interpolateColors(qrColorProgress, [0, 1], ['#e63946', '#10b981']);
  const scanLineColor = interpolateColors(qrColorProgress, [0, 1], ['#e63946', '#10b981']);

  // Green flash
  const flashIntensity = interpolate(frame, [FLASH_START, FLASH_PEAK, FLASH_END], [0, 0.2, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bgColor = interpolateColors(frame, [FLASH_START, FLASH_PEAK, FLASH_END], ['#141414', '#0a1f16', '#141414']);

  // Badge pops in with overshoot
  const badgeSpring = spring({ frame: frame - BADGE_IN, fps, config: { damping: 9, stiffness: 360 }, durationInFrames: 20 });
  const badgeScale = interpolate(badgeSpring, [0, 1], [0.5, 1]);
  const badgeOpacity = interpolate(badgeSpring, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' });

  const showRipples = frame >= RING_START;

  return (
    <div style={{ position: 'absolute', inset: 0, background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily }}>
      {/* Fullscreen green flash */}
      <div style={{ position: 'absolute', inset: 0, background: `rgba(16,185,129,${flashIntensity})`, pointerEvents: 'none' }} />

      {/* Ripple rings after scan */}
      {showRipples && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ position: 'relative', width: 1, height: 1 }}>
            <RippleRing delay={RING_START} maxR={280} />
            <RippleRing delay={RING_START + 7} maxR={360} />
            <RippleRing delay={RING_START + 14} maxR={440} />
          </div>
        </div>
      )}

      {/* Main card */}
      <div style={{
        background: '#1e1e1e',
        border: '2px solid #2a2a2a',
        boxShadow: '8px 8px 0 #000',
        padding: '32px 40px',
        width: 400,
        opacity: cardOpacity,
        transform: `translateY(${cardY}px)`,
      }}>
        <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18, textAlign: 'center' }}>
          QR SCANNER
        </div>

        {/* QR box — overflow:hidden keeps corners inside */}
        <div style={{
          position: 'relative',
          width: 180,
          height: 180,
          margin: '0 auto 24px',
          border: `2px solid ${qrBorderColor}`,
          background: '#0a0a0a',
          overflow: 'hidden',
        }}>
          <svg width="180" height="180" viewBox="0 0 180 180">
            {/* Top-left corner */}
            <g opacity={c1}>
              <rect x="14" y="14" width="42" height="42" fill="none" stroke="#e63946" strokeWidth="2.5" />
              <rect x="22" y="22" width="26" height="26" fill="#e63946" opacity="0.5" />
            </g>
            {/* Top-right corner */}
            <g opacity={c2}>
              <rect x="124" y="14" width="42" height="42" fill="none" stroke="#e63946" strokeWidth="2.5" />
              <rect x="132" y="22" width="26" height="26" fill="#e63946" opacity="0.5" />
            </g>
            {/* Bottom-left corner */}
            <g opacity={c3}>
              <rect x="14" y="124" width="42" height="42" fill="none" stroke="#e63946" strokeWidth="2.5" />
              <rect x="22" y="132" width="26" height="26" fill="#e63946" opacity="0.5" />
            </g>
            {/* Data dots */}
            {[72, 82, 92, 102, 112].flatMap(cx =>
              [72, 82, 92, 102, 112].map(cy => (
                <rect key={`${cx}-${cy}`} x={cx} y={cy} width="5" height="5" fill="#555" opacity={(cx + cy) % 20 < 12 ? 0.8 : 0.2} />
              ))
            )}
          </svg>

          {/* Scan line */}
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${scanY}%`,
            height: 2,
            background: `linear-gradient(to right, transparent, ${scanLineColor}, transparent)`,
            opacity: scanOpacity,
            pointerEvents: 'none',
          }} />
        </div>

        {/* ACCESS GRANTED badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          background: 'rgba(16,185,129,0.08)',
          border: '2px solid #10b981',
          opacity: badgeOpacity,
          transform: `scale(${badgeScale})`,
          transformOrigin: 'center',
        }}>
          <div style={{ width: 38, height: 38, background: '#0d2a1e', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#10b981', fontWeight: 800 }}>A</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#f0f0f0', fontWeight: 700 }}>Ahmed Hassan</div>
            <div style={{ fontSize: 10, color: '#10b981', fontWeight: 800, letterSpacing: '0.07em', marginTop: 2 }}>ACCESS GRANTED</div>
          </div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
      </div>
    </div>
  );
}
