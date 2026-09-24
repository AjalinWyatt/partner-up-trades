# Trader Profile Redesign Plan

## Scope
Redesign the existing trader profile experience to closely match the attached two-screen mockup while using only real TradersWorld data. No database schema changes, no changes to Discover, Map, Messages, Community, Journal creation, onboarding, navigation, or historical Feed data.

## Audit findings and dependencies
- There are three profile experiences: the owner profile, viewed profile, and Discover match profile. Discover opens `/match/:userId`; Map, Partners, and Saved open `/profile/:userId`.
- Compatibility already comes from `computeMatch`, but Discover adds a location bonus while Map substitutes reduced percentages for excluded matches. The current match-profile page trusts a passed score and can show 0% on a direct link.
- Partnership state is shared through `partner_connections`: pending, accepted, and declined. Incoming request actions currently exist only on Partners, not profiles.
- Messages are listed only for accepted partners in the UI, but database rules do not independently enforce an accepted partnership.
- Journal values are `private` or `partners`, plus `hidden_from_journal`. Current database rules allow any signed-in user to read non-private entries; they do not enforce accepted-partner access or hidden status.
- No Journal image/chart attachment field exists. Journal cards can show the existing entry type, account type, date, market/pair, result, notes, tags, P&L, and study information only.
- No dedicated location-display privacy field exists. Profiles currently expose city/state/country to signed-in users; `show_on_map` controls map inclusion, not profile location display.

## Implementation

### 1. Unified viewed profile
- Make `/profile/:userId` the complete viewed-profile experience.
- Keep `/match/:userId` working, but have it use the same profile UI and live data instead of a separate card implementation.
- Keep Discover and Map navigation unchanged.
- Recalculate compatibility on the profile from both users’ current profile and trading answers using `computeMatch`, so direct links, Discover, Map, Partners, and Saved behave consistently.

### 2. Premium compact header and fixed tabs
- Build the mockup-inspired near-black profile header with real avatar, display name, age from `birth_year`, `@username`, current location fields, join month/year, market, style, experience, and bio.
- Do not add a cover image or online indicator.
- Use only **Details | Journal**, with Details first and active by default.
- Keep the tabs visible above the independently scrolling tab content.

### 3. Relationship-aware primary action
- Use the existing `partner_connections` row to render:
  - No relationship: **Connect**
  - Outgoing pending: **Requested ✓** with existing cancel behavior available
  - Incoming pending: **Accept** and **Decline**
  - Accepted: **Message**
  - Blocked by the viewer: **Unblock**
- Reuse existing request, accept, decline, cancel, unmatch, block, notification, and cache invalidation behavior.
- Do not expose the normal Message action unless the relationship is accepted.
- Handle an existing declined row safely by updating/reusing it rather than attempting a duplicate request.

### 4. Details tab
- Add **You + @trader** compatibility only for other users when enough real data exists.
- Show the live percentage, a concise score-based summary, strongest shared factors, useful low-overlap differences, and an expandable **Why this match?** breakdown.
- Build a six-item compact Trading Snapshot from market, style, experience, strategy, session, and timeframe; omit missing values.
- Add **View all** only when more data exists. Expand compact grouped rows/chips for instruments, charts, trade times, frequency, goals, loss response, struggles, journaling, trading plan, partner preferences, connection frequency, priorities, and off-chart interests.
- Map existing answers into compact sections such as Looking For, Trading Habits, Growth & Support, How I Like to Connect, and Off the Charts. Do not invent “What I Bring” data because no dedicated field currently exists.

### 5. Journal tab
- Create compact Journal cards matching the second mockup: date, entry/study type, account type, topic or market, short note/takeaway preview, result/P&L, and tags.
- Allow a card to expand to its full existing details without changing Journal creation or editing.
- Owner view: show all entries not hidden from the profile Journal, including private badges and existing privacy/remove controls.
- Other-user view: fetch and display entries only when the viewer is an accepted partner, `share_setting` is `partners`, and `hidden_from_journal` is false.
- Show a small clean empty state when nothing is visible.

### 6. Own profile
- Apply the same header, Details, compact snapshot, progressive disclosure, and Journal card system.
- Keep Details default, Journal second, avatar editing, Edit Profile, Settings, completeness prompt, Journal privacy controls, and profile management.
- Do not show self-compatibility or relationship actions.

## Files
- Add shared profile presentation/compatibility/Journal components under `src/components/profile/`.
- Update `src/pages/Profile.tsx` for the owner experience while preserving editing and management.
- Update `src/pages/ViewProfile.tsx` for unified viewed profiles and relationship actions.
- Simplify `src/pages/MatchProfile.tsx` to use the unified viewed-profile experience.
- Update `src/lib/matchUtils.ts` only if a small shared display helper is needed; do not change scoring weights or eligibility rules.
- Remove now-unused profile-only Feed/Post imports and dead profile post code, without deleting backend data or infrastructure.

## Validation
- Type-check the app.
- Verify mobile and desktop layouts with real authenticated data.
- Verify Details is default on own, viewed, and `/match/:userId` profiles.
- Verify Journal switching, compact cards, empty states, and owner privacy controls.
- Verify Connect, Requested, incoming Accept/Decline, accepted Message, blocked, and self states where available.
- Verify the same live compatibility result appears regardless of entry path.
- Confirm no changes to the excluded features.

## Recommended later security changes — not included
- Tighten Journal read rules to require an accepted partnership and `hidden_from_journal = false` for partner-shared entries.
- Tighten message-send rules to require an accepted partnership.
- Decide whether declined requests should be deleted or explicitly reusable everywhere.
- Consider a future Journal attachment field if profile Journal cards need uploaded chart images.
