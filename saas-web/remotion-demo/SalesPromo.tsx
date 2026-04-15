import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { DashboardPreview } from './DashboardPreview';
import { TransitionSeries, springTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';

export const SalesPromo: React.FC = () => {
    const T = 15;
    const SNAPPY = springTiming({ config: { damping: 200, stiffness: 400 }, durationInFrames: T });

    return (
        <AbsoluteFill style={{ backgroundColor: '#0a0a0a', fontFamily: 'IBM Plex Sans, sans-serif' }}>
            <TransitionSeries>
                {/* Intro */}
                <TransitionSeries.Sequence durationInFrames={120}>
                    <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e63946' }}>
                        <h1 style={{ color: '#0a0a0a', fontSize: '100px', fontWeight: 900, textAlign: 'center', textTransform: 'uppercase', lineHeight: 1.1 }}>
                            Tired of manual<br />gym tracking?
                        </h1>
                    </AbsoluteFill>
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition presentation={fade()} timing={SNAPPY} />

                {/* Dashboard Preview wrapped */}
                <TransitionSeries.Sequence durationInFrames={395}>
                    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
                        <Sequence from={0} durationInFrames={395}>
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: '40px',
                                    borderRadius: 0,
                                    overflow: 'hidden',
                                    boxShadow: '8px 8px 0 #e63946',
                                    border: '2px solid #2a2a2a'
                                }}
                            >
                                <DashboardPreview />
                            </div>
                        </Sequence>
                    </AbsoluteFill>
                </TransitionSeries.Sequence>

                <TransitionSeries.Transition presentation={fade()} timing={SNAPPY} />

                {/* Outro */}
                <TransitionSeries.Sequence durationInFrames={150}>
                    <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' }}>
                        <div style={{ textAlign: 'center' }}>
                            <h1 style={{ color: 'white', fontSize: '120px', fontWeight: 900, marginBottom: 40, textTransform: 'uppercase' }}>
                                GYMFLOW
                            </h1>
                            <h2 style={{ color: '#0a0a0a', backgroundColor: '#e63946', display: 'inline-block', padding: '20px 40px', fontSize: '50px', fontWeight: 700, textTransform: 'uppercase' }}>
                                Join the platform.
                            </h2>
                        </div>
                    </AbsoluteFill>
                </TransitionSeries.Sequence>
            </TransitionSeries>
        </AbsoluteFill>
    );
};
