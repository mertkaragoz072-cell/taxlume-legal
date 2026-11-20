# Golden Town guild backend

The game is offline by default. Guilds need a small server; this folder is
that server's definition. **Nothing here is deployed yet** and the SQL has not
been run against a live database — treat first deployment as a test.

## What it is

A Supabase project (Postgres + anonymous auth). The app never touches the
tables: Row Level Security is on with no policies, and the app only calls the
functions in `supabase/schema.sql`, as an anonymous Supabase user created on
first use. No email, no password, no third-party login.

| Function                                      | Does                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| `sync_profile`                                | keeps the player's display name, rank and net worth current                       |
| `create_guild` / `join_guild` / `leave_guild` | guild membership, 6-character invite code, max 20 members                         |
| `report_contribution`                         | adds finished trades to the weekly goal (capped: 200 per call, one call per 20 s) |
| `get_my_guild`                                | everything the guild screen shows, in one call                                    |
| `send_cheer`                                  | one of five preset emoji; there is no free-text chat                              |
| `claim_weekly_reward`                         | `true` only for the call that takes this week's chest                             |
| `report_guild`                                | a player reports a guild name (see "Before shipping")                             |

The weekly goal is 120 trades per member, resetting every Monday 00:00 UTC.

## Setting it up

1. Create a Supabase project (free tier is enough to start).
2. Authentication → Providers: enable **Anonymous sign-ins**.
3. SQL editor: run `supabase/schema.sql`.
4. Give the app the project URL and anon key as build-time variables:
   `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   (Codemagic: environment variables; locally: `.env`). The anon key is meant
   to be public; the functions are what protect the data.
5. Without these two variables the Guild card reads "coming soon" and no
   network call is ever made. `EXPO_PUBLIC_GUILD_MOCK=1` runs the on-device
   mock instead (development and screenshots only; never set it in a release).

## Checks to run against the real project before shipping

- Two phones/browsers: create a guild on one, join with the code on the other,
  both appear in each other's member list.
- A 21st player gets `full`; a wrong code gets `not_found`; a taken name gets `name_taken`.
- Reporting 1000 trades in one call adds only 200; two calls within 20 s add once.
- `claim_weekly_reward` returns `true` once per member per week, `false` after.
- Owner leaves: the oldest member becomes owner; last member leaving deletes the guild.
- With the anon key and no session, `select * from guilds` is refused.

## Before shipping to the App Store / Google Play

- **Privacy policy** (`golden-town-privacy.html`, `privacy.html`): today it can
  say the game collects nothing. With guilds it must say that an anonymous
  account id, the town name (shown to guild members), net worth and rank, and
  the guild name are stored on a server. Update both pages and the store
  questionnaires (App Store privacy labels: Identifiers → User ID; User
  Content → Other User Content).
- **User-generated content**: guild names and town names are visible to other
  people. Apple (rule 1.2) wants filtering, a way to report, and a way to
  block. The game filters obvious names client-side (`src/guild/guildName.ts`),
  chat is emoji-only, and `report_guild` exists server-side, but **the game has
  no "Report" button yet** — add one to the guild screen before release, and
  decide who reads `guild_reports`.
- **Losing the account**: the anonymous account lives in the app's storage. If
  the player reinstalls or switches phone they start as a new player and are
  no longer in their guild (they can rejoin with the code). A recovery option
  (Sign in with Apple, etc.) can come later; if any third-party login is
  added, Apple requires Sign in with Apple to be offered too.
- **Cheating**: contributions and the chest are reported by the app, so a
  modified client could inflate them. The server caps the rate, which is
  enough for a casual cooperative feature; do not attach anything purchased
  or competitive to it.
