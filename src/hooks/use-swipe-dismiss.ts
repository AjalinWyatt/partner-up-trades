import { useRef } from "react";

interface UseSwipeDismissOptions {
  onDismiss: () => void;
  threshold?: number;
  enabled?: boolean;
}

export const useSwipeDismiss = ({ onDismiss, threshold = 90, enabled = true }: UseSwipeDismissOptions) => {
  const startYRef = useRef<number | null>(null);
  const deltaYRef = useRef(0);

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (!enabled) return;
    startYRef.current = event.touches[0]?.clientY ?? null;
    deltaYRef.current = 0;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    if (!enabled || startYRef.current === null) return;
    const currentY = event.touches[0]?.clientY ?? startYRef.current;
    deltaYRef.current = currentY - startYRef.current;
  };

  const handleTouchEnd = () => {
    if (!enabled) return;
    if (deltaYRef.current > threshold) onDismiss();
    startYRef.current = null;
    deltaYRef.current = 0;
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};