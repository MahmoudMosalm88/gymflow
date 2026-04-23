import React from 'react';
import { useCurrentFrame, interpolate, Easing } from 'remotion';

interface CountUpProps {
  from?: number;          // starting value (default 0)
  to: number;             // ending value
  startFrame: number;     // frame at which the count starts
  durationFrames: number; // how many frames the count lasts
  prefix?: string;        // text before the number, e.g. "$"
  suffix?: string;        // text after the number, e.g. "%"
  decimals?: number;      // decimal places to display (default 0)
  x: number;              // left position as viewport %
  y: number;              // top position as viewport %
  fontSize?: number;      // font size in px (default 48)
  color?: string;         // text color (default "#ffffff")
}

// --- Timing constants ---
const FADE_IN_DURATION = 6; // frames for the initial opacity fade-in

export function CountUp({
  from = 0,
  to,
  startFrame,
  durationFrames,
  prefix = '',
  suffix = '',
  decimals = 0,
  x,
  y,
  fontSize = 48,
  color = '#ffffff',
}: CountUpProps) {
  const currentFrame = useCurrentFrame();

  // Invisible before startFrame
  if (currentFrame < startFrame) return null;

  // Fade in quickly when the counter first appears
  const opacity = interpolate(
    currentFrame,
    [startFrame, startFrame + FADE_IN_DURATION],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Interpolate the number value with a cubic ease-out for slot-machine deceleration.
  // The number shoots up fast and gradually slows to a stop — satisfying to watch.
  const rawValue = interpolate(
    currentFrame,
    [startFrame, startFrame + durationFrames],
    [from, to],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }
  );

  // Format: round to the requested decimal places, then add thousand separators
  const formatted = formatNumber(rawValue, decimals);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        opacity,
        pointerEvents: 'none',
        zIndex: 60,

        // Monospace so each digit takes up the same width — prevents layout jumps
        fontFamily: '"Roboto Mono", "Courier New", monospace',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 700,
        fontSize,
        color,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {prefix}{formatted}{suffix}
    </div>
  );
}

// Formats a number to the given decimal places and adds comma thousand separators.
// e.g. formatNumber(1234567.8, 1) → "1,234,567.8"
function formatNumber(value: number, decimals: number): string {
  const fixed = value.toFixed(decimals);

  // Split into integer and decimal parts so we only add commas to the integer side
  const [intPart, decPart] = fixed.split('.');

  // Add commas every 3 digits from the right
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
}
