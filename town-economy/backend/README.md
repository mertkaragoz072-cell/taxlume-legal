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

Fun (feed, duels, draw, hall, ranking):

| Function                          | Does                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `guild_log` / `guild_feed`        | the guild's activity feed: joined, goal reached, order complete, duel won, hall building finished, big draw prize                     |
| `challenge_duel` / `respond_duel` | a member dares another to a 24-hour trading duel; the challenged accepts or declines, the challenger can withdraw; one duel at a time |
| `claim_duel_reward`               | the winner's prize, once                                                                                                              |
| `settle_duels`                    | (internal) ends duels whose 24 hours are up and lets unanswered challenges lapse after a day                                          |
| `daily_draw`                      | one draw per player per UTC day; returns a tier (1 small 60%, 2 medium 30%, 3 big 10%); big ones are announced                        |
| `donate_cash`                     | coins to the guild hall (six buildings in order, costs in `guild_project_cost`); returns how many were accepted                       |
| `top_guilds` / `report_guild_id`  | the week's ten most active guilds (trades + order units + gifts), and a report on any listed guild                                    |

Caravan:

| Function          | Does                                                                                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start_caravan`   | any member starts the guild's caravan to Windyhill (2 h), Ironforge (3 h), Portcity (4 h) or Grand Bazaar (6 h); one at a time; room for 30 goods per member (max 600)                               |
| `load_caravan`    | puts goods on it from the member's own stock; returns how many were accepted (never more than fit)                                                                                                   |
| `send_caravan`    | sends it (needs at least one unit loaded); the prize tier is rolled now and stays secret until it arrives                                                                                            |
| `claim_caravan`   | after arrival, each loader collects their own share once: destination, tier and exactly what they loaded; the app turns it into coins at current prices (value x 1.3 / 1.6 / 2.2 x the town's bonus) |
| `settle_caravans` | (internal) lands caravans whose trip is over and tells the guild                                                                                                                                     |

Building bonuses (storage and output for every member's town) and the draw/duel prize sizes live in the app (`src/economy/guildPerks.ts`, `src/guild/types.ts`, `src/guild/reward.ts`); the server only decides who gets what and how many times.

Perks, streaks and messages:

- **Guild level** comes from everything the guild has done together (trades, order units, gifts). From level 2 each member's town earns up to +0.5% output per level, capped at +5%; leaving the guild gives it up. The game stores only the level in the save (`guildLevel`, optional, no save-version bump).
- **Weekly streak**: `get_my_guild` counts the weeks in a row (before this one) the guild reached its trade goal, up to 12. Each streak week adds +10% to both weekly chests, up to +50%.
- **Messages** stay free of free text: `send_cheer` accepts five emoji and five fixed phrases (`hi`, `thanks`, `help`, `gg`, `wait`); the game shows the phrases in the player's language.
- **Badges** (Trader, Giver, Friend, Streak, Founder, Veteran) are worked out in the app from `myTotals`, `streak` and the guild level; nothing extra is stored.

Guild trade (goods moving between friends):

| Function                            | Does                                                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `donate_to_order`                   | gives goods to the weekly guild order (an everyday good picked per guild and week, 40 units per member); returns how many were accepted |
| `claim_order_reward`                | the order's chest: once per member per week, only if the order is complete and the member gave at least one unit                        |
| `create_request` / `cancel_request` | a member asks friends for up to 50 units of a good (one open request each)                                                              |
| `fulfill_request`                   | sends goods to a friend's request; returns how many were accepted. The goods wait in `guild_deliveries`                                 |
| `claim_deliveries`                  | the receiver's app collects waiting deliveries, as many whole deliveries as fit in its free storage                                     |

The app removes goods from the sender only **after** the server says how many it accepted, so a failed call never loses stock. Goods in transit
(a delivery the server has marked collected but the app never applied, e.g. a crash in that instant) can be lost; that is accepted for a casual feature.

The weekly goal is 120 trades per member, resetting every Monday 00:00 UTC.

## Setting it up

1. Create a Supabase project (free tier is enough to start).
2. Authentication → Providers: enable **Anonymous sign-ins**.
3. Apply the schema: `npm run backend:apply` (see "Updating the server" below), or paste `supabase/schema.sql` into the SQL editor.
4. Give the app the project URL and anon key as build-time variables:
   `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   (Codemagic: environment variables; locally: `.env`). The anon key is meant
   to be public; the functions are what protect the data.
5. Without these two variables the Guild card reads "coming soon" and no
   network call is ever made. `EXPO_PUBLIC_GUILD_MOCK=1` runs the on-device
   mock instead (development and screenshots only; never set it in a release).

## Updating the server

The schema is idempotent: every change to `supabase/schema.sql` is applied by running it again.

```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co SUPABASE_ACCESS_TOKEN=sbp_... npm run backend:apply
```

The access token is created under Supabase → Account → Access Tokens; give it
**Database read-write on this one project only** and a short expiry (30 days),
and revoke it when you are done. In a Claude cloud session whose environment
has a network secret for `api.supabase.com`, leave the token variable unset:
the proxy adds it and Claude never sees it.

`npm run backend:e2e` (same variables, plus `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
runs the guild server end to end as several anonymous players (orders, market,
deliveries, phrases, streaks, leaving deletes the account) and cleans up after
itself. Run it after every schema change.

## Checks to run against the real project before shipping

- Two phones/browsers: create a guild on one, join with the code on the other,
  both appear in each other's member list.
- A 21st player gets `full`; a wrong code gets `not_found`; a taken name gets `name_taken`.
- Reporting 1000 trades in one call adds only 200; two calls within 20 s add once.
- `claim_weekly_reward` returns `true` once per member per week, `false` after.
- Order: donating 500 units to a 200-unit order accepts only what is still needed; `claim_order_reward` is false before completion, false without a donation, true once, then false.
- Market: a second open request is refused (`request_open`); sending to your own request is refused (`own_request`); a delivery shows up once in `claim_deliveries`; a delivery larger than the free room waits.
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
