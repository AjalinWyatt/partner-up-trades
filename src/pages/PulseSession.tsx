import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Mic, Square, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import AudioPlayer from "@/components/messages/AudioPlayer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LocalMessage = {
  id: string;
  mine: boolean;
  content?: string;
  audioUrl?: string;
  created_at: string;
};

/**
 * Pulse Session - async chat + voice notes.
 *
 * MVP scope (no live calling):
 *  - Text messages
 *  - Voice NOTES (recorded audio clips, not real-time audio)
 *  - No WebRTC / Daily / LiveKit / Twilio
 *
 * Persistence wiring (Supabase messages + storage) will be added in the next pass.
 * For now this renders a working local thread shell so the route is real.
 */
export default function PulseSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages]);

  const sendText = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), mine: true, content: text, created_at: new Date().toISOString() },
    ]);
    setDraft("");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        await uploadAndSend(blob, recorder.mimeType);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
    setRecording(false);
  };

  const uploadAndSend = async (blob: Blob, mimeType: string) => {
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id || "anon";
      const ext = mimeType.includes("webm") ? "webm" : "m4a";
      const path = `${uid}/pulse-${id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("audio-messages")
        .upload(path, blob, { contentType: mimeType });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("audio-messages").getPublicUrl(path);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          mine: true,
          audioUrl: urlData.publicUrl,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (e: any) {
      toast.error(e?.message || "Couldn't send voice note");
    } finally {
      setUploading(false);
    }
  };

  const formatElapsed = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <AppLayout>
      <div className="flex h-[100dvh] flex-col bg-background">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border bg-card/80 px-4 pb-3 pt-safe-3 backdrop-blur">
          <button
            onClick={() => navigate("/feed")}
            className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Leave Pulse session"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              Pulse Session
            </p>
            <p className="truncate text-[13px] font-semibold text-foreground">
              Chat + voice notes · async
            </p>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            Live
          </span>
        </div>

        {/* Thread */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-[13px] font-semibold text-foreground">
                You're connected.
              </p>
              <p className="mt-1 max-w-[260px] text-[11px] leading-5 text-muted-foreground">
                Send a message or hold the mic to record a voice note. This session is
                async - no live calling.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={cn("flex", m.mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3 py-1.5 text-[12px] leading-snug",
                      m.mine
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-secondary text-foreground"
                    )}
                  >
                    {m.audioUrl ? (
                      <AudioPlayer url={m.audioUrl} isMine={m.mine} />
                    ) : (
                      <p>{m.content}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-card/80 px-3 py-2 backdrop-blur">
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendText();
              }}
              placeholder="Message…"
              className="flex-1 rounded-full border border-border bg-secondary px-3 py-2 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary/60"
            />
            {uploading ? (
              <button
                disabled
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
              </button>
            ) : recording ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-destructive">
                  ● {formatElapsed(elapsed)}
                </span>
                <button
                  onClick={stopRecording}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                  aria-label="Stop recording"
                >
                  <Square className="h-4 w-4" />
                </button>
              </div>
            ) : draft.trim() ? (
              <button
                onClick={sendText}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
                aria-label="Record voice note"
              >
                <Mic className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
