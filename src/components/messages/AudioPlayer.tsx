import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { claimPlayback, releasePlayback } from "@/lib/audioCoordinator";

interface AudioPlayerProps {
  url: string;
  isMine: boolean;
}

export default function AudioPlayer({ url, isMine }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  // null until we successfully read a real, finite duration. Prevents the
  // "Infinity:NaN" label that appears with webm/opus blobs whose container
  // doesn't include a duration.
  const [duration, setDuration] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Pause this player if some OTHER audio claims playback.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    return () => releasePlayback(a);
  }, []);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      return;
    }
    // Stop any other audio currently playing in the app.
    claimPlayback(a);
    try {
      await a.play();
    } catch {
      // iOS will reject if not user-gesture / not unlocked. State stays paused.
    }
  };

  /**
   * webm/opus blobs from MediaRecorder report `duration === Infinity` because
   * the container has no duration in the header. The well-known fix is to
   * seek past the end, which forces the browser to compute the real value
   * and fire `durationchange` with a finite number.
   */
  const handleLoadedMetadata = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.duration === Infinity || Number.isNaN(a.duration)) {
      const onSeeked = () => {
        a.currentTime = 0;
        a.removeEventListener("seeked", onSeeked);
      };
      a.addEventListener("seeked", onSeeked);
      try {
        a.currentTime = 1e7; // arbitrary huge value
      } catch {
        /* ignore */
      }
    } else {
      setDuration(a.duration);
    }
  };

  const handleDurationChange = () => {
    const a = audioRef.current;
    if (!a) return;
    if (Number.isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
  };

  const formatDur = (s: number) => {
    if (!Number.isFinite(s) || s <= 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex w-[min(210px,58vw)] max-w-full min-w-0 items-center gap-2.5 py-0.5 pr-1">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        playsInline
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleDurationChange}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a && Number.isFinite(a.duration) && a.duration > 0) {
            setProgress((a.currentTime / a.duration) * 100);
          }
        }}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          if (audioRef.current) releasePlayback(audioRef.current);
        }}
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
          {formatDur(playing ? (audioRef.current?.currentTime || 0) : (duration ?? 0))}
        </span>
      </div>
    </div>
  );
}
