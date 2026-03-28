import { useState, useRef } from "react";
import { X, ImageIcon, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreatePostModal({ open, onClose, onCreated }: CreatePostModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Only images are supported");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Max file size is 10MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handlePost = async () => {
    if (!file) { toast.error("Add a photo first"); return; }
    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("post-images")
        .upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(filePath);

      const { error: insertErr } = await supabase.from("posts" as any).insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
        caption: caption.trim() || null,
      });
      if (insertErr) throw insertErr;

      toast.success("Posted!");
      setFile(null);
      setPreview(null);
      setCaption("");
      onCreated();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCaption("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={reset}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={reset} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm font-extrabold text-foreground">Create new post</span>
          <button
            onClick={handlePost}
            disabled={posting || !file}
            className="text-sm font-bold text-primary hover:text-primary/80 disabled:opacity-40"
          >
            {posting ? "Posting..." : "Share"}
          </button>
        </div>

        {/* Content */}
        {!preview ? (
          <div
            className={`flex flex-col items-center justify-center py-20 px-8 transition-colors ${
              dragOver ? "bg-primary/5" : ""
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ImageIcon className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">Drag photos here</p>
            <p className="text-xs text-muted-foreground mb-4">or</p>
            <button
              onClick={() => inputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground"
            >
              Select from computer
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        ) : (
          <div>
            {/* Image preview */}
            <div className="relative aspect-square bg-black flex items-center justify-center max-h-[400px] overflow-hidden">
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              <button
                onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Caption */}
            <div className="px-4 py-3">
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Write a caption..."
                maxLength={500}
                rows={3}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
              />
              <div className="text-right text-[10px] text-muted-foreground">{caption.length}/500</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
