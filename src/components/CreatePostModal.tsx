import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Hash, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialPost?: {
    id: string;
    content?: string | null;
    caption?: string | null;
    media_urls?: string[] | null;
    market?: string | null;
    tags?: string[] | null;
  } | null;
}

const TAGS_BY_MARKET: Record<string, string[]> = {
  Forex: ["chartwork", "indices", "london open", "new york session", "macro", "risk setup"],
  Futures: ["chartwork", "indices", "nq", "es", "order flow", "trading plan"],
  Options: ["chartwork", "gamma", "swing idea", "risk setup", "trading plan", "volatility"],
};

const COMMON_TAGS = ["crypto", "trading plan", "recap", "mindset", "breakout", "discipline"];

export default function CreatePostModal({ open, onClose, onCreated, initialPost = null }: CreatePostModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [userMarkets, setUserMarkets] = useState<string[]>([]);
  const [selectedMarket, setSelectedMarket] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [userProfile, setUserProfile] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const availableTags = useMemo(() => {
    const marketTags = selectedMarket ? TAGS_BY_MARKET[selectedMarket] || [] : [];
    return [...new Set([...marketTags, ...COMMON_TAGS])];
  }, [selectedMarket]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      const [{ data: tp }, { data: profile }] = await Promise.all([
        supabase.from("trading_profiles").select("markets").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("username, avatar_url").eq("id", user.id).maybeSingle(),
      ]);
      const markets = tp?.markets || [];
      setUserMarkets(markets);
      setSelectedMarket(current => current || markets[0] || "");
      setUserProfile(profile || null);
    };
    load();
    setTimeout(() => textRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setContent(initialPost?.content || initialPost?.caption || "");
    setSelectedMarket(initialPost?.market || "");
    setSelectedTags(initialPost?.tags || []);
    setFiles([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews(initialPost?.media_urls || []);
  }, [initialPost, open]);

  useEffect(() => {
    if (!open) return;
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [open, previews]);

  if (!open) return null;

  const reset = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
    setContent("");
    setSelectedTags([]);
    setShowTagPicker(false);
    onClose();
  };

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming?.length) return;
    const nextFiles = Array.from(incoming).slice(0, 4);
    if (nextFiles.some((file) => !file.type.startsWith("image/"))) {
      toast.error("Only images are supported here");
      return;
    }
    if (nextFiles.some((file) => file.size > 10 * 1024 * 1024)) {
      toast.error("Each image must be under 10MB");
      return;
    }
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles(nextFiles);
    setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  };

  const handlePost = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent && files.length === 0) {
      toast.error("Write something or add up to 4 images");
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
        const { error: uploadErr } = await supabase.storage
          .from("post-images")
          .upload(filePath, file, { upsert: true, contentType: file.type });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(filePath);
        mediaUrls.push(urlData.publicUrl);
      }

      const insertData: any = {
        user_id: user.id,
        content: trimmedContent || null,
        caption: trimmedContent || null,
        image_url: mediaUrls[0] || null,
        media_url: mediaUrls[0] || null,
        media_type: mediaUrls.length > 0 ? "image" : null,
        media_urls: mediaUrls,
        market: selectedMarket || null,
        tags: selectedTags,
      };

      const { error: insertErr } = await supabase.from("posts").insert(insertData);
      if (insertErr) throw insertErr;

      toast.success("Posted!");
      reset();
      onCreated();
    } catch (error) {
      console.error(error);
      toast.error("Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const canPost = !!content.trim() || files.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[env(safe-area-inset-top)]" onClick={reset}>
      <div className="mx-4 mt-10 w-full max-w-lg overflow-hidden rounded-[28px] border border-border bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <button onClick={reset} className="text-base font-semibold text-muted-foreground transition-colors hover:text-foreground">
            Cancel
          </button>
          <span className="text-base font-extrabold text-foreground">New post</span>
          <button
            onClick={handlePost}
            disabled={posting || !canPost}
            className="rounded-full bg-gradient-to-r from-primary to-success px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-40"
          >
            {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Post"}
          </button>
        </div>

        <div className="px-4 pt-4">
          <div className="flex items-start gap-3">
            {userProfile?.avatar_url ? (
              <img src={userProfile.avatar_url} alt="Your avatar" className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {(userProfile?.username || "@").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="pb-2 text-sm font-bold text-foreground">@{userProfile?.username || "trader"}</div>
              <textarea
                ref={textRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's new?"
                rows={6}
                maxLength={1000}
                className="w-full resize-none bg-transparent text-[15px] leading-7 text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="mt-2 text-right text-[10px] text-muted-foreground">{content.length}/1000</div>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
              title="Add photos"
            >
              <Camera className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowTagPicker((current) => !current)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                showTagPicker || selectedTags.length > 0 ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
              title="Add tags"
            >
              <Hash className="h-5 w-5" />
            </button>
          </div>
          <button onClick={reset} className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3">
          {userMarkets.map((market) => (
            <button
              key={market}
              onClick={() => setSelectedMarket(market)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors",
                selectedMarket === market ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
              )}
            >
              {market}
            </button>
          ))}
        </div>

        {showTagPicker && (
          <div className="border-t border-border px-4 py-3">
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    selectedTags.includes(tag) ? "border-primary/40 bg-primary/15 text-primary" : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {previews.length > 0 && (
          <div className="border-t border-border px-4 py-4">
            <Carousel opts={{ loop: previews.length > 1 }} className="w-full">
              <CarouselContent className="ml-0">
                {previews.map((preview, index) => (
                  <CarouselItem key={preview} className="pl-0">
                    <div className="overflow-hidden rounded-xl bg-muted">
                      <img src={preview} alt={`Selected upload ${index + 1}`} className="h-[280px] w-full object-cover" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{files.length} image{files.length === 1 ? "" : "s"} selected</span>
              <button onClick={() => inputRef.current?.click()} className="text-xs font-bold text-primary hover:text-primary/80">
                Change photos
              </button>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}