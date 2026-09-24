import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listJournal from "./tools/list-journal-entries";
import addJournal from "./tools/add-journal-entry";
import getProfile from "./tools/get-my-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "traders-world",
  title: "Traders World",
  version: "0.1.0",
  instructions:
    "Tools for TradersWorld, a trading accountability app. Use `get_my_profile` for the trader's profile, `list_journal_entries` to review their trading log, and `add_journal_entry` to log a trade.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfile, listJournal, addJournal],
});
