import { supabase } from "@/integrations/supabase/client";

const PRIVATE_BUCKETS = ["audio-messages", "message-attachments"] as const;

function parseStorageRef(input: string): { bucket: string; path: string } | null {
  for (const b of PRIVATE_BUCKETS) {
    const marker = `/storage/v1/object/public/${b}/`;
    const i = input.indexOf(marker);
    if (i >= 0) return { bucket: b, path: input.substring(i + marker.length) };
    const altMarker = `/object/${b}/`;
    const j = input.indexOf(altMarker);
    if (j >= 0) return { bucket: b, path: input.substring(j + altMarker.length) };
    if (input.startsWith(`${b}/`)) return { bucket: b, path: input.substring(b.length + 1) };
  }
  return null;
}

type CacheEntry = { url: string; exp: number };
const cache = new Map<string, CacheEntry>();

/**
 * Resolve a stored media reference (public URL we used to write, or bare path)
 * to a fresh signed URL. Public buckets/unknown inputs pass through untouched.
 */
export async function getSignedMediaUrl(input: string | null | undefined, expiresIn = 3600): Promise<string> {
  if (!input) return "";
  const now = Date.now();
  const cached = cache.get(input);
  if (cached && cached.exp > now + 60_000) return cached.url;
  const ref = parseStorageRef(input);
  if (!ref) return input;
  const { data, error } = await supabase.storage.from(ref.bucket).createSignedUrl(ref.path, expiresIn);
  if (error || !data) return input;
  cache.set(input, { url: data.signedUrl, exp: now + expiresIn * 1000 });
  return data.signedUrl;
}