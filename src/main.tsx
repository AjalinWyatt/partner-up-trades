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

const splash = document.getElementById("tw-splash");
if (splash) {
  requestAnimationFrame(() => {
    splash.classList.add("tw-hide");
    window.setTimeout(() => splash.remove(), 300);
  });
}
