# Profile data readiness

## Goal
Make the existing Profile experience fully supportable with real user data, without changing its visual design, matching formula, navigation, or unrelated features.

## Audit findings to resolve
- Most displayed identity, trading, matching, and Journal fields already exist and are captured.
- `connection_types` already exists in the database and Profile detail data, but onboarding never asks it and Edit Profile cannot change it.
- The Profile’s “Strengths & support” line currently reuses `struggles`; there is no distinct way to record what a trader contributes versus where they need help.
- `connect_frequency` captures check-in cadence, but no current field captures preferred communication/check-in style.
- Journal creation already captures every field rendered by the Profile Journal cards. No Journal schema expansion is needed.

## Changes
1. Add only three focused trading-profile fields: strengths, accountability needs, and communication preferences.
2. Add concise onboarding choices for connection type, strengths, accountability needs, and communication style, reusing answers for Profile and matching where already applicable.
3. Add the same controls to Edit Profile and save them with the existing profile record.
4. Keep the Profile layout unchanged; only map the existing deeper-details rows to the corrected data sources.
5. Keep the matching calculation unchanged. Existing match inputs remain markets, strategy, experience, style, goals, interests, struggles/accountability needs, and session.
6. Keep Journal creation and privacy unchanged because its current trade/study fields already cover the Profile cards.
7. Create one clearly labeled development trader account, populate every supported field, and create varied trade/study Journal entries with both partner-shared and private visibility.
8. Verify the account through authenticated app behavior, confirm the real compatibility result, and confirm private Journal entries remain hidden from another user.

## Technical details
- Apply the schema change through a database migration; update generated project types through the supported backend type flow.
- Do not add cover photos, online status, duplicate profile fields, or new Journal columns.
- Test data will be isolated to one labeled account and will use the same profile, trading-profile, Journal, and privacy rules as production users.
