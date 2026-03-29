import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import type { Message } from "./types";
import AudioPlayer from "./AudioPlayer";

interface MessageBubbleProps {
  msg: Message;
  isMine: boolean;
}

function isImageType(type?: string | null) {
  return type?.startsWith("image/") || type === "image";
}

export default function MessageBubble({ msg, isMine }: MessageBubbleProps) {
  const hasMedia = !!msg.media_url;
  const isAudio = msg.media_type?.startsWith("audio/") || msg.media_type === "audio";
  const isImage = isImageType(msg.media_type);

  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] px-3.5 py-2 text-[13px] leading-relaxed",
          isMine
            ? "bg-gradient-brand text-white rounded-2xl rounded-br-md"
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
              alt="Shared image"
              className="rounded-lg max-h-48 w-auto mb-1 cursor-pointer"
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
        {msg.content && (!hasMedia || isAudio || isImage) && <p>{msg.content}</p>}
        <p className={cn("text-[9px] mt-1 text-right", isMine ? "text-primary-foreground/50" : "text-muted-foreground")}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}
