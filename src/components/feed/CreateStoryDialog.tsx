import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  useEffect(() => {
    if (!open) {
      setFile(null);
      setCaption("");
      setUploading(false);
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
        caption: caption.trim() || null,
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
      <DialogContent className="border-border bg-card p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-4 py-3 text-left">
          <DialogTitle className="text-sm font-bold text-foreground">Add story</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-4 py-4">
          <button
            onClick={() => inputRef.current?.click()}
            className="flex aspect-[9/16] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary"
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

          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value.slice(0, 180))}
            placeholder="Say something"
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />

          <div className="flex items-center justify-between gap-3">
            <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={handleCreate}
              disabled={uploading || !file}
              className="rounded-full bg-gradient-to-r from-primary to-success px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Share story"}
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