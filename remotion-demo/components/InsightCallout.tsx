import React from 'react';
import { useCurrentFrame, spring, interpolate } from 'remotion';

interface InsightCalloutProps {
  frame: number;       // the frame at which this callout springs in
  x: number;           // left position as a viewport %
  y: number;           // top position as a viewport %
  title: string;
  body: string;
  highlightColor?: string; // accent color for border + shadow (default #e63946)
  delay?: number;      // extra frames to wait before springing in
}

// --- Timing constants ---
const SPRING_IN_DURATION = 18; // frames for the spring-in animation

export function InsightCallout({
  frame,
  x,
  y,
  title,
  body,
  highlightColor = '#e63946',
  delay = 0,
}: InsightCalloutProps) {
  const currentFrame = useCurrentFrame();

  // The frame at which this callout actually starts animating
  const startFrame = frame + delay;

  // Spring progress: goes from 0 → 1 as the callout enters
  const progress = spring({
    frame: Math.max(0, currentFrame - startFrame),
    fps: 30,
    config: { damping: 200 },
    durationInFrames: SPRING_IN_DURATION,
  });

  // Scale: springs from 0.6 → 1.0
  const scale = interpolate(progress, [0, 1], [0.6, 1]);

  // Opacity: fades from 0 → 1 (driven by same spring progress)
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  // Pulsing border ring: Math.sin modulates border opacity between 0.5 and 1.0
  // Uses currentFrame so the pulse continues after the spring-in settles
  const borderOpacity = interpolate(
    Math.sin(currentFrame * 0.15),
    [-1, 1],
    [0.5, 1.0]
  );

  // Don't render at all before the callout is supposed to appear
  if (currentFrame < startFrame) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        opacity,
        pointerEvents: 'none',
        zIndex: 50,

        // Brutalist card style
        background: 'rgba(10,10,10,0.95)',
        border: `2px solid ${highlightColor}`,
        borderColor: `rgba(${hexToRgb(highlightColor)},${borderOpacity})`,
        boxShadow: `6px 6px 0 ${highlightColor}`,
        padding: '10px 14px',
        minWidth: 160,
        maxWidth: 220,
      }}
    >
      {/* Title row */}
      <div
        style={{
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 700,
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1.3,
          marginBottom: 4,
        }}
      >
        {title}
      </div>

      {/* Body row */}
      <div
        style={{
          color: '#9ca3af', // muted gray
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
          lineHeight: 1.4,
        }}
      >
        {body}
      </div>
    </div>
  );
}

// Helper: converts a hex color string like "#e63946" into "230,57,70"
// so we can embed it in rgba() for the animated border opacity.
function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r},${g},${b}`;
}
