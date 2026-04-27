import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installSupabaseLogger } from "./lib/sbLogger";

// Install once: emits a structured console log for every Supabase request
// (auth, db, rpc, storage, realtime, edge functions) with timing + error.
installSupabaseLogger();

function installIOSAudioUnlock() {
  if (typeof window === "undefined") return;
  let unlocked = false;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    void ctx.resume?.();
  };
  window.addEventListener("touchstart", unlock, { once: true, passive: true });
  window.addEventListener("click", unlock, { once: true });
}

installIOSAudioUnlock();

createRoot(document.getElementById("root")!).render(<App />);

// Remove the index.html splash once React has mounted its first paint.
if (typeof window !== "undefined") {
  const removeSplash = () => {
    const el = document.getElementById("initial-splash");
    if (!el) return;
    el.classList.add("splash-hide");
    setTimeout(() => el.remove(), 280);
  };
  // Wait one frame after mount so React has painted something.
  requestAnimationFrame(() => requestAnimationFrame(removeSplash));
}
