import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CreateStoryDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const CreateStoryDialog = ({ open, onClose, onCreated }: CreateStoryDialogProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);

  const pulseMarkets = ["Crypto", "Forex", "Indices", "Futures", "Options", "Commodities"] as const;

  useEffect(() => {
    if (!open) {
      setFile(null);
      setCaption("");
      setUploading(false);
      setSelectedMarket(null);
    }
  }, [open]);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleSelect = (incoming: FileList | null) => {
    const next = incoming?.[0];
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      toast.error("Stories support images right now");
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      toast.error("Story image must be under 10MB");
      return;
    }
    setFile(next);
  };

  const handleCreate = async () => {
    if (!file) {
      toast.error("Add a story image first");
      return;
    }

    if (!selectedMarket) {
      toast.error("Select a market tag");
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/stories/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("post-images").getPublicUrl(path);
      const { error: insertError } = await supabase.from("stories" as any).insert({
        user_id: user.id,
        media_url: publicUrl.publicUrl,
        media_type: "image",
        caption: caption.trim() || selectedMarket,
      });
      if (insertError) throw insertError;

      toast.success("Story added");
      onClose();
      onCreated();
    } catch (error) {
      console.error(error);
      toast.error("Could not add story");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="overflow-hidden border-border bg-card p-0 sm:max-w-md">
        <div className="border-b border-border px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Pulse</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Share a live pulse</p>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="space-y-4 px-4 py-4">
          <button
            onClick={() => inputRef.current?.click()}
            className="flex aspect-[9/16] w-full items-center justify-center overflow-hidden rounded-[24px] border border-border bg-secondary"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Story preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Camera className="h-6 w-6" />
                <span className="text-xs font-medium">Choose image</span>
              </div>
            )}
          </button>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Market</p>
            <div className="flex flex-wrap gap-2">
              {pulseMarkets.map((market) => (
                <button
                  key={market}
                  onClick={() => setSelectedMarket(market)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all",
                    selectedMarket === market
                      ? "border-primary bg-primary/12 text-foreground shadow-[0_0_20px_hsl(var(--primary)/0.18)]"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {market}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value.slice(0, 180))}
            placeholder="Quick reaction, win, loss, or market note..."
            rows={3}
            className="w-full resize-none rounded-2xl border border-border bg-secondary px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Camera className="h-4 w-4 text-primary" />
              Change photo
            </button>
            <button
              onClick={handleCreate}
              disabled={uploading || !file || !selectedMarket}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.22)] disabled:opacity-40"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Share pulse"}
            </button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              handleSelect(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStoryDialog;