import { ReactNode, useRef, useState, TouchEvent } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  /** Distance (px) the user must pull before a refresh fires. */
  threshold?: number;
  /** Maximum visual pull distance (px). */
  maxPull?: number;
  /** Disable the gesture (e.g. while another sheet is open). */
  disabled?: boolean;
  className?: string;
}

/**
 * Lightweight pull-to-refresh wrapper for any scroll container.
 * Place it INSIDE the scroll container as the first child (or wrap content).
 * The gesture only activates when the container is already scrolled to the top.
 */
export default function PullToRefresh({
  onRefresh,
  children,
  threshold = 70,
  maxPull = 110,
  disabled = false,
  className,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const getScrollParent = (): HTMLElement | null => {
    let node: HTMLElement | null = containerRef.current?.parentElement || null;
    while (node) {
      const { overflowY } = getComputedStyle(node);
      if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (disabled || refreshing) return;
    const parent = getScrollParent();
    if (!parent || parent.scrollTop > 0) {
      startY.current = null;
      return;
    }
    startY.current = e.touches[0].clientY;
    pulling.current = false;
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (disabled || refreshing || startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) {
      setPull(0);
      pulling.current = false;
      return;
    }
    pulling.current = true;
    // Apply rubber-band damping
    const damped = Math.min(maxPull, dy * 0.5);
    setPull(damped);
  };

  const handleTouchEnd = async () => {
    if (disabled || refreshing) return;
    const shouldRefresh = pulling.current && pull >= threshold;
    startY.current = null;
    pulling.current = false;
    if (shouldRefresh) {
      setRefreshing(true);
      setPull(48);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  const progress = Math.min(1, pull / threshold);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={cn("relative", className)}
    >
      {/* Indicator */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 transition-opacity"
        style={{
          opacity: pull > 4 || refreshing ? 1 : 0,
          transform: `translate(-50%, ${Math.max(0, pull - 28)}px)`,
        }}
        aria-hidden
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card shadow-[0_8px_24px_hsl(var(--background)/0.45)]">
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <ArrowDown
              className="h-4 w-4 text-primary transition-transform"
              style={{ transform: `rotate(${progress >= 1 ? 180 : 0}deg)` }}
            />
          )}
        </div>
      </div>

      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: pulling.current ? "none" : "transform 200ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}