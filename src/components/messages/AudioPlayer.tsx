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
    <div className="flex items-center gap-2.5 min-w-[210px] py-0.5 pr-1">
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
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
          isMine ? "bg-primary-foreground/20 hover:bg-primary-foreground/30" : "bg-primary/15 hover:bg-primary/25"
        )}
      >
        {playing ? (
          <Pause className={cn("w-4 h-4 fill-current", isMine ? "text-primary-foreground" : "text-primary")} />
        ) : (
          <Play className={cn("w-4 h-4 ml-0.5 fill-current", isMine ? "text-primary-foreground" : "text-primary")} />
        )}
      </button>
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <div className={cn("relative h-[3px] w-full rounded-full overflow-hidden", isMine ? "bg-primary-foreground/25" : "bg-foreground/15")}>
          <div
            className={cn("absolute inset-y-0 left-0 rounded-full transition-all", isMine ? "bg-primary-foreground" : "bg-primary")}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={cn("text-[10px] tabular-nums leading-none", isMine ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {formatDur(playing ? (audioRef.current?.currentTime || 0) : duration || 0)}
        </span>
      </div>
    </div>
  );
}
