## Build plan

### 1. Partner check-in streak
- **Backend**: Postgres function `get_partner_checkin_streak(user_a, user_b)` returns the current consecutive-day streak where both partners exchanged at least one message that day (timezone: UTC).
- **Partners page**: Replace the existing per-user journaling streak chip with a shared "🤝 N day streak" chip per partner card. Add an "at risk" orange state when streak > 0 and no exchange today.
- **Notification trigger**: When a streak is at risk (>0 and no message after 6pm local server time), the weekly recap function (which runs daily for the at-risk check) inserts a `streak_warning` notification.

### 2. Weekly recap (Sundays, 17:00 UTC)
For every accepted `partner_connections` row, generate a recap covering Mon–Sun:
- Trades logged (per partner)
- Win rate (entries with `result` set)
- Current personal streaks
- Partner check-in streak
- Messages exchanged this week
- Top 3 performance tags used

Deliver via:
- **System DM**: posted into the partner conversation from the system account (`00000000-…0001`) so it shows inline in chat.
- **Email**: branded React Email template through the existing Lovable email queue (transactional), respecting `notify_email`.

### 3. Files
- `supabase/migrations/<ts>_partner_streak.sql` — `get_partner_checkin_streak` function.
- `supabase/functions/weekly-partner-recap/index.ts` — cron-triggered edge function (service-role; loops partnerships, computes stats, enqueues emails, inserts system DMs).
- `supabase/functions/_shared/email-templates/weekly-recap.tsx` — branded template.
- `src/pages/Partners.tsx` — swap streak source to the new shared streak via RPC, add at-risk styling.

### 4. Scheduling
- Daily cron at 18:00 UTC for at-risk streak notifications.
- Weekly cron Sunday 17:00 UTC for the recap (same function, mode param).

### Out of scope (for now)
- User-configurable timezone for streak calculation (UTC for v1).
- Recap preview UI / on-demand "generate now" button (can add later).

Confirm and I'll ship it.