import { useRef, useState } from "react";
import { Image, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invalidateSessionCache } from "@/hooks/use-session-cache";

interface AttachmentButtonProps {
  userId: string;
  connectionId: string;
  partnerId: string;
  onSent: () => void;
}

export default function AttachmentButton({ userId, connectionId, partnerId, onSent }: AttachmentButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "bin";
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("message-attachments").upload(path, file, { contentType: file.type });
    if (upErr) { console.error(upErr); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("message-attachments").getPublicUrl(path);

    const isImage = file.type.startsWith("image/");
    await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: partnerId,
      connection_id: connectionId,
      content: isImage ? "" : file.name,
      media_url: urlData.publicUrl,
      media_type: isImage ? "image" : file.type || "file",
    } as any);
    invalidateSessionCache("messages:connections");
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    onSent();
  };

  if (uploading) {
    return (
      <button className="p-1.5 rounded-full text-muted-foreground" disabled>
        <Loader2 className="w-5 h-5 animate-spin" />
      </button>
    );
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*,application/pdf,.doc,.docx,.txt,.csv" className="hidden" onChange={handleFile} />
      <button onClick={() => fileRef.current?.click()} className="p-1.5 rounded-full hover:bg-background/50 transition-colors text-muted-foreground hover:text-foreground" title="Attach file">
        <Image className="w-5 h-5" />
      </button>
    </>
  );
}
