import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getInitials, timeAgo } from "@/lib/matchUtils";
import { cn } from "@/lib/utils";
import type { StoryGroup } from "./StoriesBar";
import { useSwipeDismiss } from "@/hooks/use-swipe-dismiss";
import { toast } from "sonner";

interface StoryViewerProps {
  open: boolean;
  group: StoryGroup | null;
  storyIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const StoryViewer = ({ open, group, storyIndex, onClose, onNext, onPrev }: StoryViewerProps) => {
  const story = useMemo(() => (group ? group.stories[storyIndex] : null), [group, storyIndex]);
  const swipeDismiss = useSwipeDismiss({ onDismiss: onClose });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [liked, setLiked] = useState(false);

  const marketTag = useMemo(() => {
    if (!story?.caption) return null;
    return ["Crypto", "Forex", "Indices", "Futures", "Options", "Commodities"].find((tag) =>
      story.caption?.toLowerCase().includes(tag.toLowerCase())
    ) || null;
  }, [story?.caption]);

  const displayCaption = useMemo(() => {
    if (!story?.caption) return "";
    return marketTag ? story.caption.replace(new RegExp(marketTag, "i"), "").replace(/^\s*[·\-–:]\s*/, "").trim() : story.caption;
  }, [marketTag, story?.caption]);

  useEffect(() => {
    if (!open || !group || !story) return;
    setProgress(0);
    setIsHolding(false);
  }, [group, open, story, storyIndex]);

  useEffect(() => {
    if (!open || !story || isHolding) return;

    if (story.mediaType === "video") {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
        if (!video.duration) return;
        setProgress(Math.min(100, (video.currentTime / video.duration) * 100));
      };

      const handleEnded = () => onNext();
      video.play().catch(() => undefined);
      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("ended", handleEnded);

      return () => {
        video.pause();
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("ended", handleEnded);
      };
    }

    const interval = window.setInterval(() => {
      setProgress((current) => {
        const next = current + 2;
        if (next >= 100) {
          window.clearInterval(interval);
          onNext();
          return 100;
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(interval);
  }, [isHolding, onNext, open, story]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || story?.mediaType !== "video") return;
    if (isHolding) {
      video.pause();
      return;
    }
    video.play().catch(() => undefined);
  }, [isHolding, story?.mediaType]);

  const handleHoldStart = () => setIsHolding(true);
  const handleHoldEnd = () => setIsHolding(false);

  const handleReply = () => {
    toast("Pulse replies can route into DMs next.");
  };

  if (!group || !story) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-none border-0 bg-transparent p-0 shadow-none sm:max-w-sm">
        <div
          {...swipeDismiss}
          onMouseDown={handleHoldStart}
          onMouseUp={handleHoldEnd}
          onMouseLeave={handleHoldEnd}
          onTouchStart={(event) => {
            swipeDismiss.onTouchStart(event);
            handleHoldStart();
          }}
          onTouchMove={swipeDismiss.onTouchMove}
          onTouchEnd={() => {
            swipeDismiss.onTouchEnd();
            handleHoldEnd();
          }}
          className="relative mx-auto flex h-[100dvh] w-full max-w-sm overflow-hidden bg-card sm:h-[88vh] sm:rounded-[28px] sm:border sm:border-border"
        >
          <button onClick={onPrev} className="absolute inset-y-0 left-0 z-10 w-1/3" aria-label="Previous pulse" />
          <button onClick={onNext} className="absolute inset-y-0 right-0 z-10 w-1/3" aria-label="Next pulse" />

          {story.mediaType === "video" ? (
            <video ref={videoRef} src={story.mediaUrl} className="h-full w-full object-cover" playsInline muted />
          ) : (
            <img src={story.mediaUrl} alt={`${group.username} pulse`} className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/72 via-background/6 to-background/88" />

          <div className="absolute inset-x-0 top-0 z-20 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
            <div className="mb-4 flex gap-1">
              {group.stories.map((item, index) => (
                <span key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-background/25">
                  <span
                    className={cn("block h-full rounded-full bg-primary transition-[width] duration-100", index < storyIndex ? "w-full" : index === storyIndex ? "w-[var(--pulse-progress)]" : "w-0")}
                    style={{ ["--pulse-progress" as string]: `${progress}%` }}
                  />
                </span>
              ))}
            </div>

            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-primary-foreground">
                  <p className="truncate text-sm font-semibold">{group.username}</p>
                  <span className="text-[11px] text-primary-foreground/72">{timeAgo(story.createdAt)}</span>
                  {marketTag && (
                    <span className="rounded-full border border-background/20 bg-background/15 px-2 py-0.5 text-[10px] font-medium text-primary-foreground/88">
                      {marketTag}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-background/20 bg-background/35 text-primary-foreground backdrop-blur-sm">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-12">
            <div className="space-y-4">
              {displayCaption && (
                <p className="max-w-[90%] text-sm leading-6 text-primary-foreground">
                  {displayCaption}
                </p>
              )}

              <div className="flex items-center justify-between border-t border-background/15 pt-3 text-primary-foreground">
                <div className="flex items-center gap-5 text-sm">
                  <span className="text-primary-foreground/72">← tap left</span>
                  <span className="text-primary-foreground/72">tap right →</span>
                </div>
              </div>

              <div className="flex items-center gap-6 border-t border-background/15 pt-3 text-sm text-primary-foreground">
                <button onClick={handleReply} className="inline-flex items-center gap-2 text-primary-foreground/88 transition-colors hover:text-primary-foreground">
                  <MessageCircle className="h-4 w-4" /> reply
                </button>
                <button
                  onClick={() => setLiked((current) => !current)}
                  className="inline-flex items-center gap-2 text-primary-foreground/88 transition-colors hover:text-primary-foreground"
                >
                  <Heart className={cn("h-4 w-4", liked ? "fill-destructive text-destructive" : "") } /> like
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoryViewer;