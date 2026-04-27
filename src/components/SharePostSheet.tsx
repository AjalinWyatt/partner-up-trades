import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getInitials } from "@/lib/matchUtils";
import { toast } from "sonner";
import { invalidateSessionCache } from "@/hooks/use-session-cache";

export interface SharePostInput {
  id: string;
  user_id: string;
  username?: string;
  content?: string | null;
  caption?: string | null;
  market?: string | null;
  media_url?: string | null;
  media_urls?: string[] | null;
  image_url?: string | null;
  media_type?: string | null;
}

interface ShareTarget {
  connectionId: string | null;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  type: "partner" | "dm";
}

interface Props {
  post: SharePostInput | null;
  myId: string | null;
  onClose: () => void;
}

const SharePostSheet = ({ post, myId, onClose }: Props) => {
  const [targets, setTargets] = useState<ShareTarget[]>([]);
  const [search, setSearch] = useState("");
  const [sendingToId, setSendingToId] = useState<string | null>(null);

  const loadTargets = useCallback(async () => {
    if (!myId) return;
    const [{ data: partnerRows }, { data: dmRows }] = await Promise.all([
      supabase.from("partner_connections").select("id, requester_id, receiver_id")
        .eq("status", "accepted").or(`requester_id.eq.${myId},receiver_id.eq.${myId}`),
      supabase.from("messages").select("connection_id, sender_id, receiver_id")
        .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
        .order("created_at", { ascending: false }).limit(200),
    ]);

    const map = new Map<string, ShareTarget>();
    (partnerRows || []).forEach((row: any) => {
      const partnerId = row.requester_id === myId ? row.receiver_id : row.requester_id;
      map.set(partnerId, { connectionId: row.id, userId: partnerId, username: "", fullName: "", avatarUrl: null, type: "partner" });
    });
    (dmRows || []).forEach((row: any) => {
      const otherId = row.sender_id === myId ? row.receiver_id : row.sender_id;
      if (!otherId || otherId === myId) return;
      const current = map.get(otherId);
      map.set(otherId, {
        connectionId: current?.connectionId || row.connection_id || null,
        userId: otherId,
        username: current?.username || "",
        fullName: current?.fullName || "",
        avatarUrl: current?.avatarUrl || null,
        type: current?.type || "dm",
      });
    });

    const ids = [...map.keys()];
    if (ids.length === 0) { setTargets([]); return; }
    const { data: profs } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", ids);
    const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
    setTargets(ids.map((id) => {
      const base = map.get(id)!;
      const p = profMap.get(id);
      return { ...base, username: p?.username ? `@${p.username}` : "@trader", fullName: p?.full_name || "Trader", avatarUrl: p?.avatar_url || null };
    }));
  }, [myId]);

  useEffect(() => {
    if (post) loadTargets();
  }, [post, loadTargets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter((t) => t.username.toLowerCase().includes(q) || t.fullName.toLowerCase().includes(q));
  }, [search, targets]);

  const sendTo = async (target: ShareTarget) => {
    if (!myId || !post) return;
    setSendingToId(target.userId);
    const preview = [post.content || post.caption, post.market ? `[${post.market}]` : null].filter(Boolean).join(" ").slice(0, 140);
    const messageText = `Shared a post${post.username ? ` from ${post.username}` : ""}${preview ? `\n${preview}` : ""}`;
    const { error } = await supabase.from("messages").insert({
      sender_id: myId,
      receiver_id: target.userId,
      connection_id: target.connectionId,
      content: messageText,
      media_url: post.media_urls?.[0] || post.media_url || post.image_url || null,
      media_type: post.media_type || (post.media_urls?.length || post.media_url || post.image_url ? "image" : null),
    } as any);
    setSendingToId(null);
    if (error) { toast.error("Could not send post"); return; }
    onClose();
    setSearch("");
    toast.success(`Sent to ${target.username}`);
  };

  return (
    <Dialog open={!!post} onOpenChange={(open) => { if (!open) { onClose(); setSearch(""); } }}>
      <DialogContent className="border-border bg-card p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-4 py-3 text-left">
          <DialogTitle className="text-sm font-bold text-foreground">Send post</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-4 py-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search partners or chats"
            className="h-9 rounded-xl border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground"
          />
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">No partners or DM chats yet.</p>
          ) : (
            <div className="max-h-[420px] space-y-1 overflow-y-auto">
              {filtered.map((target) => (
                <button
                  key={target.userId}
                  onClick={() => sendTo(target)}
                  disabled={sendingToId === target.userId}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-secondary">
                    {target.avatarUrl ? (
                      <img src={target.avatarUrl} alt={target.fullName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-black text-foreground">
                        {getInitials(target.fullName || target.username)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{target.username}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {target.type === "partner" ? "Partner" : "Direct message"}
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {sendingToId === target.userId ? "Sending..." : "Send"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SharePostSheet;
