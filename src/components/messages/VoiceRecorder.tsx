import { useState, useRef, useEffect } from "react";
import { Mic, Loader2, Trash2, Send, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VoiceRecorderProps {
  userId: string;
  connectionId: string;
  partnerId: string;
  onSent: () => void;
}

export default function VoiceRecorder({ userId, connectionId, partnerId, onSent }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [preview, setPreview] = useState<{ blob: Blob; mimeType: string; url: string; duration: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playPos, setPlayPos] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        const url = URL.createObjectURL(blob);
        setPreview({ blob, mimeType: recorder.mimeType, url, duration: elapsed });
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    } catch {
      console.error("Mic access denied");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
    setRecording(false);
  };

  const cancelPreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setPlaying(false);
    setPlayPos(0);
    audioRef.current?.pause();
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const sendPreview = async () => {
    if (!preview) return;
    await uploadAndSend(preview.blob, preview.mimeType);
    URL.revokeObjectURL(preview.url);
    setPreview(null);
    setPlaying(false);
    setPlayPos(0);
  };

  const uploadAndSend = async (blob: Blob, mimeType: string) => {
    setUploading(true);
    const ext = mimeType.includes("webm") ? "webm" : "m4a";
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("audio-messages").upload(path, blob, { contentType: mimeType });
    if (upErr) { console.error(upErr); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("audio-messages").getPublicUrl(path);

    await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: partnerId,
      connection_id: connectionId,
      content: "🎤 Voice message",
      media_url: urlData.publicUrl,
      media_type: "audio/" + ext,
    } as any);
    setUploading(false);
    onSent();
  };

  const formatElapsed = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  if (uploading) {
    return (
      <div className="absolute inset-0 flex items-center justify-end pr-3 rounded-full bg-secondary">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (preview) {
    const pct = preview.duration > 0 ? Math.min(100, (playPos / preview.duration) * 100) : 0;
    return (
      <div className="absolute inset-0 flex items-center gap-2 rounded-full bg-secondary pl-2 pr-1.5">
        <audio
          ref={audioRef}
          src={preview.url}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setPlayPos(0); }}
          onTimeUpdate={(e) => setPlayPos((e.target as HTMLAudioElement).currentTime)}
          className="hidden"
        />
        <button
          onClick={cancelPreview}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Discard"
          aria-label="Discard recording"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={togglePlay}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background/60 hover:bg-background text-foreground transition-colors"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-foreground/15 overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground shrink-0">
            {formatElapsed(playing || playPos > 0 ? Math.round(playPos) : preview.duration)}
          </span>
        </div>
        <button
          onClick={sendPreview}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary hover:opacity-90 transition-opacity"
          aria-label="Send voice message"
        >
          <Send className="w-5 h-5 text-primary-foreground" />
        </button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="absolute inset-0 flex items-center gap-2 rounded-full bg-secondary pl-3 pr-1.5">
        <button
          onClick={() => { if (timerRef.current) clearInterval(timerRef.current); recorderRef.current?.stop(); setRecording(false); chunksRef.current = []; }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Cancel"
          aria-label="Cancel recording"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inset-0 rounded-full bg-destructive/60 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
          </span>
          <div className="flex-1 flex items-center gap-[3px] h-5 overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <span
                key={i}
                className="w-0.5 rounded-full bg-foreground/40 animate-pulse"
                style={{
                  height: `${30 + ((i * 37 + elapsed * 13) % 70)}%`,
                  animationDelay: `${i * 60}ms`,
                  animationDuration: "900ms",
                }}
              />
            ))}
          </div>
          <span className="text-xs tabular-nums font-medium text-foreground/80 shrink-0">{formatElapsed(elapsed)}</span>
        </div>
        <button
          onClick={stopRecording}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary hover:opacity-90 transition-opacity"
          title="Stop"
          aria-label="Stop recording"
        >
          <span className="block h-3.5 w-3.5 rounded-sm bg-primary-foreground" />
        </button>
      </div>
    );
  }

  return (
    <button onClick={startRecording} className="p-1.5 rounded-full hover:bg-background/50 transition-colors text-muted-foreground hover:text-foreground" title="Voice note">
      <Mic className="w-5 h-5" />
    </button>
  );
}
