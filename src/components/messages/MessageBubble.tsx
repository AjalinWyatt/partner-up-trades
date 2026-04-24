import { useState } from "react";
import { cn } from "@/lib/utils";
import { FileText, MoreVertical, Pencil, Trash2, Check, X } from "lucide-react";
import type { Message } from "./types";
import AudioPlayer from "./AudioPlayer";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

interface MessageBubbleProps {
  msg: Message;
  isMine: boolean;
  onDeleted?: (id: string) => void;
  onEdited?: (id: string, content: string) => void;
}

function isImageType(type?: string | null) {
  return type?.startsWith("image/") || type === "image";
}

export default function MessageBubble({ msg, isMine, onDeleted, onEdited }: MessageBubbleProps) {
  const hasMedia = !!msg.media_url;
  const isAudio = msg.media_type?.startsWith("audio/") || msg.media_type === "audio";
  const isImage = isImageType(msg.media_type);
  const isSharedPost = (msg.content || "").startsWith("Shared a post from ");
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toLowerCase();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.content || "");
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
    <div className={cn("group flex flex-col", isMine ? "items-end" : "items-start")}>
      <div className={cn("flex items-center gap-1", isMine ? "flex-row" : "flex-row-reverse")}>
        {isMine && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground"
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
          "max-w-[78%] px-3 py-1.5 text-[12px] leading-snug",
          isMine
            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
            : "bg-secondary text-foreground rounded-2xl rounded-bl-md"
        )}
      >
        {hasMedia && isAudio && (
          <AudioPlayer url={msg.media_url!} isMine={isMine} />
        )}
        {hasMedia && isImage && (
          <a href={msg.media_url!} target="_blank" rel="noopener noreferrer">
            <img
              src={msg.media_url!}
              alt={isSharedPost ? "Shared post" : "Shared image"}
              className={cn("rounded-lg w-auto mb-1 cursor-pointer", isSharedPost ? "max-h-64" : "max-h-48")}
            />
          </a>
        )}
        {hasMedia && !isAudio && !isImage && (
          <a
            href={msg.media_url!}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 mb-1 px-2 py-1.5 rounded-lg",
              isMine ? "bg-white/10 hover:bg-white/20" : "bg-muted hover:bg-muted/80"
            )}
          >
            <FileText className="w-5 h-5 shrink-0" />
            <span className="text-xs truncate">{msg.content || "File"}</span>
          </a>
        )}
        {editing ? (
          <div className="flex items-center gap-1.5 min-w-[180px]">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditing(false); }}
              className="flex-1 bg-white/10 rounded px-2 py-1 text-[12px] outline-none placeholder:text-primary-foreground/60"
            />
            <button onClick={saveEdit} aria-label="Save"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditing(false)} aria-label="Cancel"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          msg.content && (!hasMedia || isAudio || isImage) && (
            <p className={cn(isSharedPost && "whitespace-pre-wrap text-[11px] leading-5 font-medium")}>{msg.content}</p>
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
