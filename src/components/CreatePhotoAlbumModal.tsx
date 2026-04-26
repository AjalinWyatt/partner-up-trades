import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const MAX_VIDEO_SECONDS = 60;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export default function CreatePhotoAlbumModal({ open, onClose, onCreated }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [kind, setKind] = useState<"image" | "video" | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      if (preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview("");
      setKind(null);
      setCaption("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const addFile = async (incoming: FileList | null) => {
    if (!incoming?.length) return;
    const f = incoming[0];
    const isImage = f.type.startsWith("image/");
    const isVideo = f.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Upload a photo or video");
      return;
    }
    if (isImage && f.size > MAX_IMAGE_BYTES) {
      toast.error("Photo must be under 10MB");
      return;
    }
    if (isVideo && f.size > MAX_VIDEO_BYTES) {
      toast.error("Video must be under 100MB");
      return;
    }
    if (isVideo) {
      const ok = await new Promise<boolean>((resolve) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => {
          URL.revokeObjectURL(v.src);
          resolve(v.duration <= MAX_VIDEO_SECONDS + 0.5);
        };
        v.onerror = () => resolve(false);
        v.src = URL.createObjectURL(f);
      });
      if (!ok) {
        toast.error("Video must be 60 seconds or less");
        return;
      }
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setKind(isVideo ? "video" : "image");
  };

  const removeFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setKind(null);
  };

  const submit = async () => {
    if (!file) {
      toast.error("Add a photo or video");
      return;
    }
    setPosting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg");
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("post-images").upload(filePath, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(filePath);
      const mediaUrl = urlData.publicUrl;

      const trimmed = caption.trim();
      const { error: insertErr } = await supabase.from("posts").insert({
        user_id: user.id,
        content: trimmed || null,
        caption: trimmed || null,
        image_url: kind === "image" ? mediaUrl : null,
        media_url: mediaUrl,
        media_type: kind === "video" ? "video" : "image",
        media_urls: [mediaUrl],
        market: null,
        tags: [],
        share_to_feed: false,
      } as any);
      if (insertErr) throw insertErr;

      toast.success(kind === "video" ? "Video shared to your grid" : "Photo shared to your grid");
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
            <p className="text-sm font-semibold text-foreground">{kind === "video" ? "New video" : "New photo"}</p>
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
              <span className="text-sm font-semibold">Add 1 photo or 1 video</span>
              <span className="text-[11px]">Photo: JPG/PNG/GIF · 10MB · Video: up to 60s</span>
            </button>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-border bg-muted">
                <div className="relative">
                  {kind === "video" ? (
                    <video src={preview} controls className="h-[340px] w-full object-cover" />
                  ) : (
                    <img src={preview} alt="Selected" className="h-[340px] w-full object-cover" />
                  )}
                  <button
                    onClick={removeFile}
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
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            addFile(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
