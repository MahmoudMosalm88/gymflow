import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

// HookScene — 165 frames (5.5s @ 30fps)
// Emotional hook: text-only on dark background, springs in then fades out

export function HookScene({ lang }: { lang: 'en' | 'ar' }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Copy per language
  const text =
    lang === 'ar'
      ? 'إدارة النادي لا يجب أن تكون وظيفة بدوام كامل.'
      : "Running a gym shouldn't feel like a second full-time job.";

  // Spring in starting at frame 10 — drives translateY and opacity
  const enterSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 200 },
  });

  // translateY: 30px → 0
  const translateY = interpolate(enterSpring, [0, 1], [30, 0]);

  // opacity for enter: 0 → 1
  const enterOpacity = interpolate(enterSpring, [0, 1], [0, 1]);

  // Fade out over last 25 frames (frames 140–165)
  const exitOpacity = interpolate(frame, [140, 165], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Combine: enter opacity gates first, then exit gates at end
  const opacity = Math.min(enterOpacity, exitOpacity);

  // Font choice depends on language
  const fontFamily =
    lang === 'ar' ? 'Cairo, sans-serif' : "'IBM Plex Sans', sans-serif";

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // ensure the outer container never clips text
        overflow: 'hidden',
      }}
    >
      <p
        style={{
          fontFamily,
          fontSize: 52,
          fontWeight: 'bold',
          color: '#f0f0f0',
          lineHeight: 1.3,
          maxWidth: 800,
          textAlign: 'center',
          margin: 0,
          padding: '0 40px',
          // RTL for Arabic
          direction: lang === 'ar' ? 'rtl' : 'ltr',
          // Remotion-controlled animation values
          opacity,
          transform: `translateY(${translateY}px)`,
        }}
      >
        {text}
      </p>
    </div>
  );
}
