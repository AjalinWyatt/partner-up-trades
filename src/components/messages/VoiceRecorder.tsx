import { useState, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        await uploadAndSend(blob, recorder.mimeType);
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
      <button className="p-1.5 rounded-full text-muted-foreground" disabled>
        <Loader2 className="w-5 h-5 animate-spin" />
      </button>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-destructive font-medium animate-pulse">● {formatElapsed(elapsed)}</span>
        <button onClick={stopRecording} className="p-1.5 rounded-full bg-destructive/10 hover:bg-destructive/20 text-destructive">
          <Square className="w-4 h-4" />
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
