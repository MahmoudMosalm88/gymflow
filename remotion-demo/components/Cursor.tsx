import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface Waypoint {
  frame: number;
  x: number; // viewport %
  y: number; // viewport %
}

interface CursorProps {
  waypoints: Waypoint[];
  clicks?: number[]; // frames where a click happens
  hideAfter?: number; // frame to fade out
}

export function Cursor({ waypoints, clicks = [], hideAfter }: CursorProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!waypoints.length || frame < waypoints[0].frame - 3) return null;

  // Fade in
  const fadeIn = interpolate(frame, [waypoints[0].frame - 3, waypoints[0].frame + 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Fade out
  const fadeOut = hideAfter
    ? interpolate(frame, [hideAfter, hideAfter + 6], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  // Interpolate position between waypoints using springs
  let x = waypoints[0].x;
  let y = waypoints[0].y;

  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    if (frame >= prev.frame) {
      const dur = Math.max(curr.frame - prev.frame, 1);
      const prog = spring({
        frame: Math.max(0, frame - prev.frame),
        fps,
        config: { damping: 22, stiffness: 100 },
        durationInFrames: dur,
      });
      x = interpolate(prog, [0, 1], [prev.x, curr.x]);
      y = interpolate(prog, [0, 1], [prev.y, curr.y]);
    }
  }

  // Click: quick press-down + release
  let clickScale = 1;
  for (const cf of clicks) {
    if (frame >= cf && frame <= cf + 6) {
      const t = (frame - cf) / 6;
      clickScale = t < 0.35
        ? interpolate(t, [0, 0.35], [1, 0.78])
        : interpolate(t, [0.35, 1], [0.78, 1]);
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        opacity: fadeIn * fadeOut,
        transform: `scale(${clickScale})`,
        transformOrigin: '3px 1px',
        pointerEvents: 'none',
        zIndex: 100,
        filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.55))',
      }}
    >
      {/* Standard pointer cursor */}
      <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
        <path
          d="M1.5 1L1.5 17L5.5 12.5L9 20.5L11.5 19.2L8 11.5L13 10.5L1.5 1Z"
          fill="white"
          stroke="#111"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
