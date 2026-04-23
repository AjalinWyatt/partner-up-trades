import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
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
    setStep(1);
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
    setStep(1);
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
  const stepTitle = step === 1 ? "Compose" : step === 2 ? "Tag Selection" : "Post";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md" onClick={reset}>
      <div
        className="mt-6 w-full max-w-xl overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_30px_80px_hsl(var(--background)/0.65)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <button
            onClick={() => (step === 1 ? reset() : setStep((current) => Math.max(1, current - 1) as 1 | 2 | 3))}
            className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            {step === 1 ? "Cancel" : <><ChevronLeft className="h-4 w-4" /> Back</>}
          </button>
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Feed</p>
            <p className="text-sm font-semibold text-foreground">{stepTitle}</p>
          </div>
          <div className="w-14 text-right text-[11px] font-medium text-muted-foreground">0{step}/03</div>
        </div>

        <div className="space-y-5 px-4 py-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((item) => (
              <span key={item} className={cn("h-1.5 flex-1 rounded-full", step >= item ? "bg-primary shadow-[0_0_14px_hsl(var(--primary)/0.35)]" : "bg-secondary")} />
            ))}
          </div>

          {step === 1 ? (
            <div className="space-y-4">
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
                  <div className="rounded-[22px] border border-border bg-secondary/50 px-4 py-4">
                    <textarea
                      ref={textRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your post..."
                      rows={7}
                      maxLength={1000}
                      className="w-full resize-none border-0 bg-transparent text-[15px] leading-7 text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-border bg-background/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <Camera className="h-4 w-4 text-primary" />
                    Attach Image / GIF
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
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{files.length > 0 ? `${files.length} attachment${files.length === 1 ? "" : "s"}` : "Text, image, or GIF"}</span>
                <span>{content.length}/1000</span>
              </div>
            </div>
          ) : step === 2 ? (
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Select Market</p>
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Select Type</p>
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
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-[22px] border border-border bg-secondary/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Ready to post</p>
                    <p className="mt-1 text-sm text-foreground">{displayHandle(userProfile?.username)}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{files.length > 0 ? `${files.length} attach` : "text only"}</span>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground/90">{content || "No text body"}</p>
                {!!selectedTags.length && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <span key={tag} className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handlePost}
                disabled={posting || !canPost}
                className="flex w-full items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.22)] disabled:opacity-40"
              >
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : initialPost ? "POST UPDATE" : "POST"}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-[11px] text-muted-foreground">
              {step === 1 ? "Compose first" : step === 2 ? "Select up to 3 total tags" : selectedMarketTag ? `${selectedMarketTag} ready` : "Choose a market"}
            </span>
            {step < 3 ? (
              <button
                onClick={() => setStep((current) => Math.min(3, current + 1) as 1 | 2 | 3)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : null}
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