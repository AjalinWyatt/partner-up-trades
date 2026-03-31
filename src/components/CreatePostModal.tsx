import { useState, useRef, useEffect } from "react";
import { X, ImageIcon, Video, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [userMarkets, setUserMarkets] = useState<string[]>([]);
  const [selectedMarket, setSelectedMarket] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      const [{ data: prof }, { data: tp }] = await Promise.all([
        supabase.from("profiles").select("full_name, username").eq("id", user.id).single(),
        supabase.from("trading_profiles").select("markets").eq("user_id", user.id).maybeSingle(),
      ]);
      setUserName(prof?.username || "trader");
      const markets = tp?.markets || [];
      setUserMarkets(markets);
      setSelectedMarket(markets[0] || "");
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
    if (!file) { toast.error("Add a photo or video to post"); return; }
    if (!selectedMarket) { toast.error("Select a market tag"); return; }
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
        market: selectedMarket,
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
    setSelectedMarket("");
    onClose();
  };

  const canPost = !!file && !!selectedMarket;

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

        {/* Market tag selector */}
        <div className="px-4 pt-3 flex items-center gap-1.5 flex-wrap">
          {userMarkets.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMarket(m)}
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-full font-bold transition-colors",
                selectedMarket === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              )}
            >
              {m}
            </button>
          ))}
          {userMarkets.length === 0 && (
            <span className="text-[10px] text-muted-foreground">No markets selected in your profile</span>
          )}
        </div>

        {/* Media preview - shown prominently first */}
        {!preview && (
          <div className={`flex flex-col items-center justify-center py-10 mx-4 mt-3 rounded-xl border-2 border-dashed ${dragOver ? "border-primary bg-primary/5" : "border-border"}`}>
            <ImageIcon className="w-10 h-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-semibold text-foreground mb-1">Add a photo or video</p>
            <p className="text-[11px] text-muted-foreground">Required to post</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { if (inputRef.current) { inputRef.current.accept = "image/*"; inputRef.current.click(); } }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-xs font-bold text-primary"
              >
                <ImageIcon className="w-4 h-4" /> Photo
              </button>
              <button
                onClick={() => { if (inputRef.current) { inputRef.current.accept = "video/*"; inputRef.current.click(); } }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-xs font-bold text-primary"
              >
                <Video className="w-4 h-4" /> Video
              </button>
            </div>
          </div>
        )}

        {preview && (
          <div className="relative mx-4 mt-3 rounded-xl overflow-hidden bg-muted">
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

        {/* Caption input - only shown after media is added */}
        {preview && (
          <div className="px-4 py-3">
            <textarea
              ref={textRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Add a caption..."
              maxLength={1000}
              rows={2}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none leading-relaxed"
            />
            <div className="text-right text-[10px] text-muted-foreground">{content.length}/1000</div>
          </div>
        )}

        {/* Change media button when preview exists */}
        {preview && (
          <div className={`flex items-center gap-2 px-4 py-3 border-t border-border`}>
            <button
              onClick={() => { if (inputRef.current) { inputRef.current.accept = "image/*"; inputRef.current.click(); } }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-muted transition-colors text-xs font-semibold text-foreground"
            >
              <ImageIcon className="w-4 h-4 text-primary" /> Change Photo
            </button>
            <button
              onClick={() => { if (inputRef.current) { inputRef.current.accept = "video/*"; inputRef.current.click(); } }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-muted transition-colors text-xs font-semibold text-foreground"
            >
              <Video className="w-4 h-4 text-accent-foreground" /> Change Video
            </button>
          </div>
        )}
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
  );
}
