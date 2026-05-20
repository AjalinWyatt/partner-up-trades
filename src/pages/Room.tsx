import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Mic, Square, Loader2, Users, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import AudioPlayer from "@/components/messages/AudioPlayer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Msg = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  author?: { username: string | null; avatar_url: string | null } | null;
};

type Room = {
  id: string;
  host_id: string;
  title: string;
  topic: string | null;
  market: string | null;
  is_active: boolean;
};

export default function Room() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [present, setPresent] = useState<Array<{ id: string; username: string; avatar_url: string | null }>>([]);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: prof } = await supabase.from("profiles").select("username,avatar_url").eq("id", uid).single();
        setUsername(prof?.username ?? "user");
      }
    })();
  }, []);

  useEffect(() => {
    if (!id) return;
    supabase.from("voice_rooms").select("*").eq("id", id).single().then(({ data }) => setRoom(data as any));
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadMessages = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("voice_room_messages")
      .select("*")
      .eq("room_id", id)
      .order("created_at", { ascending: true })
      .limit(200);
    const list = (data ?? []) as Msg[];
    if (list.length) {
      const ids = Array.from(new Set(list.map((m) => m.sender_id)));
      const { data: profs } = await supabase.from("profiles").select("id,username,avatar_url").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      list.forEach((m) => (m.author = map.get(m.sender_id) as any));
    }
    setMessages(list);
  };

  // Realtime messages + presence
  useEffect(() => {
    if (!id || !userId || !username) return;
    const ch = supabase
      .channel(`room-${id}`, { config: { presence: { key: userId } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "voice_room_messages", filter: `room_id=eq.${id}` }, async (payload) => {
        const m = payload.new as Msg;
        const { data: prof } = await supabase.from("profiles").select("id,username,avatar_url").eq("id", m.sender_id).single();
        m.author = prof as any;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      })
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState() as Record<string, Array<{ username: string; avatar_url: string | null; id: string }>>;
        const flat: Array<{ id: string; username: string; avatar_url: string | null }> = [];
        const seen = new Set<string>();
        Object.values(state).forEach((arr) => arr.forEach((p) => { if (!seen.has(p.id)) { seen.add(p.id); flat.push(p); } }));
        setPresent(flat);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ id: userId, username, avatar_url: null });
        }
      });
    return () => { supabase.removeChannel(ch); };
  }, [id, userId, username]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [messages]);

  const sendText = async () => {
    const text = draft.trim();
    if (!text || !userId || !id) return;
    setDraft("");
    const { error } = await supabase.from("voice_room_messages").insert({ room_id: id, sender_id: userId, content: text });
    if (error) toast.error("Couldn't send");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
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
    if (!userId || !id) return;
    setUploading(true);
    try {
      const ext = mimeType.includes("webm") ? "webm" : "m4a";
      const path = `${userId}/room-${id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("audio-messages").upload(path, blob, { contentType: mimeType });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("audio-messages").getPublicUrl(path);
      await supabase.from("voice_room_messages").insert({
        room_id: id,
        sender_id: userId,
        content: "🎤 Voice note",
        media_url: urlData.publicUrl,
        media_type: "audio/" + ext,
      });
    } catch (e: any) {
      toast.error(e?.message || "Couldn't send voice note");
    } finally {
      setUploading(false);
    }
  };

  const closeRoom = async () => {
    if (!room || !userId || room.host_id !== userId) return;
    await supabase.from("voice_rooms").update({ is_active: false }).eq("id", room.id);
    navigate("/rooms");
  };

  const formatElapsed = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <AppLayout lockHeight hideBottomNav>
      <div className="flex h-[100dvh] flex-col bg-background">
        <div className="flex items-center gap-3 border-b border-border bg-card/80 px-4 pb-3 pt-safe-3 backdrop-blur">
          <button
            onClick={() => navigate("/rooms")}
            className="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Leave room"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              {room?.market ?? "Voice Room"}
            </p>
            <p className="truncate text-[13px] font-semibold text-foreground">{room?.title ?? "Loading…"}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {present.length}
          </div>
          {room && userId === room.host_id && (
            <button
              onClick={closeRoom}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
              aria-label="Close room"
              title="End room"
            >
              <Power className="h-4 w-4" />
            </button>
          )}
        </div>

        {present.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-b border-border bg-card/40 px-4 py-2">
            {present.map((p) => (
              <div key={p.id} className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                @{p.username}
              </div>
            ))}
          </div>
        )}

        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-[13px] font-semibold text-foreground">Room is live.</p>
              <p className="mt-1 max-w-[280px] text-[11px] leading-5 text-muted-foreground">
                Drop a voice note or message to break the ice.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {messages.map((m) => {
                const mine = m.sender_id === userId;
                return (
                  <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cn("flex max-w-[80%] gap-2", mine ? "flex-row-reverse" : "flex-row")}>
                      {!mine && (
                        m.author?.avatar_url ? (
                          <img src={m.author.avatar_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className="h-6 w-6 shrink-0 rounded-full bg-secondary" />
                        )
                      )}
                      <div>
                        {!mine && (
                          <p className="mb-0.5 text-[10px] font-semibold text-muted-foreground">@{m.author?.username ?? "user"}</p>
                        )}
                        <div className={cn(
                          "rounded-2xl px-3 py-1.5 text-[12px] leading-snug",
                          mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-secondary text-foreground"
                        )}>
                          {m.media_url ? <AudioPlayer url={m.media_url} isMine={mine} /> : <p>{m.content}</p>}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

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
                <button onClick={stopRecording} className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive" aria-label="Stop recording">
                  <Square className="h-4 w-4" />
                </button>
              </div>
            ) : draft.trim() ? (
              <button onClick={sendText} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label="Send">
                <Send className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={startRecording} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label="Record">
                <Mic className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}