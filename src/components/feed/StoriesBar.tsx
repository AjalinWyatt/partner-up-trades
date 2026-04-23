import { Plus } from "lucide-react";
import { getInitials } from "@/lib/matchUtils";
import { cn } from "@/lib/utils";

export interface StoryItem {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: string;
  caption: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface StoryGroup {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  viewed: boolean;
  isOwn: boolean;
  latestCreatedAt: string;
  stories: StoryItem[];
}

interface StoriesBarProps {
  groups: StoryGroup[];
  ownGroup: StoryGroup | null;
  myAvatarUrl: string | null;
  myName: string;
  onAddStory: () => void;
  onOpenStory: (groupIndex: number) => void;
}

const StoriesBar = ({ groups, ownGroup, myAvatarUrl, myName, onAddStory, onOpenStory }: StoriesBarProps) => {
  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center">
          <div className="relative">
            <button
              onClick={ownGroup ? () => onOpenStory(0) : onAddStory}
              className={cn(
                "flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border bg-secondary",
                ownGroup?.viewed ? "border-border" : ownGroup ? "border-primary/50" : "border-border"
              )}
            >
              {myAvatarUrl ? (
                <img src={myAvatarUrl} alt="Your story" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-black text-foreground">
                  {getInitials(myName || "Y")}
                </div>
              )}
            </button>
            <button onClick={onAddStory} className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
              <Plus className="h-3 w-3" strokeWidth={2.4} />
            </button>
          </div>
          <span className="line-clamp-1 text-[11px] font-medium text-foreground">Your story</span>
        </div>

        {groups.map((group, index) => (
          <button key={group.userId} onClick={() => onOpenStory(index + (ownGroup ? 1 : 0))} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center">
            <div
              className={cn(
                "rounded-full p-[2px]",
                group.viewed ? "bg-border" : "bg-gradient-to-br from-primary via-success to-accent"
              )}
            >
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-secondary">
                {group.avatarUrl ? (
                  <img src={group.avatarUrl} alt={group.fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-black text-foreground">
                    {getInitials(group.fullName || group.username)}
                  </div>
                )}
              </div>
            </div>
            <span className="line-clamp-1 text-[11px] font-medium text-foreground">{group.username}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StoriesBar;