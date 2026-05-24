import { useState, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { claimPlayback, releasePlayback } from "@/lib/audioCoordinator";
import { useSignedMediaUrl } from "@/hooks/use-signed-media-url";

interface AudioPlayerProps {
  url: string;
  isMine: boolean;
}

export default function AudioPlayer({ url, isMine }: AudioPlayerProps) {
  const signedUrl = useSignedMediaUrl(url);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      claimPlayback(audioRef.current);
      audioRef.current.play().catch(() => setPlaying(false));
    }
  };

  const formatDur = (s: number) => {
    if (!Number.isFinite(s) || s <= 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const syncDuration = () => {
    const a = audioRef.current;
    if (!a) return;
    if (Number.isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
  };

  const fixInfiniteDuration = () => {
    const a = audioRef.current;
    if (!a || a.dataset.fixingDuration === "true") return;
    if (a.duration === Infinity || Number.isNaN(a.duration)) {
      a.dataset.fixingDuration = "true";
      const restore = () => {
        a.currentTime = 0;
        a.dataset.fixingDuration = "false";
        syncDuration();
        a.removeEventListener("timeupdate", restore);
      };
      a.addEventListener("timeupdate", restore);
      a.currentTime = 1e7;
    }
  };

  return (
    <div className="flex w-[min(210px,58vw)] max-w-full min-w-0 items-center gap-2.5 py-0.5 pr-1">
      <audio
        ref={audioRef}
        src={signedUrl || url}
        preload="metadata"
        playsInline
        onLoadedMetadata={() => { syncDuration(); fixInfiniteDuration(); }}
        onDurationChange={syncDuration}
        onPlay={() => { if (audioRef.current) claimPlayback(audioRef.current); setPlaying(true); }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a && Number.isFinite(a.duration) && a.duration > 0) {
            setProgress(Math.min(100, (a.currentTime / a.duration) * 100));
          }
        }}
        onEnded={() => { if (audioRef.current) releasePlayback(audioRef.current); setPlaying(false); setProgress(0); }}
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
