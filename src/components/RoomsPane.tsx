import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type Room = {
  id: string;
  host_id: string;
  title: string;
  topic: string | null;
  market: string | null;
  is_active: boolean;
  created_at: string;
  last_activity_at?: string | null;
  host?: { username: string | null; avatar_url: string | null } | null;
};

const MARKETS = ["Forex", "Futures", "Options"];

export default function RoomsPane() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [market, setMarket] = useState("Forex");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
  }, []);

  const load = async () => {
    const { data: rows } = await supabase
      .from("voice_rooms")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50);
    const list = (rows ?? []) as Room[];
    if (list.length) {
      const ids = Array.from(new Set(list.map((r) => r.host_id)));
      const { data: profs } = await supabase.from("profiles").select("id,username,avatar_url").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      list.forEach((r) => (r.host = map.get(r.host_id) as any));
    }
    setRooms(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("voice_rooms-pane")
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_rooms" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const createRoom = async () => {
    if (!userId || !title.trim()) return;
    const { data, error } = await supabase
      .from("voice_rooms")
      .insert({ host_id: userId, title: title.trim(), topic: topic.trim() || null, market })
      .select("id")
      .single();
    if (error || !data) {
      toast.error("Couldn't create room");
      return;
    }
    setTitle("");
    setTopic("");
    setComposeOpen(false);
    navigate(`/rooms/${data.id}`);
  };

  return (
    <div className="space-y-3 px-4 py-3">
      <div className="rounded-2xl border border-border bg-card px-4 py-3 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">ROOMS</p>
        <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
          Drop in to co-work with other traders. Rooms auto-close after 30 minutes of silence.
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setComposeOpen((v) => !v)}
          className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> New room
        </button>
      </div>

      {composeOpen && (
        <div className="space-y-2 rounded-xl border border-border bg-card p-3">
          <div className="flex gap-2">
            {MARKETS.map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  market === m ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Room title (e.g. London session focus)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic (optional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex justify-end">
            <button
              onClick={createRoom}
              disabled={!title.trim()}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              Open room
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-xs text-muted-foreground">Loading…</p>
      ) : rooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Radio className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold text-foreground">No live rooms</p>
          <p className="mt-1 text-xs text-muted-foreground">Open one and other traders can join.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/rooms/${r.id}`)}
              className="block w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50"
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                <span className="font-semibold uppercase tracking-wide text-primary">Live</span>
                {r.market && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase">{r.market}</span>
                )}
                <span className="ml-auto">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
              </div>
              <h3 className="text-sm font-semibold text-foreground">{r.title}</h3>
              {r.topic && <p className="mt-0.5 text-xs text-muted-foreground">{r.topic}</p>}
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                {r.host?.avatar_url ? (
                  <img src={r.host.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-secondary" />
                )}
                <span>Hosted by @{r.host?.username ?? "user"}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}