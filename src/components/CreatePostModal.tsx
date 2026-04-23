import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
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

const MARKET_TAGS = ["Crypto", "Forex", "Indices", "Futures", "Options", "Commodities"] as const;
const CONTENT_TAGS = ["Idea", "Question", "Win", "Loss", "Meme", "Rant"] as const;
const MAX_TAGS = 3;

const normalizeTag = (tag: string) => tag.trim().toLowerCase();
const displayHandle = (username: string | null | undefined) => `@${(username || "trader").replace(/^@+/, "")}`;

export default function CreatePostModal({ open, onClose, onCreated, initialPost = null }: CreatePostModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<{ username: string | null; avatar_url: string | null } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const selectedMarketTag = useMemo(
    () => selectedTags.find((tag) => MARKET_TAGS.some((market) => normalizeTag(market) === normalizeTag(tag))) || null,
    [selectedTags]
  );

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("username, avatar_url").eq("id", user.id).maybeSingle();
      setUserProfile(profile || null);
    };

    load();
    setTimeout(() => textRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setContent(initialPost?.content || initialPost?.caption || "");
    setFiles([]);
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews(initialPost?.media_urls || []);

    const legacyTags = (initialPost?.tags || []).map((tag) => {
      const marketMatch = MARKET_TAGS.find((market) => normalizeTag(market) === normalizeTag(tag));
      const contentMatch = CONTENT_TAGS.find((contentTag) => normalizeTag(contentTag) === normalizeTag(tag));
      return marketMatch || contentMatch || tag;
    });

    const seededTags = [...legacyTags];
    const hasTaggedMarket = seededTags.some((tag) => MARKET_TAGS.some((market) => normalizeTag(market) === normalizeTag(tag)));
    if (!hasTaggedMarket && initialPost?.market) seededTags.unshift(initialPost.market);

    setSelectedTags([...new Set(seededTags)].slice(0, MAX_TAGS));
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
    setSelectedTags((current) => {
      const exists = current.some((item) => normalizeTag(item) === normalizeTag(tag));
      if (exists) return current.filter((item) => normalizeTag(item) !== normalizeTag(tag));

      const isMarket = MARKET_TAGS.some((market) => normalizeTag(market) === normalizeTag(tag));
      const withoutExistingMarket = isMarket
        ? current.filter((item) => !MARKET_TAGS.some((market) => normalizeTag(market) === normalizeTag(item)))
        : current;

      if (withoutExistingMarket.length >= MAX_TAGS) {
        toast.error("Choose up to 3 tags");
        return current;
      }

      return [...withoutExistingMarket, tag];
    });
  };

  const handlePost = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent && files.length === 0) {
      toast.error(initialPost ? "Add text or at least one image" : "Write something or add up to 4 images");
      return;
    }

    if (!selectedMarketTag) {
      toast.error("Select one market tag");
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

      const payload = {
        content: trimmedContent || null,
        caption: trimmedContent || null,
        image_url: mediaUrls[0] || initialPost?.media_urls?.[0] || null,
        media_url: mediaUrls[0] || initialPost?.media_urls?.[0] || null,
        media_type: mediaUrls.length > 0 || initialPost?.media_urls?.length ? "image" : null,
        media_urls: mediaUrls.length > 0 ? mediaUrls : initialPost?.media_urls || [],
        market: selectedMarketTag,
        tags: selectedTags,
      };

      if (initialPost) {
        const { error: updateErr } = await supabase.from("posts").update(payload).eq("id", initialPost.id).eq("user_id", user.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from("posts").insert({ ...payload, user_id: user.id });
        if (insertErr) throw insertErr;
      }

      toast.success(initialPost ? "Post updated" : "Posted");
      reset();
      onCreated();
    } catch (error) {
      console.error(error);
      toast.error("Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const canPost = (!!content.trim() || files.length > 0) && !!selectedMarketTag;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md" onClick={reset}>
      <div
        className="mt-6 w-full max-w-xl overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_30px_80px_hsl(var(--background)/0.65)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <button onClick={reset} className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
            Cancel
          </button>
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Feed</p>
            <p className="text-sm font-semibold text-foreground">{initialPost ? "Edit post" : "New post"}</p>
          </div>
          <button
            onClick={handlePost}
            disabled={posting || !canPost}
            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.22)] disabled:opacity-40"
          >
            {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : initialPost ? "Save" : "Post"}
          </button>
        </div>

        <div className="space-y-5 px-4 py-4">
          <div className="flex items-start gap-3">
            {userProfile?.avatar_url ? (
              <img src={userProfile.avatar_url} alt="Your avatar" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary text-sm font-semibold text-foreground">
                {(userProfile?.username || "T").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-2 text-sm font-semibold text-foreground">{displayHandle(userProfile?.username)}</div>
              <textarea
                ref={textRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={initialPost ? "Refine your take..." : "Share a setup, lesson, meme, question, or market thought..."}
                rows={7}
                maxLength={1000}
                className="w-full resize-none border-0 bg-transparent text-[15px] leading-7 text-foreground outline-none placeholder:text-muted-foreground"
              />
              <div className="mt-3 h-px bg-border" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Market</p>
              <p className="text-[11px] text-muted-foreground">{selectedTags.length}/{MAX_TAGS} tags</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {MARKET_TAGS.map((tag) => {
                const active = selectedTags.some((item) => normalizeTag(item) === normalizeTag(tag));
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all",
                      active
                        ? "border-primary bg-primary/12 text-foreground shadow-[0_0_20px_hsl(var(--primary)/0.18)]"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Post type</p>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TAGS.map((tag) => {
                const active = selectedTags.some((item) => normalizeTag(item) === normalizeTag(tag));
                const disabled = !active && selectedTags.length >= MAX_TAGS;
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    disabled={disabled}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all disabled:opacity-40",
                      active
                        ? "border-primary bg-primary/12 text-foreground shadow-[0_0_20px_hsl(var(--primary)/0.18)]"
                        : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/50 p-3">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Camera className="h-4 w-4 text-primary" />
                Add photo
              </button>
              <button onClick={reset} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {previews.length > 0 && (
              <div className="mt-3">
                <Carousel opts={{ loop: previews.length > 1 }} className="w-full">
                  <CarouselContent className="ml-0">
                    {previews.map((preview, index) => (
                      <CarouselItem key={preview} className="pl-0">
                        <div className="overflow-hidden rounded-2xl border border-border bg-muted">
                          <img src={preview} alt={`Selected upload ${index + 1}`} className="h-[280px] w-full object-cover" />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{files.length || previews.length} image{(files.length || previews.length) === 1 ? "" : "s"} selected</span>
                  <button onClick={() => inputRef.current?.click()} className="text-xs font-semibold text-primary transition-colors hover:text-foreground">
                    Change photo
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{selectedMarketTag ? `${selectedMarketTag} selected` : "Choose a market"}</span>
            <span>{content.length}/1000</span>
          </div>
        </div>

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