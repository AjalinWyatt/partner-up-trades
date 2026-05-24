import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Mic, Square, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import AudioPlayer from "@/components/messages/AudioPlayer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PulseRequest = {
  id: string;
  requester_id: string;
  accepted_by: string | null;
  status: "open" | "accepted" | "cancelled" | "expired";
  context: string[];
  note: string | null;
  created_at: string;
};

type Partner = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type PulseMessage = {
  id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
};

export default function PulseSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [myId, setMyId] = useState<string | null>(null);
  const [request, setRequest] = useState<PulseRequest | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [messages, setMessages] = useState<PulseMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Load auth + request + partner
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || null;
      if (cancelled) return;
      setMyId(uid);
      if (!uid) { setLoading(false); return; }

      const { data: req, error } = await supabase
        .from("pulse_requests" as any)
        .select("id, requester_id, accepted_by, status, context, note, created_at")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !req) { setLoading(false); return; }
      const r = req as unknown as PulseRequest;
      setRequest(r);

      if (r.status === "accepted" && r.accepted_by) {
        const partnerId = uid === r.requester_id ? r.accepted_by : r.requester_id;
        const { data: p } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .eq("id", partnerId)
          .maybeSingle();
        if (!cancelled) setPartner((p as Partner) || null);

        const { data: msgs } = await supabase
          .from("pulse_messages" as any)
          .select("id, sender_id, content, media_url, media_type, created_at")
          .eq("session_id", id)
          .order("created_at", { ascending: true });
        if (!cancelled) setMessages(((msgs as any[]) || []) as PulseMessage[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Realtime subscriptions: request status changes + new messages
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`pulse-session-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pulse_requests", filter: `id=eq.${id}` },
        async (payload) => {
          const r = payload.new as unknown as PulseRequest;
          setRequest(r);
          if (r.status === "accepted" && r.accepted_by && myId) {
            const partnerId = myId === r.requester_id ? r.accepted_by : r.requester_id;
            if (!partner || partner.id !== partnerId) {
              const { data: p } = await supabase
                .from("profiles")
                .select("id, username, full_name, avatar_url")
                .eq("id", partnerId)
                .maybeSingle();
              setPartner((p as Partner) || null);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pulse_messages", filter: `session_id=eq.${id}` },
        (payload) => {
          const m = payload.new as unknown as PulseMessage;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, myId, partner]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages]);

  const isRequester = !!(myId && request && myId === request.requester_id);
  const accepted = request?.status === "accepted";

  const sendText = async () => {
    const text = draft.trim();
    if (!text || !id || !myId || !accepted) return;
    setDraft("");
    const tempId = crypto.randomUUID();
    const optimistic: PulseMessage = {
      id: tempId, sender_id: myId, content: text, media_url: null, media_type: null,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    const { data, error } = await supabase
      .from("pulse_messages" as any)
      .insert({ session_id: id, sender_id: myId, content: text })
      .select("id, sender_id, content, media_url, media_type, created_at")
      .single();
    if (error || !data) {
      setMessages((m) => m.filter((x) => x.id !== tempId));
      toast.error("Couldn't send. Try again.");
      return;
    }
    setMessages((m) => m.map((x) => (x.id === tempId ? (data as any as PulseMessage) : x)));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
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
    if (!id || !myId || !accepted) return;
    setUploading(true);
    try {
      const ext = mimeType.includes("webm") ? "webm" : "m4a";
      const path = `${myId}/pulse-${id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("audio-messages")
        .upload(path, blob, { contentType: mimeType });
      if (upErr) throw upErr;
      const { data, error } = await supabase
        .from("pulse_messages" as any)
        .insert({
          session_id: id, sender_id: myId,
          content: "🎤 Voice note", media_url: `audio-messages/${path}`, media_type: `audio/${ext}`,
        })
        .select("id, sender_id, content, media_url, media_type, created_at")
        .single();
      if (error || !data) throw error;
      setMessages((m) => (m.some((x) => x.id === (data as any).id) ? m : [...m, data as any as PulseMessage]));
    } catch (e: any) {
      toast.error(e?.message || "Couldn't send voice note");
    } finally {
      setUploading(false);
    }
  };

  const cancelRequest = useCallback(async () => {
    if (!id || !isRequester) return;
    await supabase
      .from("pulse_requests" as any)
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("status", "open");
    navigate("/feed");
  }, [id, isRequester, navigate]);

  const formatElapsed = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const partnerLabel = partner?.username
    ? `@${partner.username}`
    : partner?.full_name || "Partner";

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
              {accepted ? partnerLabel : isRequester ? "Waiting for a trader…" : "Loading…"}
            </p>
          </div>
          {accepted ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Live
            </span>
          ) : isRequester && request?.status === "open" ? (
            <button
              onClick={cancelRequest}
              className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          ) : null}
        </div>

        {/* Body */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !request ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-[13px] font-semibold text-foreground">Pulse not found</p>
              <p className="mt-1 text-[11px] text-muted-foreground">It may have expired or been cancelled.</p>
            </div>
          ) : !accepted ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              {request.status === "open" && isRequester ? (
                <>
                  <div className="relative">
                    <span className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse-dot" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  </div>
                  <p className="mt-4 text-[13px] font-semibold text-foreground">Pulse sent</p>
                  <p className="mt-1 max-w-[260px] text-[11px] leading-5 text-muted-foreground">
                    Waiting for the first available trader to answer. You'll be connected privately.
                  </p>
                  {request.context.length > 0 && (
                    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                      {request.context.map((c) => (
                        <span key={c} className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-foreground">{c}</span>
                      ))}
                    </div>
                  )}
                </>
              ) : request.status === "cancelled" ? (
                <p className="text-[13px] font-semibold text-foreground">This Pulse was cancelled.</p>
              ) : request.status === "expired" ? (
                <p className="text-[13px] font-semibold text-foreground">This Pulse expired before anyone answered.</p>
              ) : (
                <p className="text-[13px] font-semibold text-foreground">This Pulse has already been answered.</p>
              )}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-[13px] font-semibold text-foreground">You're connected.</p>
              <p className="mt-1 max-w-[260px] text-[11px] leading-5 text-muted-foreground">
                Send a message or hold the mic to record a voice note.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {messages.map((m) => {
                const mine = m.sender_id === myId;
                return (
                  <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-3 py-1.5 text-[12px] leading-snug",
                        mine
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-secondary text-foreground"
                      )}
                    >
                      {m.media_url ? (
                        <AudioPlayer url={m.media_url} isMine={mine} />
                      ) : (
                        <p>{m.content}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Composer (only when accepted) */}
        {accepted && (
          <div className="border-t border-border bg-card/80 px-3 py-2 backdrop-blur">
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendText(); }}
                placeholder="Message…"
                className="flex-1 rounded-full border border-border bg-secondary px-3 py-2 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary/60"
              />
              {uploading ? (
                <button disabled className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </button>
              ) : recording ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-destructive">● {formatElapsed(elapsed)}</span>
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
        )}
      </div>
    </AppLayout>
  );
}