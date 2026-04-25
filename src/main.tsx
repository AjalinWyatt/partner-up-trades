import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installSupabaseLogger } from "./lib/sbLogger";

// Install once: emits a structured console log for every Supabase request
// (auth, db, rpc, storage, realtime, edge functions) with timing + error.
installSupabaseLogger();

createRoot(document.getElementById("root")!).render(<App />);
