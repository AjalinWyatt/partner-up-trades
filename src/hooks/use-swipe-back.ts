import { useEffect, useRef } from "react";

/**
 * Safe left-edge swipe-back gesture.
 *
 * Safety guarantees:
 * - Only triggers when the touch STARTS within `edgeSize` px of the left edge.
 *   This avoids hijacking horizontal scroll containers, carousels, tabs, etc.
 * - Requires a minimum horizontal distance (`threshold`) AND that horizontal
 *   movement dominates vertical movement (prevents conflict with vertical scroll).
 * - Ignores the gesture entirely while the user is typing in an input/textarea
 *   or interacting with a contenteditable element.
 * - Single-touch only — multi-touch (pinch/zoom) is ignored.
 * - Passive listeners — never blocks native scrolling.
 */
interface UseSwipeBackOptions {
  onBack: () => void;
  enabled?: boolean;
  edgeSize?: number; // px from left edge where gesture must start
  threshold?: number; // min horizontal px to trigger
}

const isTypingTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
};

export const useSwipeBack = ({
  onBack,
  enabled = true,
  edgeSize = 24,
  threshold = 70,
}: UseSwipeBackOptions) => {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const trackingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        trackingRef.current = false;
        return;
      }
      // Don't hijack typing
      if (isTypingTarget(e.target) || isTypingTarget(document.activeElement)) {
        trackingRef.current = false;
        return;
      }
      const t = e.touches[0];
      if (t.clientX > edgeSize) {
        trackingRef.current = false;
        return;
      }
      startXRef.current = t.clientX;
      startYRef.current = t.clientY;
      trackingRef.current = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!trackingRef.current) return;
      trackingRef.current = false;
      const startX = startXRef.current;
      const startY = startYRef.current;
      startXRef.current = null;
      startYRef.current = null;
      if (startX === null || startY === null) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      // Must be a clear rightward swipe, mostly horizontal
      if (dx >= threshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
        onBack();
      }
    };

    const onTouchCancel = () => {
      trackingRef.current = false;
      startXRef.current = null;
      startYRef.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [enabled, edgeSize, threshold, onBack]);
};