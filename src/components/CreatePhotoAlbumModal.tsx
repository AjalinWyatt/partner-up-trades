import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreatePhotoAlbumModal({ open, onClose, onCreated }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      if (preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview(null);
      setCaption("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const pickFile = (incoming: FileList | null) => {
    const next = incoming?.[0];
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      toast.error("Photos only");
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      toast.error("Photo must be under 10MB");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  };

  const submit = async () => {
    if (!file) {
      toast.error("Add a photo");
      return;
    }
    setPosting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("post-images").upload(filePath, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(filePath);
      const url = urlData.publicUrl;

      const trimmed = caption.trim();
      const { error: insertErr } = await supabase.from("posts").insert({
        user_id: user.id,
        content: trimmed || null,
        caption: trimmed || null,
        image_url: url,
        media_url: url,
        media_type: "image",
        media_urls: [url],
        market: null,
        tags: [],
        share_to_feed: false,
      } as any);
      if (insertErr) throw insertErr;

      toast.success("Photo shared to your grid");
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md" onClick={onClose}>
      <div
        className="mt-6 w-full max-w-xl overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_30px_80px_hsl(var(--background)/0.65)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <button onClick={onClose} className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
            Cancel
          </button>
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Grid</p>
            <p className="text-sm font-semibold text-foreground">New photo</p>
          </div>
          <button
            onClick={submit}
            disabled={posting || !file}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-40"
          >
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share"}
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          {!preview ? (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/40 py-16 text-muted-foreground transition-colors hover:bg-secondary/60"
            >
              <Camera className="h-8 w-8" />
              <span className="text-sm font-semibold">Add a photo</span>
              <span className="text-[11px]">JPG, PNG, GIF · max 10MB each</span>
              <span className="text-[11px] text-muted-foreground/70">You can group photos into albums afterwards</span>
            </button>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-border bg-muted">
                <div className="relative">
                  <img src={preview} alt="Photo" className="h-[340px] w-full object-cover" />
                  <button
                    onClick={clearFile}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption... (optional)"
                rows={3}
                maxLength={500}
                className="w-full resize-none rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <div className="text-right text-[11px] text-muted-foreground">{caption.length}/500</div>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
