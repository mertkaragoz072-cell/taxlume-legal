# Golden Town guild backend

The game is offline by default. Guilds need a small server; this folder is
that server's definition. **Nothing here is deployed yet** and the SQL has not
been run against a live database — treat first deployment as a test.

## What it is

A Supabase project (Postgres + anonymous auth). The app never touches the
tables: Row Level Security is on with no policies, and the app only calls the
functions in `supabase/schema.sql`, as an anonymous Supabase user created on
first use. No email, no password, no third-party login.

| Function                                      | Does                                                                                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `sync_profile`                                | keeps the player's display name, rank and net worth current                                                                                    |
| `create_guild` / `join_guild` / `leave_guild` | guild membership, 6-character invite code, max 20 members. `leave_guild` also deletes the player's anonymous account and everything tied to it |
| `report_contribution`                         | adds finished trades to the weekly goal (capped: 200 per call, one call per 20 s)                                                              |
| `get_my_guild`                                | everything the guild screen shows, in one call                                                                                                 |
| `send_cheer`                                  | one of five preset emoji; there is no free-text chat                                                                                           |
| `claim_weekly_reward`                         | `true` only for the call that takes this week's chest                                                                                          |
| `report_guild`                                | a player reports a guild or a member's name (fixed reasons); the game has a "Report this guild" button                                         |

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
- Owner leaves: the oldest member becomes owner; last member leaving deletes the guild; the leaver's account and data are gone (`auth.users` row deleted).
- With the anon key and no session, `select * from guilds` is refused.

## Before shipping to the App Store / Google Play

Done in the repository:

- **Privacy policy and support page** (`../golden-town-privacy.html`,
  `../golden-town-support.html`) describe guilds, what is stored, that leaving
  a guild deletes it, and how to report. (`../privacy.html` and `terms.html`
  belong to the separate Taxlume app and are untouched.)
- **Nothing is sent until the player uses guilds.** No server contact and no
  anonymous account is created at launch; the first call happens when a guild
  is created or joined.
- **User-generated content (App Store rule 1.2)**: obvious offensive names are
  filtered client-side (`src/guild/guildName.ts`), chat is emoji-only, and the
  guild screen has a "Report this guild" button that writes to `guild_reports`.
  Leaving a guild is how a player stops seeing anyone in it.

Still yours to do:

- **Read the reports.** Reports land in the `guild_reports` table (Table
  Editor → guild_reports). Decide who checks it and how often; Apple expects
  prompt action on objectionable content. A reported guild can be removed with
  `delete from guilds where id = '...'`.
- **Store questionnaires.** App Store privacy labels: Identifiers → User ID
  (linked to the user, not used for tracking); User Content → Other User
  Content. Google Play Data safety: User IDs, Other user-generated content.
  Declare that the data can be deleted by the user.
- **Set the two build variables** (above) in Codemagic only when you are ready
  for guilds to go live in that release.

Known limits:

- **Losing the account**: the anonymous account lives in the app's storage.
  A reinstall or a new phone starts without it, so the player is no longer in
  their guild (they can rejoin with the code). A recovery option (Sign in with
  Apple, etc.) can come later; if any third-party login is added, Apple
  requires Sign in with Apple to be offered too.
- **Cheating**: contributions and the chest are reported by the app, so a
  modified client could inflate them. The server caps the rate, which is
  enough for a casual cooperative feature; do not attach anything purchased
  or competitive to it.
