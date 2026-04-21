import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { DashboardPreview } from './DashboardPreview';

export const LandingPagePromo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a', fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <Sequence durationInFrames={395}>
        <div 
          style={{ 
            position: 'absolute', 
            inset: '30px', 
            transform: 'scale(0.85)',
            transformOrigin: 'center center',
            borderRadius: 0, 
            overflow: 'hidden',
            boxShadow: '6px 6px 0 #e63946',
            border: '2px solid #2a2a2a'
          }}
        >
           <DashboardPreview lang="en" />
        </div>
      </Sequence>
      
      {/* Overlay text sequence */}
      <AbsoluteFill style={{ padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 10 }}>
         {/* Manage your Gym. */}
         <Sequence from={10} durationInFrames={385}>
            <h1 
              style={{
                color: 'white',
                fontSize: '90px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '-2px',
                margin: 0,
                lineHeight: 1,
                opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateRight: 'clamp' }),
                transform: `translateY(${interpolate(spring({ frame: frame - 10, fps, config: { damping: 12 } }), [0, 1], [50, 0])}px)`
              }}
            >
              Manage your Gym.
            </h1>
         </Sequence>

         {/* Zero Friction. */}
         <Sequence from={100} durationInFrames={295}>
            <h1 
              style={{
                color: '#e63946',
                fontSize: '90px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '-2px',
                margin: 0,
                lineHeight: 1,
                opacity: interpolate(frame, [100, 115], [0, 1], { extrapolateRight: 'clamp' }),
                transform: `translateY(${interpolate(spring({ frame: frame - 100, fps, config: { damping: 12 } }), [0, 1], [50, 0])}px)`
              }}
            >
              Zero Friction.
            </h1>
         </Sequence>

         {/* Automated WhatsApp. */}
         <Sequence from={190} durationInFrames={205}>
            <h1 
              style={{
                color: 'white',
                fontSize: '90px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '-2px',
                margin: 0,
                lineHeight: 1,
                opacity: interpolate(frame, [190, 205], [0, 1], { extrapolateRight: 'clamp' }),
                transform: `translateY(${interpolate(spring({ frame: frame - 190, fps, config: { damping: 12 } }), [0, 1], [50, 0])}px)`
              }}
            >
              Automated WhatsApp.
            </h1>
         </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
