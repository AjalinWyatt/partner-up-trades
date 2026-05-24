import { useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, MoreVertical, Pencil, Trash2, Check, X } from "lucide-react";
import type { Message } from "./types";
import AudioPlayer from "./AudioPlayer";
import { supabase } from "@/integrations/supabase/client";
import { useSignedMediaUrl } from "@/hooks/use-signed-media-url";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface MessageBubbleProps {
  msg: Message;
  isMine: boolean;
  onDeleted?: (id: string) => void;
  onEdited?: (id: string, content: string) => void;
  /** Partner's avatar URL - shown next to incoming (not-mine) bubbles */
  partnerAvatarUrl?: string | null;
  /** Partner's display name for the avatar fallback initial */
  partnerName?: string;
  /** Whether to render the avatar (e.g. only on the last message in a streak) */
  showAvatar?: boolean;
}

function isImageType(type?: string | null) {
  return type?.startsWith("image/") || type === "image";
}

export default function MessageBubble({ msg, isMine, onDeleted, onEdited, partnerAvatarUrl, partnerName, showAvatar = true }: MessageBubbleProps) {
  const hasMedia = !!msg.media_url;
  const isAudio = msg.media_type?.startsWith("audio/") || msg.media_type === "audio";
  const isImage = isImageType(msg.media_type);
  const signedMediaUrl = useSignedMediaUrl(hasMedia ? msg.media_url : null);
  const isSharedPost = (msg.content || "").startsWith("Shared a post from ");
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toLowerCase();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.content || "");
  const [imageOpen, setImageOpen] = useState(false);
  const canEdit = isMine && !hasMedia && !isSharedPost;

  async function handleDelete() {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("messages").delete().eq("id", msg.id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    onDeleted?.(msg.id);
  }

  async function saveEdit() {
    const next = draft.trim();
    if (!next || next === msg.content) { setEditing(false); return; }
    const { error } = await supabase
      .from("messages")
      .update({ content: next })
      .eq("id", msg.id);
    if (error) {
      toast({ title: "Couldn't edit", description: error.message, variant: "destructive" });
      return;
    }
    onEdited?.(msg.id, next);
    setEditing(false);
  }

  return (
    <div className={cn("group flex w-full max-w-full min-w-0 flex-col overflow-hidden", isMine ? "items-end" : "items-start")}>
      <div className={cn("flex w-full max-w-full min-w-0 items-end gap-1.5 overflow-hidden", isMine ? "flex-row justify-end" : "flex-row")}>
        {!isMine && (
          showAvatar ? (
            partnerAvatarUrl ? (
              <img
                src={partnerAvatarUrl}
                alt={partnerName || "partner"}
                className="mb-0.5 h-6 w-6 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-foreground/70">
                {(partnerName || "?").replace(/^@/, "").charAt(0).toUpperCase()}
              </div>
            )
          ) : (
            <div className="w-6 shrink-0" aria-hidden />
          )
        )}
        {isMine && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="shrink-0 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                aria-label="Message actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {canEdit && (
                <DropdownMenuItem onClick={() => { setDraft(msg.content || ""); setEditing(true); }}>
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div
        className={cn(
          "min-w-0 max-w-[78%] overflow-hidden px-3 py-1.5 text-[12px] leading-snug [overflow-wrap:anywhere]",
          isMine
            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
            : "bg-secondary text-foreground rounded-2xl rounded-bl-md"
        )}
      >
        {hasMedia && isAudio && (
          <AudioPlayer url={signedMediaUrl} isMine={isMine} />
        )}
        {hasMedia && isImage && (
          <>
            <button
              type="button"
              onClick={() => setImageOpen(true)}
              className="block max-w-full"
              aria-label="Open image"
            >
              <img
                src={signedMediaUrl}
                alt={isSharedPost ? "Shared post" : "Shared image"}
                className={cn("rounded-lg w-auto mb-1 cursor-pointer", isSharedPost ? "max-h-64" : "max-h-48")}
              />
            </button>
            <Dialog open={imageOpen} onOpenChange={setImageOpen}>
              <DialogContent
                className="max-w-[100vw] sm:max-w-[95vw] w-screen h-[100dvh] sm:h-[95vh] p-0 bg-black/95 border-0 flex items-center justify-center overflow-hidden"
              >
                <img
                  src={signedMediaUrl}
                  alt={isSharedPost ? "Shared post" : "Shared image"}
                  className="max-w-full max-h-full object-contain select-none"
                  draggable={false}
                  onClick={() => setImageOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </>
        )}
        {hasMedia && !isAudio && !isImage && (
          <a
            href={signedMediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "mb-1 flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5",
              isMine ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-muted hover:bg-muted/80"
            )}
          >
            <FileText className="w-5 h-5 shrink-0" />
            <span className="min-w-0 truncate text-xs">{msg.content || "File"}</span>
          </a>
        )}
        {editing ? (
          <div className="flex w-[min(180px,60vw)] max-w-full min-w-0 items-center gap-1.5">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
              className="min-w-0 flex-1 rounded bg-primary-foreground/10 px-2 py-1 text-[12px] outline-none placeholder:text-primary-foreground/60"
            />
            <button onClick={saveEdit} aria-label="Save"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditing(false)} aria-label="Cancel"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          msg.content && (!hasMedia || isImage) && !isAudio && (
            <p className={cn("break-words whitespace-pre-wrap [overflow-wrap:anywhere]", isSharedPost && "text-[11px] leading-5 font-medium")}>{msg.content}</p>
          )
        )}
        </div>
      </div>
      {(msg as any).edited_at && (
        <p className="text-[9px] text-muted-foreground mt-0.5 px-1 opacity-70">edited · {time}</p>
      )}
    </div>
  );
}
