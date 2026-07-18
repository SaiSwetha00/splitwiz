"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

const THRESHOLD = 64; // px to pull before triggering

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLElement>(null);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPullDistance(0);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop === 0) {
        startYRef.current = e.touches[0].clientY;
        pullingRef.current = true;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!pullingRef.current) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 0) {
        // Dampen the pull with sqrt curve
        setPullDistance(Math.min(THRESHOLD * 1.5, Math.sqrt(delta) * 6));
      } else {
        pullingRef.current = false;
        setPullDistance(0);
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      const delta = e.changedTouches[0].clientY - startYRef.current;
      if (delta >= THRESHOLD && !refreshing) {
        if (navigator.vibrate) navigator.vibrate(10);
        void handleRefresh();
      } else {
        setPullDistance(0);
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: true });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [handleRefresh, refreshing]);

  return { refreshing, pullDistance, containerRef };
}
