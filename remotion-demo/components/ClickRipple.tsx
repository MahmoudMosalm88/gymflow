import React from 'react';
import { useCurrentFrame, spring } from 'remotion';

interface ClickEntry {
  frame: number;       // the frame this click fires on
  x: number;           // center position as a viewport %
  y: number;           // center position as a viewport %
  color?: string;      // ring color (default rgba(230,57,70,0.6))
}

interface ClickRippleProps {
  clicks: ClickEntry[];
}

// --- Timing constants ---
const RIPPLE_DURATION = 15; // frames each ripple lives for

export function ClickRipple({ clicks }: ClickRippleProps) {
  const currentFrame = useCurrentFrame();

  return (
    <>
      {clicks.map((click, i) => {
        const age = currentFrame - click.frame; // frames since this click fired

        // Only render while the ripple is alive
        if (age < 0 || age > RIPPLE_DURATION) return null;

        const ringColor = click.color ?? 'rgba(230,57,70,0.6)';

        // Spring drives the ring radius from 0 → 40px with a smooth premium feel
        const radiusProgress = spring({
          frame: age,
          fps: 30,
          config: { damping: 200 },
          durationInFrames: RIPPLE_DURATION,
        });

        // radius: 0px at start, 40px at full expansion
        const radius = radiusProgress * 40;

        // opacity: 0.6 at start, 0 at end — fades out as the ring expands
        const opacity = (1 - radiusProgress) * 0.6;

        return (
          <div
            key={`ripple-${i}-${click.frame}`}
            style={{
              position: 'absolute',
              // Center the ring on the click point.
              // We offset by the radius so the ring grows outward from the click.
              left: `${click.x}%`,
              top: `${click.y}%`,
              width: radius * 2,
              height: radius * 2,
              marginLeft: -radius,
              marginTop: -radius,
              borderRadius: '50%',
              border: `2px solid ${ringColor}`,
              opacity,
              pointerEvents: 'none',
              zIndex: 90,
            }}
          />
        );
      })}
    </>
  );
}
