import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Plus, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const SYSTEM_UID = "00000000-0000-0000-0000-000000000001";

type ThreadRow = {
  id: string;
  user_id: string;
  forum: string;
  title: string;
  content: string;
  likes_count: number;
  replies_count: number;
  created_at: string;
  author?: { username: string | null; avatar_url: string | null; full_name: string | null } | null;
  liked?: boolean;
};

type Reply = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: { username: string | null; avatar_url: string | null } | null;
};

const FORUM_OPTIONS = [
  { key: "all", label: "All" },
  { key: "forex", label: "FX" },
  { key: "futures", label: "Futures" },
  { key: "options", label: "Options" },
];

export default function Threads() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyDraft, setReplyDraft] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newForum, setNewForum] = useState("forex");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
  }, []);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("forum_posts").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("forum", filter);
    const { data: rows } = await q;
    const list = (rows ?? []) as ThreadRow[];
    if (list.length) {
      const ids = Array.from(new Set(list.map((r) => r.user_id)));
      const { data: profs } = await supabase.from("profiles").select("id,username,avatar_url,full_name").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      let likedSet = new Set<string>();
      if (userId) {
        const { data: likes } = await supabase
          .from("forum_post_likes")
          .select("post_id")
          .eq("user_id", userId)
          .in("post_id", list.map((r) => r.id));
        likedSet = new Set((likes ?? []).map((l: any) => l.post_id));
      }
      list.forEach((r) => {
        r.author = map.get(r.user_id) as any;
        r.liked = likedSet.has(r.id);
      });
    }
    setThreads(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, userId]);

  const openThread = async (id: string) => {
    setOpenId(id);
    const { data: rows } = await supabase
      .from("forum_replies")
      .select("*")
      .eq("post_id", id)
      .order("created_at", { ascending: true });
    const list = (rows ?? []) as Reply[];
    if (list.length) {
      const ids = Array.from(new Set(list.map((r) => r.user_id)));
      const { data: profs } = await supabase.from("profiles").select("id,username,avatar_url").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      list.forEach((r) => (r.author = map.get(r.user_id) as any));
    }
    setReplies(list);
  };

  const toggleLike = async (t: ThreadRow) => {
    if (!userId) return;
    if (t.liked) {
      await supabase.from("forum_post_likes").delete().eq("post_id", t.id).eq("user_id", userId);
      await supabase.from("forum_posts").update({ likes_count: Math.max(0, t.likes_count - 1) }).eq("id", t.id);
    } else {
      await supabase.from("forum_post_likes").insert({ post_id: t.id, user_id: userId });
      await supabase.from("forum_posts").update({ likes_count: t.likes_count + 1 }).eq("id", t.id);
    }
    setThreads((prev) =>
      prev.map((p) =>
        p.id === t.id ? { ...p, liked: !t.liked, likes_count: t.liked ? p.likes_count - 1 : p.likes_count + 1 } : p
      )
    );
  };

  const sendReply = async () => {
    if (!userId || !openId || !replyDraft.trim()) return;
    const content = replyDraft.trim();
    setReplyDraft("");
    const { data, error } = await supabase
      .from("forum_replies")
      .insert({ post_id: openId, user_id: userId, content })
      .select("*")
      .single();
    if (error) {
      toast.error("Couldn't post reply");
      return;
    }
    await supabase
      .from("forum_posts")
      .update({ replies_count: (threads.find((t) => t.id === openId)?.replies_count ?? 0) + 1 })
      .eq("id", openId);
    const { data: prof } = await supabase.from("profiles").select("id,username,avatar_url").eq("id", userId).single();
    setReplies((prev) => [...prev, { ...(data as any), author: prof as any }]);
    setThreads((prev) => prev.map((p) => (p.id === openId ? { ...p, replies_count: p.replies_count + 1 } : p)));
  };

  const createThread = async () => {
    if (!userId || !newTitle.trim() || !newContent.trim()) return;
    const { error } = await supabase.from("forum_posts").insert({
      user_id: userId,
      forum: newForum,
      title: newTitle.trim(),
      content: newContent.trim(),
    });
    if (error) {
      toast.error("Couldn't post thread");
      return;
    }
    setNewTitle("");
    setNewContent("");
    setComposeOpen(false);
    load();
  };

  const openThreadRow = threads.find((t) => t.id === openId);

  if (openId && openThreadRow) {
    return (
      <AppLayout>
        <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">
          <button
            onClick={() => { setOpenId(null); setReplies([]); }}
            className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to threads
          </button>
          <ThreadCard t={openThreadRow} onLike={() => toggleLike(openThreadRow)} expanded />

          <div className="mt-6 space-y-3">
            {replies.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Avatar url={r.author?.avatar_url} />
                  <span className="font-medium text-foreground">@{r.author?.username ?? "user"}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{r.content}</p>
              </div>
            ))}
            {replies.length === 0 && <p className="text-center text-xs text-muted-foreground">Be the first to reply.</p>}
          </div>

          <div className="sticky bottom-16 mt-4 flex items-center gap-2 rounded-full border border-border bg-card/95 p-1.5 backdrop-blur lg:bottom-4">
            <input
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendReply()}
              placeholder="Reply…"
              className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={sendReply}
              disabled={!replyDraft.trim()}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Threads</h1>
            <p className="text-xs text-muted-foreground">Weekly market outlooks and community discussion.</p>
          </div>
          <button
            onClick={() => setComposeOpen((v) => !v)}
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto">
          {FORUM_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => setFilter(o.key)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filter === o.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {composeOpen && (
          <div className="mb-4 space-y-2 rounded-xl border border-border bg-card p-3">
            <div className="flex gap-2">
              {FORUM_OPTIONS.filter((o) => o.key !== "all").map((o) => (
                <button
                  key={o.key}
                  onClick={() => setNewForum(o.key)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    newForum === o.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="What's on your mind?"
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="flex justify-end">
              <button
                onClick={createThread}
                disabled={!newTitle.trim() || !newContent.trim()}
                className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
              >
                Post
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-xs text-muted-foreground">Loading…</p>
        ) : threads.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground">No threads yet. Weekly outlooks post every Monday.</p>
        ) : (
          <div className="space-y-3">
            {threads.map((t) => (
              <ThreadCard key={t.id} t={t} onLike={() => toggleLike(t)} onOpen={() => openThread(t.id)} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function ThreadCard({ t, onLike, onOpen, expanded }: { t: ThreadRow; onLike: () => void; onOpen?: () => void; expanded?: boolean }) {
  const isSystem = t.user_id === SYSTEM_UID;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar url={t.author?.avatar_url} />
          <span className="font-medium text-foreground">
            {isSystem ? "TradersWorld" : `@${t.author?.username ?? "user"}`}
          </span>
          {isSystem && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
              Official
            </span>
          )}
          <span>·</span>
          <span>{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</span>
          <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase">{t.forum}</span>
        </div>
        <h3 className="text-sm font-semibold text-foreground">{t.title}</h3>
        <p className={`mt-1 whitespace-pre-wrap text-sm text-muted-foreground ${expanded ? "" : "line-clamp-3"}`}>{t.content}</p>
      </button>
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <button onClick={onLike} className={`flex items-center gap-1 ${t.liked ? "text-primary" : ""}`}>
          <Heart className={`h-3.5 w-3.5 ${t.liked ? "fill-current" : ""}`} />
          {t.likes_count}
        </button>
        <button onClick={onOpen} className="flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" />
          {t.replies_count}
        </button>
      </div>
    </div>
  );
}

function Avatar({ url }: { url: string | null | undefined }) {
  return url ? (
    <img src={url} alt="" className="h-5 w-5 rounded-full object-cover" />
  ) : (
    <div className="h-5 w-5 rounded-full bg-secondary" />
  );
}