'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import styles from '../../landing.module.css';

interface HeroProps {
  t: {
    heroLabel: string;
    heroTitle: string;
    heroTitleEm: string;
    heroSub: string;
    heroCta: string;
    heroCtaSecondary: string;
    heroMicro: string;
  };
}

const PLAYBACK_RATE = 0.8;

export default function Hero({ t }: HeroProps) {
  const [open, setOpen] = useState(false);
  const inlineVideoRef = useRef<HTMLVideoElement>(null);
  const modalVideoRef = useRef<HTMLVideoElement>(null);

  // Apply slow playback rate to inline video
  useEffect(() => {
    const v = inlineVideoRef.current;
    if (!v) return;
    v.playbackRate = PLAYBACK_RATE;
  }, []);

  // Apply playback rate to modal video when it mounts, and sync to inline position
  useEffect(() => {
    if (!open) return;
    const mv = modalVideoRef.current;
    const iv = inlineVideoRef.current;
    if (!mv) return;
    mv.playbackRate = PLAYBACK_RATE;
    // Sync to the same timestamp as the inline video
    if (iv) mv.currentTime = iv.currentTime;
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const BrowserFrame = ({ videoRef, isModal }: { videoRef: React.RefObject<HTMLVideoElement>; isModal: boolean }) => (
    <div className={styles.browserFrame} style={isModal ? {} : undefined}>
      <div className={styles.browserBar}>
        <span className={styles.dot} style={{ background: '#e63946' }} />
        <span className={styles.dot} style={{ background: '#f59e0b' }} />
        <span className={styles.dot} style={{ background: '#10b981' }} />
        <span className={styles.urlBar}>gymflowsystem.com/dashboard</span>
      </div>
      <video
        ref={videoRef}
        src="/demo.webm"
        autoPlay
        muted
        loop
        playsInline
        className={styles.heroVideo}
      />
    </div>
  );

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          {/* Left: text */}
          <div className={styles.heroText}>
            <p className={styles.label}>{t.heroLabel}</p>
            <h1 className={styles.heroTitle}>
              {t.heroTitle} <em>{t.heroTitleEm}</em>
            </h1>
            <p className={styles.heroSub}>{t.heroSub}</p>

            <div className={styles.heroCtas}>
              <Link href="/login?mode=register" className={styles.ctaPrimary}>
                {t.heroCta}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
              </Link>
              <Link href="/login?mode=login" className={styles.ctaSecondary}>
                {t.heroCtaSecondary}
              </Link>
            </div>
            <p className={styles.heroMicro}>{t.heroMicro}</p>
          </div>

          {/* Right: clickable video frame */}
          <div
            className={styles.browserFrameClickable}
            onClick={() => setOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
            aria-label="Expand dashboard preview"
          >
            <BrowserFrame videoRef={inlineVideoRef} isModal={false} />
            <span className={styles.expandHint}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
              Click to expand
            </span>
          </div>
        </div>
      </section>

      {/* Modal */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          className={styles.videoModalOverlay}
          onClick={() => setOpen(false)}
        >
          <div
            className={styles.videoModalInner}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.videoModalClose}
              onClick={() => setOpen(false)}
              aria-label="Close preview"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <BrowserFrame videoRef={modalVideoRef} isModal />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
