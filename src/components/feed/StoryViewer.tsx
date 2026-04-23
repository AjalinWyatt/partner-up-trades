import { useEffect, useMemo } from "react";
import { ChevronDown, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getInitials, timeAgo } from "@/lib/matchUtils";
import { cn } from "@/lib/utils";
import type { StoryGroup } from "./StoriesBar";

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

  useEffect(() => {
    if (!open || !group || !story) return;
    const timeout = window.setTimeout(() => {
      if (storyIndex < group.stories.length - 1) onNext();
    }, 5000);
    return () => window.clearTimeout(timeout);
  }, [group, onNext, open, story, storyIndex]);

  if (!group || !story) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-none border-0 bg-transparent p-0 shadow-none sm:max-w-sm">
        <div className="relative mx-auto flex h-[100dvh] w-full max-w-sm overflow-hidden bg-card sm:h-[88vh] sm:rounded-[28px] sm:border sm:border-border">
          <button onClick={onPrev} className="absolute inset-y-0 left-0 z-10 w-1/3" aria-label="Previous story" />
          <button onClick={onNext} className="absolute inset-y-0 right-0 z-10 w-1/3" aria-label="Next story" />

          <img src={story.mediaUrl} alt={`${group.fullName} story`} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-transparent to-background/85" />

          <div className="absolute inset-x-0 top-0 z-20 p-3">
            <div className="mb-3 flex gap-1">
              {group.stories.map((item, index) => (
                <span key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-background/25">
                  <span className={cn("block h-full rounded-full bg-primary", index <= storyIndex ? "w-full" : "w-0")} />
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-background/40 bg-secondary">
                {group.avatarUrl ? (
                  <img src={group.avatarUrl} alt={group.fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-black text-foreground">
                    {getInitials(group.fullName || group.username)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-primary-foreground">{group.username}</p>
                <p className="text-[11px] text-primary-foreground/80">{timeAgo(story.createdAt)}</p>
              </div>
              <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-background/20 text-primary-foreground backdrop-blur-sm">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {story.caption && (
            <div className="absolute inset-x-0 bottom-0 z-20 max-h-[32dvh] overflow-y-auto p-4">
              <p className="rounded-2xl bg-background/35 px-4 py-3 text-sm leading-6 text-primary-foreground backdrop-blur-sm">
                {story.caption}
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute bottom-4 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-background/30 px-3 py-1.5 text-[11px] font-medium text-primary-foreground backdrop-blur-sm sm:hidden"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoryViewer;