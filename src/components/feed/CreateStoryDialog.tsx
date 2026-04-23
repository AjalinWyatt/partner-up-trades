import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Clapperboard, Loader2, Scissors, Upload, Video, X } from "lucide-react";
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
  const captureInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [processingVideo, setProcessingVideo] = useState(false);

  const pulseMarkets = ["Crypto", "Forex", "Indices", "Futures", "Options", "Commodities"] as const;
  const isVideo = !!file?.type.startsWith("video/");
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const requiresTrim = isVideo && videoDuration > 45;
  const trimLength = Math.min(45, Math.max(0, videoDuration - trimStart));

  useEffect(() => {
    if (!open) {
      setFile(null);
      setCaption("");
      setUploading(false);
      setSelectedMarket(null);
      setTrimStart(0);
      setVideoDuration(0);
      setProcessingVideo(false);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!previewUrl || !isVideo) {
      setVideoDuration(0);
      setTrimStart(0);
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = previewUrl;
    const handleLoaded = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      setVideoDuration(duration);
      setTrimStart(0);
    };
    video.addEventListener("loadedmetadata", handleLoaded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.src = "";
    };
  }, [isVideo, previewUrl]);

  const handleSelect = (incoming: FileList | null) => {
    const next = incoming?.[0];
    if (!next) return;
    if (!next.type.startsWith("image/") && !next.type.startsWith("video/")) {
      toast.error("Pulse supports photos and videos");
      return;
    }
    if (next.size > 80 * 1024 * 1024) {
      toast.error("Pulse media must be under 80MB");
      return;
    }
    setFile(next);
  };

  const trimVideoFile = async (sourceFile: File, startAt: number, maxDuration: number) => {
    const sourceUrl = URL.createObjectURL(sourceFile);
    const video = document.createElement("video");
    video.src = sourceUrl;
    video.muted = false;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not load video"));
    });

    const stream = (video as HTMLVideoElement & { captureStream: () => MediaStream }).captureStream();
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    await new Promise<void>((resolve) => {
      const handleSeeked = () => resolve();
      video.currentTime = Math.min(startAt, Math.max(0, video.duration - 0.25));
      video.onseeked = handleSeeked;
    });

    const segmentDuration = Math.min(maxDuration, Math.max(1, video.duration - startAt));

    const trimmedFile = await new Promise<File>((resolve, reject) => {
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        URL.revokeObjectURL(sourceUrl);
        const blob = new Blob(chunks, { type: mimeType });
        resolve(new File([blob], `${sourceFile.name.replace(/\.[^.]+$/, "")}-trimmed.webm`, { type: blob.type }));
      };
      recorder.onerror = () => reject(new Error("Could not trim video"));
      recorder.start();
      video.play().catch(reject);
      window.setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
        video.pause();
      }, segmentDuration * 1000);
    });

    setFile(trimmedFile);
    setVideoDuration(Math.min(45, segmentDuration));
    setTrimStart(0);
    return trimmedFile;
  };

  const handleCreate = async () => {
    if (!file) {
      toast.error("Add pulse media first");
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

      let uploadFile = file;
      let mediaType = file.type.startsWith("video/") ? "video" : "image";

      if (file.type.startsWith("video/") && videoDuration > 45) {
        setProcessingVideo(true);
        uploadFile = await trimVideoFile(file, trimStart, 45);
        mediaType = "video";
        setProcessingVideo(false);
      }

      const ext = uploadFile.name.split(".").pop() || (mediaType === "video" ? "webm" : "jpg");
      const path = `${user.id}/stories/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, uploadFile, { upsert: true, contentType: uploadFile.type });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("post-images").getPublicUrl(path);
      const { error: insertError } = await supabase.from("stories" as any).insert({
        user_id: user.id,
        media_url: publicUrl.publicUrl,
        media_type: mediaType,
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
      setProcessingVideo(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-0.5rem)] overflow-hidden border-border bg-card p-0 sm:max-w-md">
        <div className="border-b border-border px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Pulse</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Share a live pulse</p>
            <button onClick={onClose} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <X className="h-4 w-4" /> Close
            </button>
          </div>
        </div>
        <div className="max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-5rem)] overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => captureInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Video className="h-4 w-4 text-primary" /> Record
              </button>
              <button
                onClick={() => libraryInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Upload className="h-4 w-4 text-primary" /> Library
              </button>
            </div>

            <button
              onClick={() => libraryInputRef.current?.click()}
              className="flex aspect-[9/16] w-full items-center justify-center overflow-hidden rounded-[24px] border border-border bg-secondary"
            >
              {previewUrl ? (
                isVideo ? (
                  <video src={previewUrl} className="h-full w-full object-cover" muted playsInline controls />
                ) : (
                  <img src={previewUrl} alt="Pulse preview" className="h-full w-full object-cover" />
                )
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Camera className="h-6 w-6" />
                  <span className="text-xs font-medium">Add photo or video</span>
                </div>
              )}
            </button>

            {isVideo && (
              <div className="rounded-2xl border border-border bg-secondary/40 p-3">
                <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clapperboard className="h-3.5 w-3.5 text-primary" /> Video</span>
                  <span>{videoDuration ? `${Math.ceil(videoDuration)}s` : "Loading..."}</span>
                </div>

                {requiresTrim && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-foreground">
                      <Scissors className="h-3.5 w-3.5 text-primary" />
                      <span>Videos over 45s need trimming before sharing.</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, Math.floor(videoDuration - 45))}
                      step={1}
                      value={trimStart}
                      onChange={(event) => setTrimStart(Number(event.target.value))}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Start: {Math.floor(trimStart)}s</span>
                      <span>Clip: {Math.ceil(trimLength)}s</span>
                    </div>
                  </div>
                )}
              </div>
            )}

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

            <div className="flex items-center justify-between gap-3 pb-1">
              <button
                onClick={() => setFile(null)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                disabled={!file}
              >
                <X className="h-4 w-4 text-primary" /> Clear
              </button>
              <button
                onClick={handleCreate}
                disabled={uploading || processingVideo || !file || !selectedMarket}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.22)] disabled:opacity-40"
              >
                {uploading || processingVideo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Share pulse"}
              </button>
            </div>
          </div>

          <input
            ref={captureInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              handleSelect(event.target.files);
              event.target.value = "";
            }}
          />
          <input
            ref={libraryInputRef}
            type="file"
            accept="image/*,video/*"
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