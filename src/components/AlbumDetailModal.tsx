import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PhotoOption {
  id: string;
  thumb: string;
}

interface Props {
  albumId: string | null;
  onClose: () => void;
  onChanged: () => void;
  onOpenPost: (post: any) => void;
  myUserId: string | null;
  allPhotos: PhotoOption[];
}

interface AlbumRow {
  id: string;
  user_id: string;
  title: string;
  cover_post_id: string | null;
}

interface AlbumPostRow {
  post: any;
  position: number;
}

export default function AlbumDetailModal({ albumId, onClose, onChanged, onOpenPost, myUserId, allPhotos }: Props) {
  const [album, setAlbum] = useState<AlbumRow | null>(null);
  const [items, setItems] = useState<AlbumPostRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pendingAdds, setPendingAdds] = useState<Set<string>>(new Set());
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!albumId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: a } = await supabase.from("albums").select("*").eq("id", albumId).maybeSingle();
      const { data: links } = await supabase
        .from("album_posts")
        .select("post_id, position")
        .eq("album_id", albumId)
        .order("position", { ascending: true });
      const ids = (links || []).map((l: any) => l.post_id);
      const { data: posts } = ids.length
        ? await supabase.from("posts").select("*").in("id", ids)
        : { data: [] as any[] };
      const postMap = new Map((posts || []).map((p: any) => [p.id, p]));
      const rows: AlbumPostRow[] = (links || [])
        .map((l: any) => ({ post: postMap.get(l.post_id), position: l.position }))
        .filter((r) => r.post);
      if (!cancelled) {
        setAlbum(a as AlbumRow);
        setItems(rows);
        setTitleDraft((a as any)?.title || "");
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [albumId]);

  if (!albumId) return null;

  const isOwner = album && myUserId === album.user_id;
  const inAlbumIds = new Set(items.map((i) => i.post.id));
  const available = allPhotos.filter((p) => !inAlbumIds.has(p.id));

  const togglePending = (id: string) => {
    setPendingAdds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const commitAdd = async () => {
    if (!album || pendingAdds.size === 0) {
      setAdding(false);
      setPendingAdds(new Set());
      return;
    }
    const startPos = items.length;
    const rows = Array.from(pendingAdds).map((post_id, i) => ({
      album_id: album.id,
      post_id,
      user_id: album.user_id,
      position: startPos + i,
    }));
    const { error } = await supabase.from("album_posts").insert(rows);
    if (error) {
      toast.error("Couldn't add photos");
      return;
    }
    toast.success(rows.length === 1 ? "Photo added" : `${rows.length} photos added`);
    setAdding(false);
    setPendingAdds(new Set());
    // reload
    const { data: links } = await supabase.from("album_posts").select("post_id, position").eq("album_id", album.id).order("position", { ascending: true });
    const ids = (links || []).map((l: any) => l.post_id);
    const { data: posts } = ids.length ? await supabase.from("posts").select("*").in("id", ids) : { data: [] };
    const postMap = new Map((posts || []).map((p: any) => [p.id, p]));
    setItems((links || []).map((l: any) => ({ post: postMap.get(l.post_id), position: l.position })).filter((r) => r.post));
    onChanged();
  };

  const removeFromAlbum = async (postId: string) => {
    if (!album) return;
    const { error } = await supabase.from("album_posts").delete().eq("album_id", album.id).eq("post_id", postId);
    if (error) {
      toast.error("Couldn't remove");
      return;
    }
    setItems((prev) => prev.filter((i) => i.post.id !== postId));
    onChanged();
  };

  const saveTitle = async () => {
    if (!album) return;
    const t = titleDraft.trim();
    if (!t) {
      toast.error("Title can't be empty");
      return;
    }
    const { error } = await supabase.from("albums").update({ title: t }).eq("id", album.id);
    if (error) {
      toast.error("Couldn't save");
      return;
    }
    setAlbum({ ...album, title: t });
    setEditingTitle(false);
    onChanged();
  };

  const deleteAlbum = async () => {
    if (!album) return;
    const { error } = await supabase.from("albums").delete().eq("id", album.id);
    if (error) {
      toast.error("Couldn't delete");
      return;
    }
    toast.success("Album deleted");
    onChanged();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background" onClick={onClose}>
      <div className="mx-auto flex h-full w-full max-w-xl flex-col bg-background" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-secondary">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 px-3 text-center">
            {editingTitle && isOwner ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); }}
                maxLength={60}
                className="w-full rounded-md border border-border bg-secondary px-2 py-1 text-center text-sm font-semibold text-foreground outline-none"
              />
            ) : (
              <button
                disabled={!isOwner}
                onClick={() => setEditingTitle(true)}
                className="text-sm font-semibold text-foreground"
              >
                {album?.title || "Album"}
              </button>
            )}
            <p className="text-[11px] text-muted-foreground">{items.length} {items.length === 1 ? "photo" : "photos"}</p>
          </div>
          {isOwner ? (
            <button onClick={() => setConfirmDelete(true)} className="flex h-9 w-9 items-center justify-center rounded-full text-destructive hover:bg-secondary">
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <div className="h-9 w-9" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
              <p className="text-sm font-bold text-foreground">No photos in this album</p>
              {isOwner && <p className="mt-1 text-xs text-muted-foreground">Tap "Add photos" below.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[2px] p-[2px]">
              {items.map(({ post }) => {
                const media = post.media_urls?.[0] || post.media_url || post.image_url;
                return (
                  <div key={post.id} className="relative aspect-square overflow-hidden bg-secondary group">
                    <button onClick={() => onOpenPost(post)} className="block h-full w-full">
                      <img src={media} alt="" className="h-full w-full object-cover" />
                    </button>
                    {isOwner && (
                      <button
                        onClick={() => removeFromAlbum(post.id)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur"
                        aria-label="Remove from album"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isOwner && (
          <div className="border-t border-border px-4 py-3">
            <button
              onClick={() => setAdding(true)}
              disabled={available.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> Add photos
            </button>
            {available.length === 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">All your photos are already in this album.</p>
            )}
          </div>
        )}

        {adding && (
          <div className="absolute inset-0 z-10 flex items-end justify-center bg-background/80 backdrop-blur-md sm:items-center" onClick={() => { setAdding(false); setPendingAdds(new Set()); }}>
            <div className="w-full max-w-xl overflow-hidden rounded-t-[24px] border border-border bg-card sm:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <button onClick={() => { setAdding(false); setPendingAdds(new Set()); }} className="text-sm font-semibold text-muted-foreground">Cancel</button>
                <p className="text-sm font-semibold text-foreground">Add to album</p>
                <button onClick={commitAdd} disabled={pendingAdds.size === 0} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-40">Add ({pendingAdds.size})</button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {available.length === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-muted-foreground">No more photos to add.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {available.map((p) => {
                      const on = pendingAdds.has(p.id);
                      return (
                        <button key={p.id} onClick={() => togglePending(p.id)} className="relative aspect-square overflow-hidden rounded-md">
                          <img src={p.thumb} alt="" className="h-full w-full object-cover" />
                          {on && (
                            <div className="absolute inset-0 flex items-center justify-center bg-primary/40">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                {Array.from(pendingAdds).indexOf(p.id) + 1}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {confirmDelete && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 px-4 backdrop-blur-md" onClick={() => setConfirmDelete(false)}>
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-center" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-bold text-foreground">Delete this album?</p>
              <p className="mt-1 text-xs text-muted-foreground">Your photos stay on the grid. Only the album is removed.</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 rounded-full border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground">Cancel</button>
                <button onClick={deleteAlbum} className="flex-1 rounded-full bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
