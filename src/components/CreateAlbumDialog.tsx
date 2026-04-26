import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PhotoOption {
  id: string;
  thumb: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  userId: string;
  photos: PhotoOption[];
}

export default function CreateAlbumDialog({ open, onClose, onCreated, userId, photos }: Props) {
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setSelected(new Set());
    }
  }, [open]);

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Give your album a title");
      return;
    }
    setSaving(true);
    try {
      const ids = Array.from(selected);
      const coverId = ids[0] || null;
      const { data: album, error } = await supabase
        .from("albums")
        .insert({ user_id: userId, title: trimmed, cover_post_id: coverId })
        .select()
        .single();
      if (error) throw error;

      if (ids.length > 0 && album) {
        const rows = ids.map((post_id, i) => ({
          album_id: album.id,
          post_id,
          user_id: userId,
          position: i,
        }));
        const { error: linkErr } = await supabase.from("album_posts").insert(rows);
        if (linkErr) throw linkErr;
      }

      toast.success("Album created");
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Couldn't create album");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md" onClick={onClose}>
      <div className="mt-6 w-full max-w-xl overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_30px_80px_hsl(var(--background)/0.65)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <button onClick={onClose} className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">Cancel</button>
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Grid</p>
            <p className="text-sm font-semibold text-foreground">New album</p>
          </div>
          <button onClick={submit} disabled={saving || !title.trim()} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-40">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Album title"
            maxLength={60}
            className="w-full rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Add photos ({selected.size})</p>
            {photos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-4 py-8 text-center text-xs text-muted-foreground">
                Post a photo first, then create an album.
              </div>
            ) : (
              <div className="grid max-h-[340px] grid-cols-3 gap-1 overflow-y-auto rounded-2xl border border-border bg-secondary/40 p-1">
                {photos.map((p) => {
                  const on = selected.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className="relative aspect-square overflow-hidden rounded-md"
                    >
                      <img src={p.thumb} alt="" className="h-full w-full object-cover" />
                      {on && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/40">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {Array.from(selected).indexOf(p.id) + 1}
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
    </div>
  );
}
