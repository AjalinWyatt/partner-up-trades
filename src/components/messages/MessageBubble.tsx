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
  const isSharedPost = (msg.content || "").startsWith("Shared a post from ");
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toLowerCase();

  return (
    <div className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[78%] px-4 py-2.5 text-[13px] leading-relaxed",
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
        {msg.content && (!hasMedia || isAudio || isImage) && <p className={cn(isSharedPost && "whitespace-pre-wrap text-[12px] leading-5 font-medium")}>{msg.content}</p>}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 px-1">
        {isMine ? "Client" : "Partner"} <span className="opacity-60">|</span> {time}
      </p>
    </div>
  );
}
