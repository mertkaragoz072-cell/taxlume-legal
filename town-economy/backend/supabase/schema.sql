-- Golden Town guilds: Supabase (Postgres) schema.
--
-- STATUS: written and reviewed, but NOT yet applied to any project and not
-- run against a live database. Apply it to a fresh Supabase project (see
-- ../README.md) and run the checklist there before shipping.
--
-- Design: the game never reads or writes these tables directly. Row Level
-- Security is on with no policies, so the public anon key can reach nothing;
-- every operation goes through the SECURITY DEFINER functions below, which
-- act on auth.uid() (an anonymous Supabase user created on first launch).

-- ---------------------------------------------------------------- tables

create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 24),
  rank_index   int  not null default 0 check (rank_index between 0 and 1000),
  net_worth    double precision not null default 0 check (net_worth >= 0),
  updated_at   timestamptz not null default now()
);

create table if not exists guilds (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (char_length(name) between 3 and 20 and name !~ '[^[:alnum:] ]'),
  name_key           text generated always as (lower(name)) stored unique,
  code               text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  owner_id           uuid not null references auth.users(id),
  total_contribution bigint not null default 0,
  created_at         timestamptz not null default now()
);

-- One row per player: a player can be in at most one guild.
create table if not exists guild_members (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  guild_id       uuid not null references guilds(id) on delete cascade,
  joined_at      timestamptz not null default now(),
  last_report_at timestamptz
);
create index if not exists guild_members_guild_idx on guild_members(guild_id);

