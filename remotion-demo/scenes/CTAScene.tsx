import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';

// CTAScene — 240 frames (8s @ 30fps)
// Closing scene: logo → tagline → CTA button, each spring in sequentially

export function CTAScene({ lang }: { lang: 'en' | 'ar' }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Copy ---
  const tagline = lang === 'ar' ? 'ناديك. على الأوتوبايلوت.' : 'Your gym. On autopilot.';
  const ctaLabel = lang === 'ar' ? 'ابدأ تجربتك المجانية' : 'Start your free trial';
  const fontFamily = lang === 'ar' ? 'Cairo, sans-serif' : "'IBM Plex Sans', sans-serif";

  // --- Global fade-out: last 20 frames (220–240) ---
  const globalOpacity = interpolate(frame, [220, 240], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // --- Logo: springs in at frame 15, scale 0.5→1, opacity 0→1 ---
  const logoSpring = spring({
    frame: frame - 15,
    fps,
    config: { damping: 200 },
  });
  const logoScale = interpolate(logoSpring, [0, 1], [0.5, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);

  // --- Tagline: springs in at frame 45, translateY 20→0, opacity 0→1 ---
  const taglineSpring = spring({
    frame: frame - 45,
    fps,
    config: { damping: 200 },
  });
  const taglineY = interpolate(taglineSpring, [0, 1], [20, 0]);
  const taglineOpacity = interpolate(taglineSpring, [0, 1], [0, 1]);

  // --- CTA button: springs in at frame 75, translateY 15→0, opacity 0→1 ---
  const ctaSpring = spring({
    frame: frame - 75,
    fps,
    config: { damping: 200 },
  });
  const ctaY = interpolate(ctaSpring, [0, 1], [15, 0]);
  const ctaOpacity = interpolate(ctaSpring, [0, 1], [0, 1]);

  // --- Glow pulse behind logo: very subtle radial-gradient opacity oscillation ---
  // Math.sin gives a value in [-1, 1]; we map that to [0.03, 0.08]
  const glowOpacity = interpolate(Math.sin(frame * 0.08), [-1, 1], [0.03, 0.08]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        // RTL direction for Arabic
        direction: lang === 'ar' ? 'rtl' : 'ltr',
        fontFamily,
        // Global fade-out applied to entire scene
        opacity: globalOpacity,
      }}
    >
      {/* Glow pulse: absolutely positioned radial gradient behind logo */}
      <div
        style={{
          position: 'absolute',
          width: 340,
          height: 340,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #e63946 0%, transparent 70%)',
          opacity: glowOpacity,
          // No pointer events — purely decorative
          pointerEvents: 'none',
        }}
      />

      {/* Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          // Use transform-origin center for a natural scale-in
          transformOrigin: 'center center',
          position: 'relative', // sits above glow layer
          zIndex: 1,
        }}
      >
        <Img
          src={staticFile('gymflow-logo.png')}
          style={{
            width: 120,
            height: 120,
            display: 'block',
          }}
        />
      </div>

      {/* Tagline */}
      <p
        style={{
          fontFamily,
          fontSize: 36,
          fontWeight: 'bold',
          color: '#ffffff',
          margin: 0,
          textAlign: 'center',
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {tagline}
      </p>

      {/* CTA Button */}
      <div
        style={{
          opacity: ctaOpacity,
          transform: `translateY(${ctaY}px)`,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            background: '#e63946',
            color: '#ffffff',
            padding: '14px 36px',
            fontSize: 18,
            fontWeight: 'bold',
            fontFamily,
            boxShadow: '6px 6px 0 #000',
            // Flat, sharp corners — no border-radius — for a bold, confident feel
            cursor: 'default',
            userSelect: 'none',
          }}
        >
          {ctaLabel}
        </div>
      </div>
    </div>
  );
}
