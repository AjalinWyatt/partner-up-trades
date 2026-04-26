import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const MAX_PHOTOS = 10;

export default function CreatePhotoAlbumModal({ open, onClose, onCreated }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      previews.forEach((u) => URL.revokeObjectURL(u));
      setFiles([]);
      setPreviews([]);
      setCaption("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const addFiles = (incoming: FileList | null) => {
    if (!incoming?.length) return;
    const incomingArr = Array.from(incoming);
    if (incomingArr.some((f) => !f.type.startsWith("image/"))) {
      toast.error("Photos only");
      return;
    }
    if (incomingArr.some((f) => f.size > 10 * 1024 * 1024)) {
      toast.error("Each photo must be under 10MB");
      return;
    }
    const combined = [...files, ...incomingArr].slice(0, MAX_PHOTOS);
    previews.forEach((u) => URL.revokeObjectURL(u));
    setFiles(combined);
    setPreviews(combined.map((f) => URL.createObjectURL(f)));
  };

  const removeAt = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    const nextFiles = files.filter((_, i) => i !== index);
    const nextPreviews = previews.filter((_, i) => i !== index);
    setFiles(nextFiles);
    setPreviews(nextPreviews);
  };

  const submit = async () => {
    if (files.length === 0) {
      toast.error("Add at least one photo");
      return;
    }
    setPosting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");

      const mediaUrls: string[] = [];
      for (const [index, file] of files.entries()) {
        const ext = file.name.split(".").pop() || "jpg";
        const filePath = `${user.id}/${Date.now()}-${index}.${ext}`;
        const { error } = await supabase.storage.from("post-images").upload(filePath, file, { upsert: true, contentType: file.type });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(filePath);
        mediaUrls.push(urlData.publicUrl);
      }

      const trimmed = caption.trim();
      const { error: insertErr } = await supabase.from("posts").insert({
        user_id: user.id,
        content: trimmed || null,
        caption: trimmed || null,
        image_url: mediaUrls[0],
        media_url: mediaUrls[0],
        media_type: "image",
        media_urls: mediaUrls,
        market: null,
        tags: [],
        share_to_feed: false,
      } as any);
      if (insertErr) throw insertErr;

      toast.success(files.length > 1 ? "Album shared to your grid" : "Photo shared to your grid");
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
            <p className="text-sm font-semibold text-foreground">{files.length > 1 ? "New album" : "New photo"}</p>
          </div>
          <button
            onClick={submit}
            disabled={posting || files.length === 0}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-40"
          >
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share"}
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          {previews.length === 0 ? (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/40 py-16 text-muted-foreground transition-colors hover:bg-secondary/60"
            >
              <Camera className="h-8 w-8" />
              <span className="text-sm font-semibold">Add up to {MAX_PHOTOS} photos</span>
              <span className="text-[11px]">JPG, PNG, GIF · max 10MB each</span>
            </button>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-border bg-muted">
                <Carousel opts={{ loop: previews.length > 1 }}>
                  <CarouselContent className="ml-0">
                    {previews.map((preview, index) => (
                      <CarouselItem key={preview} className="pl-0">
                        <div className="relative">
                          <img src={preview} alt={`Photo ${index + 1}`} className="h-[340px] w-full object-cover" />
                          <button
                            onClick={() => removeAt(index)}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <div className="absolute bottom-2 right-2 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-bold text-foreground backdrop-blur">
                            {index + 1}/{previews.length}
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>

              {files.length < MAX_PHOTOS && (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Camera className="h-4 w-4 text-primary" /> Add more
                </button>
              )}

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
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
