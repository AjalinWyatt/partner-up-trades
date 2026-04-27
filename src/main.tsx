import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installSupabaseLogger } from "./lib/sbLogger";
import { installIOSAudioUnlock } from "./lib/audioCoordinator";

// Install once: emits a structured console log for every Supabase request
// (auth, db, rpc, storage, realtime, edge functions) with timing + error.
installSupabaseLogger();
// iOS Safari requires a user gesture to unlock audio output. Install a one-shot
// listener so the very first tap anywhere unlocks playback for the session.
installIOSAudioUnlock();

createRoot(document.getElementById("root")!).render(<App />);
