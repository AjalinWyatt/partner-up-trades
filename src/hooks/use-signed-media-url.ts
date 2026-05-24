import { useEffect, useState } from "react";
import { getSignedMediaUrl } from "@/lib/storageUrls";

export function useSignedMediaUrl(urlOrPath?: string | null): string {
  const [signed, setSigned] = useState<string>("");
  useEffect(() => {
    if (!urlOrPath) { setSigned(""); return; }
    let cancelled = false;
    getSignedMediaUrl(urlOrPath).then((u) => { if (!cancelled) setSigned(u); });
    return () => { cancelled = true; };
  }, [urlOrPath]);
  return signed;
}