import { useState, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  url: string;
  isMine: boolean;
}

export default function AudioPlayer({ url, isMine }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const formatDur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <audio
        ref={audioRef}
        src={url}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a && a.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <button
        onClick={toggle}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          isMine ? "bg-white/20 hover:bg-white/30" : "bg-primary/10 hover:bg-primary/20"
        )}
      >
        {playing ? (
          <Pause className={cn("w-3.5 h-3.5", isMine ? "text-white" : "text-foreground")} />
        ) : (
          <Play className={cn("w-3.5 h-3.5 ml-0.5", isMine ? "text-white" : "text-foreground")} />
        )}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className={cn("h-1 rounded-full w-full", isMine ? "bg-white/20" : "bg-muted")}>
          <div
            className={cn("h-full rounded-full transition-all", isMine ? "bg-white/70" : "bg-primary")}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={cn("text-[9px]", isMine ? "text-white/60" : "text-muted-foreground")}>
          {duration > 0 ? formatDur(playing ? (audioRef.current?.currentTime || 0) : duration) : "0:00"}
        </span>
      </div>
    </div>
  );
}