create table if not exists guild_week_contrib (
  guild_id   uuid not null references guilds(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  trades     int  not null default 0,
  claimed    boolean not null default false,
  primary key (guild_id, user_id, week_start)
);

create table if not exists guild_cheers (
  id         bigserial primary key,
  guild_id   uuid not null references guilds(id) on delete cascade,
  from_user  uuid not null references auth.users(id) on delete cascade,
  to_user    uuid not null references auth.users(id) on delete cascade,
  emote      text not null,
  created_at timestamptz not null default now()
);
create index if not exists guild_cheers_guild_idx on guild_cheers(guild_id, created_at desc);
-- Five emoji and five fixed phrases (the game shows the phrases in the player's
-- language). Rewritten as a named constraint so it can be widened later.
alter table guild_cheers drop constraint if exists guild_cheers_emote_check;
alter table guild_cheers add constraint guild_cheers_emote_check
  check (emote in ('👏','🎉','💪','🔥','❤️','hi','thanks','help','gg','wait'));

-- Reports on guild names (App Store rule 1.2: user-generated content needs a
-- way to report it). The game has no report button yet; see README.
create table if not exists guild_reports (
  id         bigserial primary key,
  guild_id   uuid not null references guilds(id) on delete cascade,
  reporter   uuid not null references auth.users(id) on delete cascade,
  reason     text not null check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------- guild trade (orders, market)
-- Goods move between friends: a weekly guild order everybody donates to, and a
-- small market where a member asks for a good and others send it.

alter table guild_week_contrib add column if not exists donated int not null default 0;       -- units given to the weekly order
alter table guild_week_contrib add column if not exists gifted int not null default 0;        -- units sent to friends' requests
alter table guild_week_contrib add column if not exists order_claimed boolean not null default false;

create table if not exists guild_week_order (
  guild_id   uuid not null references guilds(id) on delete cascade,
  week_start date not null,
  good_id    text not null check (good_id in ('grain','wool','sand','bread','milk','wood','iron','cloth','fish','wine','leather','spice','silk','jewelry','honey','cheese','paper','glass')),
  primary key (guild_id, week_start)
);

create table if not exists guild_requests (
  id         bigserial primary key,
  guild_id   uuid not null references guilds(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  good_id    text not null check (good_id in ('grain','wool','sand','bread','milk','wood','iron','cloth','fish','wine','leather','spice','silk','jewelry','honey','cheese','paper','glass')),
  qty        int  not null check (qty between 1 and 50),
  filled     int  not null default 0 check (filled between 0 and 50),
  closed     boolean not null default false,
  created_at timestamptz not null default now()
);
-- one open request per player
create unique index if not exists guild_requests_one_open on guild_requests(user_id) where not closed;
create index if not exists guild_requests_guild_idx on guild_requests(guild_id) where not closed;

-- Goods on their way to a player; the receiving app collects them with claim_deliveries.
create table if not exists guild_deliveries (
  id         bigserial primary key,
  to_user    uuid not null references auth.users(id) on delete cascade,
  from_name  text not null,
  good_id    text not null,
  qty        int  not null check (qty > 0),
  claimed    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists guild_deliveries_to_idx on guild_deliveries(to_user) where not claimed;

alter table guild_week_order enable row level security;
alter table guild_requests   enable row level security;
alter table guild_deliveries enable row level security;

-- ------------------------------------------- guild fun (feed, duels, draw, hall)

alter table guild_members add column if not exists cash_given bigint not null default 0;   -- coins given to the guild hall
alter table guilds add column if not exists project_progress bigint not null default 0;    -- coins towards the next hall project

-- What happened in the guild lately. Rows tied to a player disappear with the
-- player's account (on delete cascade), like everything else about them.
create table if not exists guild_feed (
  id         bigserial primary key,
  guild_id   uuid not null references guilds(id) on delete cascade,
  actor_id   uuid references auth.users(id) on delete cascade,
  actor_name text not null default '',
  kind       text not null check (kind in ('joined','goal_done','order_done','duel_won','project_done','big_draw')),
  detail     text,
  created_at timestamptz not null default now()
);
create index if not exists guild_feed_guild_idx on guild_feed(guild_id, created_at desc);

-- Friendly duels: two members, 24 hours, most trades wins.
create table if not exists guild_duels (
  id         bigserial primary key,
  guild_id   uuid not null references guilds(id) on delete cascade,
  challenger uuid not null references auth.users(id) on delete cascade,
  opponent   uuid not null references auth.users(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','active','done','declined')),
  created_at timestamptz not null default now(),
  ends_at    timestamptz,
  c_trades   int not null default 0,
  o_trades   int not null default 0,
  winner     uuid references auth.users(id) on delete set null,
  claimed    boolean not null default false
);
create index if not exists guild_duels_guild_idx on guild_duels(guild_id, id desc);

-- One free draw per player per day (UTC).
create table if not exists guild_draws (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null,
  tier    int  not null check (tier between 1 and 3),
  primary key (user_id, day)
);

-- Hall projects the guild has built, in order.
create table if not exists guild_projects (
  guild_id uuid not null references guilds(id) on delete cascade,
  idx      int  not null check (idx between 1 and 6),
  built_at timestamptz not null default now(),
  primary key (guild_id, idx)
);

-- Reports on a guild listed in the weekly ranking (any player may report it).
alter table guild_reports drop constraint if exists guild_reports_reporter_fkey;
alter table guild_reports add constraint guild_reports_reporter_fkey foreign key (reporter) references auth.users(id) on delete cascade;

alter table guild_feed     enable row level security;
alter table guild_duels    enable row level security;
alter table guild_draws    enable row level security;
alter table guild_projects enable row level security;

alter table profiles           enable row level security;
alter table guilds             enable row level security;
alter table guild_members      enable row level security;
alter table guild_week_contrib enable row level security;
alter table guild_cheers       enable row level security;
alter table guild_reports      enable row level security;
-- (no policies on purpose: only the functions below touch the tables)

-- ------------------------------------------------------------- constants

create or replace function guild_max_members() returns int language sql immutable as $$ select 20 $$;
create or replace function guild_goal_per_member() returns int language sql immutable as $$ select 120 $$;
-- Monday 00:00 UTC of the running week
create or replace function guild_week_start() returns date language sql stable as $$
  select date_trunc('week', now() at time zone 'utc')::date
$$;

-- ------------------------------------------------------------- functions
-- Errors are raised with a bare code as the message (not_found, full, ...);
-- the game maps those to its own texts.

create or replace function sync_profile(p_name text, p_rank int, p_net_worth double precision)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'network'; end if;
  insert into profiles(id, display_name, rank_index, net_worth, updated_at)
  values (auth.uid(), left(coalesce(nullif(trim(p_name), ''), 'Player'), 24),
          greatest(0, least(coalesce(p_rank, 0), 1000)), greatest(0, coalesce(p_net_worth, 0)), now())
  on conflict (id) do update
    set display_name = excluded.display_name, rank_index = excluded.rank_index,
        net_worth = excluded.net_worth, updated_at = now();
end $$;

create or replace function create_guild(p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_name text := regexp_replace(trim(p_name), '\s+', ' ', 'g');
  v_code text;
  v_id   uuid;
begin
  if auth.uid() is null then raise exception 'network'; end if;
  if exists (select 1 from guild_members where user_id = auth.uid()) then raise exception 'already_in_guild'; end if;
  if char_length(v_name) not between 3 and 20 or v_name ~ '[^[:alnum:] ]' then raise exception 'name_invalid'; end if;
  if exists (select 1 from guilds where name_key = lower(v_name)) then raise exception 'name_taken'; end if;
  loop
    -- 6 hex characters (0-9, A-F): no look-alike letters, and gen_random_uuid() is core Postgres
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from guilds where code = v_code);
  end loop;
  insert into guilds(name, code, owner_id) values (v_name, v_code, auth.uid()) returning id into v_id;
  insert into guild_members(user_id, guild_id) values (auth.uid(), v_id);
end $$;

create or replace function join_guild(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'network'; end if;
  if exists (select 1 from guild_members where user_id = auth.uid()) then raise exception 'already_in_guild'; end if;
  select id into v_id from guilds where code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if v_id is null then raise exception 'not_found'; end if;
  -- lock the guild row so two people cannot take the last seat together
  perform 1 from guilds where id = v_id for update;
  if (select count(*) from guild_members where guild_id = v_id) >= guild_max_members() then raise exception 'full'; end if;
  insert into guild_members(user_id, guild_id) values (auth.uid(), v_id);
  perform guild_log(v_id, auth.uid(), 'joined');
end $$;

-- Leaving a guild deletes everything the server holds about the player: the
-- anonymous account itself, their profile, contributions and cheers (all of
-- it cascades from auth.users). The app then starts a brand-new anonymous
-- account the next time the player makes or joins a guild.
create or replace function leave_guild() returns void
language plpgsql security definer set search_path = public as $$
declare v_guild uuid; v_next uuid;
begin
  select guild_id into v_guild from guild_members where user_id = auth.uid();
  if v_guild is null then raise exception 'not_in_guild'; end if;
  delete from guild_members where user_id = auth.uid();
  select user_id into v_next from guild_members where guild_id = v_guild order by joined_at limit 1;
  if v_next is null then
    delete from guilds where id = v_guild;                     -- last one out closes it
  else
    update guilds set owner_id = v_next where id = v_guild and owner_id = auth.uid();
  end if;
  delete from auth.users where id = auth.uid();
end $$;

-- Adds finished trades to this week's goal. Guarded against inflated numbers:
-- at most 200 trades per call and one call per 20 seconds per player.
create or replace function report_contribution(p_trades int) returns void
language plpgsql security definer set search_path = public as $$
declare v_guild uuid; v_last timestamptz; v_add int := greatest(0, least(coalesce(p_trades, 0), 200));
  v_members int; v_before bigint; v_goal bigint;
begin
  select guild_id, last_report_at into v_guild, v_last from guild_members where user_id = auth.uid();
  if v_guild is null then raise exception 'not_in_guild'; end if;
  if v_add = 0 then return; end if;
  if v_last is not null and now() - v_last < interval '20 seconds' then return; end if;
  update guild_members set last_report_at = now() where user_id = auth.uid();
  select coalesce(sum(trades), 0) into v_before from guild_week_contrib where guild_id = v_guild and week_start = guild_week_start();
  insert into guild_week_contrib(guild_id, user_id, week_start, trades)
  values (v_guild, auth.uid(), guild_week_start(), v_add)
  on conflict (guild_id, user_id, week_start) do update set trades = guild_week_contrib.trades + v_add;
  update guilds set total_contribution = total_contribution + v_add where id = v_guild;
  -- trades also count for an active duel this player is in
  update guild_duels set c_trades = c_trades + v_add where status = 'active' and challenger = auth.uid() and ends_at > now();
  update guild_duels set o_trades = o_trades + v_add where status = 'active' and opponent = auth.uid() and ends_at > now();
  -- tell the guild the moment its weekly goal is reached
  select count(*) into v_members from guild_members where guild_id = v_guild;
  v_goal := guild_goal_per_member() * greatest(1, v_members);
  if v_before < v_goal and v_before + v_add >= v_goal then perform guild_log(v_guild, null, 'goal_done'); end if;
end $$;

create or replace function send_cheer(p_to uuid, p_emote text) returns void
language plpgsql security definer set search_path = public as $$
declare v_guild uuid;
begin
  select guild_id into v_guild from guild_members where user_id = auth.uid();
  if v_guild is null then raise exception 'not_in_guild'; end if;
  if p_to = auth.uid() or not exists (select 1 from guild_members where user_id = p_to and guild_id = v_guild) then return; end if;
  if exists (select 1 from guild_cheers where from_user = auth.uid() and created_at > now() - interval '5 seconds') then return; end if;
  insert into guild_cheers(guild_id, from_user, to_user, emote) values (v_guild, auth.uid(), p_to, p_emote);
end $$;

-- True only for the call that actually takes this week's chest.
create or replace function claim_weekly_reward() returns boolean
language plpgsql security definer set search_path = public as $$
declare v_guild uuid; v_members int; v_progress bigint; v_done boolean;
begin
  select guild_id into v_guild from guild_members where user_id = auth.uid();
  if v_guild is null then raise exception 'not_in_guild'; end if;
  select count(*) into v_members from guild_members where guild_id = v_guild;
  select coalesce(sum(trades), 0) into v_progress from guild_week_contrib
    where guild_id = v_guild and week_start = guild_week_start();
  if v_progress < guild_goal_per_member() * greatest(1, v_members) then return false; end if;
  insert into guild_week_contrib(guild_id, user_id, week_start, trades, claimed)
  values (v_guild, auth.uid(), guild_week_start(), 0, true)
  on conflict (guild_id, user_id, week_start) do update set claimed = true
    where guild_week_contrib.claimed = false
  returning true into v_done;
  return coalesce(v_done, false);
end $$;

create or replace function report_guild(p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_guild uuid;
begin
  select guild_id into v_guild from guild_members where user_id = auth.uid();
  if v_guild is null then raise exception 'not_in_guild'; end if;
  insert into guild_reports(guild_id, reporter, reason) values (v_guild, auth.uid(), left(coalesce(p_reason, ''), 200));
end $$;

-- ------------------------------------------------------ trade functions

create or replace function guild_order_units_per_member() returns int language sql immutable as $$ select 40 $$;

-- This week's order for a guild, created on first look: one of the goods
-- every town can make, picked by a hash so each guild and week differs.
create or replace function ensure_week_order(p_guild uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  -- everyday goods only: cheap, and available to every town from day one
  v_goods text[] := array['grain','wool','sand','bread','milk','wood','iron','cloth','fish'];
  v_good text;
begin
  insert into guild_week_order(guild_id, week_start, good_id)
  values (p_guild, guild_week_start(),
          v_goods[1 + (abs(hashtext(p_guild::text || guild_week_start()::text)) % array_length(v_goods, 1))])
  on conflict (guild_id, week_start) do nothing;
  select good_id into v_good from guild_week_order where guild_id = p_guild and week_start = guild_week_start();
  return v_good;
end $$;

-- Gives goods to the weekly order. Returns how many were accepted (never more
-- than the order still needs); the app removes exactly that many from the player.
create or replace function donate_to_order(p_qty int) returns int
language plpgsql security definer set search_path = public as $$
declare v_guild uuid; v_members int; v_progress bigint; v_target bigint; v_take int;
begin
  select guild_id into v_guild from guild_members where user_id = auth.uid();
  if v_guild is null then raise exception 'not_in_guild'; end if;
  perform ensure_week_order(v_guild);
  select count(*) into v_members from guild_members where guild_id = v_guild;
  select coalesce(sum(donated), 0) into v_progress from guild_week_contrib where guild_id = v_guild and week_start = guild_week_start();
  v_target := guild_order_units_per_member() * greatest(1, v_members);
  v_take := greatest(0, least(greatest(0, coalesce(p_qty, 0)), 200, v_target - v_progress));
  if v_take = 0 then return 0; end if;
  insert into guild_week_contrib(guild_id, user_id, week_start, donated)
  values (v_guild, auth.uid(), guild_week_start(), v_take)
  on conflict (guild_id, user_id, week_start) do update set donated = guild_week_contrib.donated + v_take;
  update guilds set total_contribution = total_contribution + v_take where id = v_guild;   -- goods count towards the guild's level too
  if v_progress < v_target and v_progress + v_take >= v_target then perform guild_log(v_guild, null, 'order_done'); end if;
  return v_take;
end $$;

-- True only for the call that takes this week's order chest: the order must be
-- complete and the player must have given something to it.
create or replace function claim_order_reward() returns boolean
language plpgsql security definer set search_path = public as $$
declare v_guild uuid; v_members int; v_progress bigint; v_mine int; v_done boolean;
begin
  select guild_id into v_guild from guild_members where user_id = auth.uid();
  if v_guild is null then raise exception 'not_in_guild'; end if;
  select count(*) into v_members from guild_members where guild_id = v_guild;
  select coalesce(sum(donated), 0) into v_progress from guild_week_contrib where guild_id = v_guild and week_start = guild_week_start();
  select coalesce(donated, 0) into v_mine from guild_week_contrib
    where guild_id = v_guild and user_id = auth.uid() and week_start = guild_week_start();
  if v_progress < guild_order_units_per_member() * greatest(1, v_members) or coalesce(v_mine, 0) < 1 then return false; end if;
  update guild_week_contrib set order_claimed = true
    where guild_id = v_guild and user_id = auth.uid() and week_start = guild_week_start() and not order_claimed
    returning true into v_done;
  return coalesce(v_done, false);
end $$;

create or replace function create_request(p_good text, p_qty int) returns void
language plpgsql security definer set search_path = public as $$
declare v_guild uuid;
begin
  select guild_id into v_guild from guild_members where user_id = auth.uid();
  if v_guild is null then raise exception 'not_in_guild'; end if;
  if p_good is null or p_good not in ('grain','wool','sand','bread','milk','wood','iron','cloth','fish','wine','leather','spice','silk','jewelry','honey','cheese','paper','glass') or p_qty is null or p_qty not between 1 and 50 then
    raise exception 'request_invalid';
  end if;
  if exists (select 1 from guild_requests where user_id = auth.uid() and not closed) then raise exception 'request_open'; end if;
  insert into guild_requests(guild_id, user_id, good_id, qty) values (v_guild, auth.uid(), p_good, p_qty);
end $$;

create or replace function cancel_request() returns void
language plpgsql security definer set search_path = public as $$
begin
  update guild_requests set closed = true where user_id = auth.uid() and not closed;
end $$;

-- Sends goods to a friend's request. Returns how many were accepted (at most
-- what the request still needs); the app removes exactly that many from the
-- sender. The goods wait in guild_deliveries until the friend's app collects them.
create or replace function fulfill_request(p_request bigint, p_qty int) returns int
language plpgsql security definer set search_path = public as $$
declare v_guild uuid; r guild_requests; v_take int; v_name text;
begin
  select guild_id into v_guild from guild_members where user_id = auth.uid();
  if v_guild is null then raise exception 'not_in_guild'; end if;
  select * into r from guild_requests where id = p_request and guild_id = v_guild and not closed for update;
  if r.id is null then raise exception 'request_gone'; end if;
  if r.user_id = auth.uid() then raise exception 'own_request'; end if;
  v_take := greatest(0, least(greatest(0, coalesce(p_qty, 0)), 50, r.qty - r.filled));
  if v_take = 0 then return 0; end if;
  select coalesce(display_name, 'Player') into v_name from profiles where id = auth.uid();
  update guild_requests set filled = filled + v_take, closed = (filled + v_take >= qty) where id = r.id;
  insert into guild_deliveries(to_user, from_name, good_id, qty) values (r.user_id, coalesce(v_name, 'Player'), r.good_id, v_take);
  insert into guild_week_contrib(guild_id, user_id, week_start, gifted)
  values (v_guild, auth.uid(), guild_week_start(), v_take)
  on conflict (guild_id, user_id, week_start) do update set gifted = guild_week_contrib.gifted + v_take;
  update guilds set total_contribution = total_contribution + v_take where id = v_guild;
  return v_take;
end $$;

-- Hands over goods that friends sent, oldest first, as many whole deliveries
-- as fit in p_room units of storage; the rest stay waiting.
create or replace function claim_deliveries(p_room int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d guild_deliveries; v_left int := greatest(0, coalesce(p_room, 0)); v_out jsonb := '[]'::jsonb;
begin
  for d in select * from guild_deliveries where to_user = auth.uid() and not claimed order by id for update loop
    exit when d.qty > v_left;
    update guild_deliveries set claimed = true where id = d.id;
    v_left := v_left - d.qty;
    v_out := v_out || jsonb_build_object('goodId', d.good_id, 'qty', d.qty, 'fromName', d.from_name);
  end loop;
  return v_out;
end $$;

-- ------------------------------------------------------- fun functions

create or replace function guild_log(p_guild uuid, p_actor uuid, p_kind text, p_detail text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select coalesce(display_name, '') into v_name from profiles where id = p_actor;
  insert into guild_feed(guild_id, actor_id, actor_name, kind, detail) values (p_guild, p_actor, coalesce(v_name, ''), p_kind, p_detail);
end $$;

-- Hall project costs, in coins, for projects 1..6.
create or replace function guild_project_cost(p_idx int) returns bigint language sql immutable as $$
  select (array[5000, 25000, 100000, 400000, 1500000, 6000000])[p_idx]::bigint
$$;

-- Closes duels whose 24 hours are up and lets unanswered challenges lapse.
create or replace function settle_duels(p_guild uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d guild_duels; v_win uuid;
begin
  update guild_duels set status = 'declined' where guild_id = p_guild and status = 'pending' and created_at < now() - interval '24 hours';
  for d in select * from guild_duels where guild_id = p_guild and status = 'active' and ends_at <= now() for update loop
    v_win := case when d.c_trades > d.o_trades then d.challenger when d.o_trades > d.c_trades then d.opponent else null end;
    update guild_duels set status = 'done', winner = v_win where id = d.id;
    if v_win is not null then perform guild_log(p_guild, v_win, 'duel_won'); end if;
  end loop;
end $$;

create or replace function challenge_duel(p_opponent uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_guild uuid;
begin
  select guild_id into v_guild from guild_members where user_id = auth.uid();
  if v_guild is null then raise exception 'not_in_guild'; end if;
  perform settle_duels(v_guild);
  if p_opponent is null or p_opponent = auth.uid()
     or not exists (select 1 from guild_members where user_id = p_opponent and guild_id = v_guild) then
    raise exception 'duel_invalid';
  end if;
  if exists (select 1 from guild_duels where status in ('pending', 'active')
             and (challenger in (auth.uid(), p_opponent) or opponent in (auth.uid(), p_opponent))) then
    raise exception 'duel_busy';
  end if;
  insert into guild_duels(guild_id, challenger, opponent) values (v_guild, auth.uid(), p_opponent);
end $$;

-- The challenged player accepts (the 24 hours start now) or declines; the
-- challenger can withdraw a challenge nobody has answered yet.
create or replace function respond_duel(p_id bigint, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare d guild_duels;
begin
  select * into d from guild_duels where id = p_id and status = 'pending'
    and (opponent = auth.uid() or challenger = auth.uid()) for update;
  if d.id is null then raise exception 'duel_gone'; end if;
  if d.challenger = auth.uid() and p_accept then raise exception 'duel_invalid'; end if;   -- you cannot accept your own challenge
  if d.opponent = auth.uid() and p_accept then
    update guild_duels set status = 'active', ends_at = now() + interval '24 hours' where id = d.id;
  else
    update guild_duels set status = 'declined' where id = d.id;
  end if;
end $$;

-- True only for the call that takes the winner's prize.
create or replace function claim_duel_reward(p_id bigint) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_done boolean;
begin
  update guild_duels set claimed = true where id = p_id and status = 'done' and winner = auth.uid() and not claimed
    returning true into v_done;
  return coalesce(v_done, false);
end $$;

-- One draw a day. Returns the prize tier (1 small 60%, 2 medium 30%, 3 big 10%);
-- the app turns the tier into coins. A big one is announced to the guild.
create or replace function daily_draw() returns int
language plpgsql security definer set search_path = public as $$
declare v_guild uuid; v_roll double precision := random(); v_tier int;
begin
  select guild_id into v_guild from guild_members where user_id = auth.uid();
  if v_guild is null then raise exception 'not_in_guild'; end if;
  if exists (select 1 from guild_draws where user_id = auth.uid() and day = (now() at time zone 'utc')::date) then
    raise exception 'already_drawn';
  end if;
  v_tier := case when v_roll < 0.6 then 1 when v_roll < 0.9 then 2 else 3 end;
  insert into guild_draws(user_id, day, tier) values (auth.uid(), (now() at time zone 'utc')::date, v_tier);
  if v_tier = 3 then perform guild_log(v_guild, auth.uid(), 'big_draw'); end if;
  return v_tier;
end $$;

-- Gives coins to the guild hall. Returns how many were accepted (never more
-- than the current project still needs); the app removes exactly that many
-- coins from the player. A finished project is built and the next one starts.
create or replace function donate_cash(p_amount bigint) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_guild uuid; v_built int; v_idx int; v_cost bigint; v_progress bigint; v_take bigint;
begin
  select guild_id into v_guild from guild_members where user_id = auth.uid();
  if v_guild is null then raise exception 'not_in_guild'; end if;
  select project_progress into v_progress from guilds where id = v_guild for update;
  select count(*) into v_built from guild_projects where guild_id = v_guild;
  v_idx := v_built + 1;
  if v_idx > 6 then return 0; end if;
  v_cost := guild_project_cost(v_idx);
  v_take := greatest(0, least(greatest(0, coalesce(p_amount, 0)), 5000000, v_cost - v_progress));
  if v_take = 0 then return 0; end if;
  update guild_members set cash_given = cash_given + v_take where user_id = auth.uid();
  if v_progress + v_take >= v_cost then
    insert into guild_projects(guild_id, idx) values (v_guild, v_idx);
    update guilds set project_progress = 0 where id = v_guild;
    perform guild_log(v_guild, auth.uid(), 'project_done', v_idx::text);
  else
    update guilds set project_progress = project_progress + v_take where id = v_guild;
  end if;
  return v_take;
end $$;

-- The ten most active guilds this week (trades + order units + gifts), plus
-- the player's own guild if it is not among them.
create or replace function top_guilds() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_mine uuid;
begin
  select guild_id into v_mine from guild_members where user_id = auth.uid();
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'totalContribution', t.total_contribution,
             'members', t.members, 'score', t.score, 'isMine', t.id = v_mine) order by t.score desc, t.created_at)
    from (
      select g.id, g.name, g.total_contribution, g.created_at,
             (select count(*) from guild_members m where m.guild_id = g.id) as members,
             coalesce((select sum(w.trades + w.donated + w.gifted) from guild_week_contrib w
                       where w.guild_id = g.id and w.week_start = guild_week_start()), 0) as score
      from guilds g
      order by 6 desc, g.created_at
      limit 10
    ) t where t.score > 0 or t.id = v_mine), '[]'::jsonb);
end $$;

-- Any player can report a guild they see in the ranking.
create or replace function report_guild_id(p_guild uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from guilds where id = p_guild) then raise exception 'not_found'; end if;
  if exists (select 1 from guild_reports where reporter = auth.uid() and guild_id = p_guild and created_at > now() - interval '1 hour') then return; end if;
  insert into guild_reports(guild_id, reporter, reason) values (p_guild, auth.uid(), left(coalesce(p_reason, ''), 200));
end $$;

-- Everything the guild screen shows, in one call; the keys match GuildInfo in
-- src/guild/types.ts so the adapter can hand it straight through.
create or replace function get_my_guild() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_guild guilds; v_week date := guild_week_start(); v_members int; v_progress bigint; v_claimed boolean;
  v_order_good text; v_order_progress bigint; v_mine int; v_order_claimed boolean;
  v_streak int := 0; v_w date; v_ok boolean; v_built int; v_drawn boolean;
begin
  select g.* into v_guild from guilds g join guild_members m on m.guild_id = g.id where m.user_id = auth.uid();
  if v_guild.id is null then return null; end if;
  perform settle_duels(v_guild.id);
  select count(*) into v_built from guild_projects where guild_id = v_guild.id;
  select exists (select 1 from guild_draws where user_id = auth.uid() and day = (now() at time zone 'utc')::date) into v_drawn;
  select count(*) into v_members from guild_members where guild_id = v_guild.id;
  select coalesce(sum(trades), 0) into v_progress from guild_week_contrib where guild_id = v_guild.id and week_start = v_week;
  select coalesce(bool_or(claimed), false) into v_claimed from guild_week_contrib
    where guild_id = v_guild.id and week_start = v_week and user_id = auth.uid();
  -- Weeks in a row (before this one) the guild reached its trade goal. Uses
  -- today's member count for every week, and stops at twelve.
  v_w := v_week - 7;
  while v_streak < 12 loop
    select coalesce(sum(trades), 0) >= guild_goal_per_member() * greatest(1, v_members) into v_ok
      from guild_week_contrib where guild_id = v_guild.id and week_start = v_w;
    exit when not v_ok;
    v_streak := v_streak + 1;
    v_w := v_w - 7;
  end loop;
  v_order_good := ensure_week_order(v_guild.id);
  select coalesce(sum(donated), 0) into v_order_progress from guild_week_contrib where guild_id = v_guild.id and week_start = v_week;
  select coalesce(donated, 0), coalesce(order_claimed, false) into v_mine, v_order_claimed from guild_week_contrib
    where guild_id = v_guild.id and user_id = auth.uid() and week_start = v_week;
  return jsonb_build_object(
    'drawnToday', v_drawn,
    'projects', jsonb_build_object('built', v_built, 'progress', v_guild.project_progress),
    'feed', coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id::text, 'kind', f.kind, 'actorName', f.actor_name,
               'detail', f.detail, 'at', (extract(epoch from f.created_at) * 1000)::bigint) order by f.id desc)
      from (select * from guild_feed where guild_id = v_guild.id order by id desc limit 12) f), '[]'::jsonb),
    'duels', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id::text, 'status', d.status,
               'challengerId', d.challenger, 'challengerName', coalesce(pc.display_name, 'Player'),
               'opponentId', d.opponent, 'opponentName', coalesce(po.display_name, 'Player'),
               'endsAt', case when d.ends_at is null then null else (extract(epoch from d.ends_at) * 1000)::bigint end,
               'cTrades', d.c_trades, 'oTrades', d.o_trades, 'winnerId', d.winner,
               'canClaim', d.winner = auth.uid() and not d.claimed) order by d.id desc)
      from (select * from guild_duels
            where guild_id = v_guild.id and (challenger = auth.uid() or opponent = auth.uid())
              and (status in ('pending', 'active') or (status = 'done' and ends_at > now() - interval '3 days'))
            order by id desc limit 5) d
      left join profiles pc on pc.id = d.challenger
      left join profiles po on po.id = d.opponent), '[]'::jsonb),
    'streak', v_streak,
    'myTotals', (select jsonb_build_object('trades', coalesce(sum(trades), 0), 'donated', coalesce(sum(donated), 0),
                   'gifted', coalesce(sum(gifted), 0)) from guild_week_contrib where guild_id = v_guild.id and user_id = auth.uid()),
    'order', jsonb_build_object('goodId', v_order_good,
      'target', guild_order_units_per_member() * greatest(1, v_members),
      'progress', v_order_progress, 'myDonated', coalesce(v_mine, 0), 'rewardClaimed', coalesce(v_order_claimed, false)),
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id::text, 'fromId', q.user_id, 'fromName', coalesce(p.display_name, 'Player'),
        'goodId', q.good_id, 'qty', q.qty, 'filled', q.filled, 'isMine', q.user_id = auth.uid())
        order by (q.user_id = auth.uid()) desc, q.created_at)
      from guild_requests q left join profiles p on p.id = q.user_id
      where q.guild_id = v_guild.id and not q.closed and q.created_at > now() - interval '7 days'), '[]'::jsonb),
    'id', v_guild.id, 'name', v_guild.name, 'code', v_guild.code,
    'memberCount', v_members,
    'weekStart', (extract(epoch from v_week::timestamp at time zone 'utc') * 1000)::bigint,
    'goalTarget', guild_goal_per_member() * greatest(1, v_members),
    'goalProgress', v_progress, 'rewardClaimed', v_claimed,
    'totalContribution', v_guild.total_contribution,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.user_id, 'name', coalesce(p.display_name, 'Player'),
        'rankIndex', coalesce(p.rank_index, 0), 'netWorth', coalesce(p.net_worth, 0),
        'weekContribution', coalesce(w.trades, 0),
        'donated', coalesce(w.donated, 0), 'gifted', coalesce(w.gifted, 0), 'cashGiven', m.cash_given,
        'isOwner', m.user_id = v_guild.owner_id, 'isYou', m.user_id = auth.uid())
        order by coalesce(w.trades, 0) desc, m.joined_at)
      from guild_members m
      left join profiles p on p.id = m.user_id
      left join guild_week_contrib w on w.guild_id = m.guild_id and w.user_id = m.user_id and w.week_start = v_week
      where m.guild_id = v_guild.id), '[]'::jsonb),
    'cheers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id::text, 'fromName', coalesce(p.display_name, 'Player'), 'emote', c.emote,
        'at', (extract(epoch from c.created_at) * 1000)::bigint, 'toYou', c.to_user = auth.uid())
        order by c.created_at desc)
      from (select * from guild_cheers where guild_id = v_guild.id order by created_at desc limit 8) c
      left join profiles p on p.id = c.from_user), '[]'::jsonb)
  );
end $$;

-- The anon key may call the functions (as the signed-in anonymous user) and
-- nothing else.
revoke all on all functions in schema public from public;
grant execute on function
  sync_profile(text, int, double precision), create_guild(text), join_guild(text), leave_guild(),
  report_contribution(int), send_cheer(uuid, text), claim_weekly_reward(), report_guild(text), get_my_guild(),
  donate_to_order(int), claim_order_reward(), create_request(text, int), cancel_request(),
  fulfill_request(bigint, int), claim_deliveries(int),
  challenge_duel(uuid), respond_duel(bigint, boolean), claim_duel_reward(bigint), daily_draw(),
  donate_cash(bigint), top_guilds(), report_guild_id(uuid, text)
  to authenticated;
