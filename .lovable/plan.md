# Rebuild Trader Profiles From the Reference

## Goal
Reconstruct both viewed and personal trader profiles around the attached two-phone reference, using existing live profile, matching, connection, and Journal data only.

## Profile structure
- Restore exactly two primary tabs: **Details | Journal**.
- Make **Details** the default on personal profiles and profiles opened from Discover, Algo Match, Map/Near Me, or Partners.
- Keep both tabs inside the same profile screen; remove the Overview/Trading architecture.
- Preserve current back, options, edit-profile, settings, block, and unmatch controls without redesigning other screens.

## Details tab
- Match the reference’s compact mobile hierarchy: circular photo, name and age, `@username`, location, join date, `Market · Style · Experience`, short bio, and a small trait row only when real data exists.
- Place the existing relationship action directly below the identity block:
  - stranger → Connect
  - outgoing request → Requested
  - incoming request → Accept / Decline
  - accepted partner → Message
- Rebuild the compact **You + @trader** compatibility card with the real Algo Match score, short summary, up to five real matching reasons, and **Why this match?** opening the existing detailed explanation separately.
- Rebuild the compact **Trading Snapshot** card as a six-cell grid for Market, Style, Experience, Strategy, Session, and Timeframe.
- Add **View all** to open deeper available trading/profile information separately; do not stack it on the default Details screen.
- Hide missing values rather than copying mock content.
- On the personal profile, use the same visual structure but omit compatibility and relationship actions; retain Edit Profile and settings.

## Journal tab
- Build the reference-style Journal screen with a compact identity summary, Details/Journal tabs, Journal Activity heading, optional filter control, and dense journal cards.
- Show real date, entry/account type, title derived from available entry data, short notes preview, market/session/result/pips/tags, and attached media only when the existing entry provides it.
- Make each card expandable/openable for the complete existing entry content.
- Show a compact empty state when no entries are visible.
- Preserve personal Journal privacy controls already available on the owner’s profile.
- Preserve current sharing rules: another trader’s Journal query remains limited to accepted partners and entries shared with partners; no privacy policies or schema will change.

## Visual reconstruction
- Follow the reference’s proportions and density: near-black background, compact spacing, subtle teal-tinted card surfaces, thin borders, moderate corner radii, restrained cyan accents, small chips, icon sizing, two-column tab treatment, compatibility ring, six-cell snapshot grid, and media-forward Journal cards.
- Use existing semantic theme colors and existing UI controls; no unrelated global visual changes.
- Do not add a cover image or online-status indicator because the current data model does not support them.

## Files in scope
- `src/pages/ViewProfile.tsx`
- `src/pages/Profile.tsx`
- `src/components/profile/TraderDetailsPanel.tsx`
- `src/components/profile/ProfileJournalCards.tsx`
- A small profile-only presentation component may be added if needed to keep the two pages consistent.

## Validation
- Run the project’s TypeScript check.
- Verify the viewed profile and personal profile at the mobile reference size.
- Verify Details is the default, Journal is the second tab, relationship states remain wired, compatibility uses `computeMatch`, View all stays separate, and Journal visibility follows the existing query rules.
- Confirm no Feed/Grid UI returns and no unrelated route, backend, matching, connection, or Journal privacy behavior changes.
