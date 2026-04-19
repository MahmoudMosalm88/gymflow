'use client';

import { useState, useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

type Props = {
  onRefresh: () => Promise<void>;
  children: ReactNode;
};

const THRESHOLD = 80; // px to pull before triggering refresh

export default function PullToRefresh({ onRefresh, children }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);

  // Spinner opacity and rotation driven by pull distance
  const spinnerOpacity = useTransform(y, [0, THRESHOLD * 0.5, THRESHOLD], [0, 0.5, 1]);
  const spinnerScale = useTransform(y, [0, THRESHOLD], [0.5, 1]);

  // Only allow pull when scrolled to top
  const canPull = () => {
    if (!containerRef.current) return false;
    const scrollParent = containerRef.current.closest('main');
    return !scrollParent || scrollParent.scrollTop <= 0;
  };

  const handleDragEnd = async () => {
    if (y.get() >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(10);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 start-0 end-0 flex items-center justify-center pointer-events-none z-10"
        style={{ opacity: spinnerOpacity, scale: spinnerScale, y: useTransform(y, [0, THRESHOLD], [-20, 12]) }}
      >
        <div
          className={`h-6 w-6 border-2 border-destructive border-t-transparent rounded-full ${
            refreshing ? 'animate-spin' : ''
          }`}
        />
      </motion.div>

      {/* Draggable content area */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.4, bottom: 0 }}
        style={{ y, touchAction: 'pan-x' }}
        onDrag={(_, info) => {
          // Prevent downward drag if not at scroll top
          if (!canPull() && info.delta.y > 0) {
            y.set(0);
          }
          // Prevent upward drag past 0
          if (y.get() < 0) {
            y.set(0);
          }
        }}
        onDragEnd={handleDragEnd}
        dragDirectionLock
        dragSnapToOrigin
      >
        {children}
      </motion.div>
    </div>
  );
}
