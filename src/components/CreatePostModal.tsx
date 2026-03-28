import { useState, useRef, useEffect } from "react";
import { X, ImageIcon, Video, Loader2 } from "lucide-react";
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
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [userName, setUserName] = useState("");
  const [userMarket, setUserMarket] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: prof }, { data: tp }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase.from("trading_profiles").select("markets").eq("user_id", user.id).maybeSingle(),
      ]);
      setUserName(prof?.username || "trader");
      setUserMarket(tp?.markets?.[0] || "");
    };
    load();
    setTimeout(() => textRef.current?.focus(), 100);
  }, [open]);

  if (!open) return null;

  const handleFile = (f: File) => {
    if (f.type.startsWith("image/")) {
      if (f.size > 10 * 1024 * 1024) { toast.error("Max image size is 10MB"); return; }
      setMediaType("image");
    } else if (f.type.startsWith("video/")) {
      if (f.size > 50 * 1024 * 1024) { toast.error("Max video size is 50MB"); return; }
      setMediaType("video");
    } else {
      toast.error("Only images and videos are supported");
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
    if (!content.trim() && !file) { toast.error("Write something or add media"); return; }
    setPosting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let mediaUrl: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop() || (mediaType === "video" ? "mp4" : "jpg");
        const filePath = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("post-images")
          .upload(filePath, file, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(filePath);
        mediaUrl = urlData.publicUrl;
      }

      const insertData: any = {
        user_id: user.id,
        content: content.trim() || null,
        image_url: mediaType === "image" ? mediaUrl : null,
        media_url: mediaUrl,
        media_type: mediaType,
        caption: content.trim() || null,
      };

      const { error: insertErr } = await supabase.from("posts").insert(insertData);
      if (insertErr) throw insertErr;

      toast.success("Posted!");
      reset();
      onCreated();
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
    setMediaType(null);
    setContent("");
    onClose();
  };

  const canPost = content.trim() || file;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[env(safe-area-inset-top)]" onClick={reset}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-lg mx-4 mt-16 overflow-hidden"
        onClick={e => e.stopPropagation()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={reset} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm font-extrabold text-foreground">Create post</span>
          <button
            onClick={handlePost}
            disabled={posting || !canPost}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-primary to-success text-xs font-bold text-primary-foreground disabled:opacity-40"
          >
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Post"}
          </button>
        </div>

        {/* Market tag */}
        {userMarket && (
          <div className="px-4 pt-3 flex items-center gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{userMarket}</span>
          </div>
        )}

        {/* Text input */}
        <div className="px-4 py-3">
          <textarea
            ref={textRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`What's on your mind, ${userName}?`}
            maxLength={1000}
            rows={4}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none leading-relaxed"
          />
          <div className="text-right text-[10px] text-muted-foreground">{content.length}/1000</div>
        </div>

        {/* Media preview */}
        {preview && (
          <div className="relative mx-4 mb-3 rounded-xl overflow-hidden bg-muted">
            {mediaType === "image" ? (
              <img src={preview} alt="Preview" className="w-full max-h-[300px] object-cover" />
            ) : (
              <video src={preview} controls className="w-full max-h-[300px]" />
            )}
            <button
              onClick={() => { setFile(null); setPreview(null); setMediaType(null); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Media buttons */}
        <div className={`flex items-center gap-2 px-4 py-3 border-t border-border ${dragOver ? "bg-primary/5" : ""}`}>
          <button
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.accept = "image/*";
                inputRef.current.click();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-muted transition-colors text-xs font-semibold text-foreground"
          >
            <ImageIcon className="w-4 h-4 text-primary" /> Photo
          </button>
          <button
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.accept = "video/*";
                inputRef.current.click();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-muted transition-colors text-xs font-semibold text-foreground"
          >
            <Video className="w-4 h-4 text-accent-foreground" /> Video
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
