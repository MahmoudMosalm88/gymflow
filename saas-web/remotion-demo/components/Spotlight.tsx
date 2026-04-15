import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface SpotTarget {
  frame: number;
  cx: number; // center x in viewport %
  cy: number; // center y in viewport %
  rx?: number; // ellipse x radius in px (default 280)
  ry?: number; // ellipse y radius in px (default 180)
}

interface SpotlightProps {
  targets: SpotTarget[];
  intensity?: number; // 0–1, how dark the vignette is (default 0.45)
  fadeInFrame?: number;
}

export function Spotlight({ targets, intensity = 0.45, fadeInFrame }: SpotlightProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!targets.length) return null;

  const startFrame = fadeInFrame ?? targets[0].frame;

  // Fade in the whole spotlight effect
  const opacity = interpolate(frame, [startFrame - 2, startFrame + 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (opacity <= 0) return null;

  // Interpolate spotlight center between targets
  let cx = targets[0].cx;
  let cy = targets[0].cy;
  let rx = targets[0].rx ?? 280;
  let ry = targets[0].ry ?? 180;

  for (let i = 1; i < targets.length; i++) {
    const prev = targets[i - 1];
    const curr = targets[i];
    if (frame >= prev.frame) {
      const dur = Math.max(curr.frame - prev.frame, 1);
      const prog = spring({
        frame: Math.max(0, frame - prev.frame),
        fps,
        config: { damping: 26, stiffness: 90 },
        durationInFrames: dur,
      });
      cx = interpolate(prog, [0, 1], [prev.cx, curr.cx]);
      cy = interpolate(prog, [0, 1], [prev.cy, curr.cy]);
      rx = interpolate(prog, [0, 1], [prev.rx ?? 280, curr.rx ?? 280]);
      ry = interpolate(prog, [0, 1], [prev.ry ?? 180, curr.ry ?? 180]);
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse ${rx}px ${ry}px at ${cx}% ${cy}%, transparent 0%, rgba(0,0,0,${intensity}) 100%)`,
        opacity,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
}
