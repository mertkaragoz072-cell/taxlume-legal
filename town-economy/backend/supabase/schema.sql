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

create extension if not exists pgcrypto;

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
  emote      text not null check (emote in ('👏','🎉','💪','🔥','❤️')),
  created_at timestamptz not null default now()
);
create index if not exists guild_cheers_guild_idx on guild_cheers(guild_id, created_at desc);

-- Reports on guild names (App Store rule 1.2: user-generated content needs a
-- way to report it). The game has no report button yet; see README.
create table if not exists guild_reports (
  id         bigserial primary key,
  guild_id   uuid not null references guilds(id) on delete cascade,
  reporter   uuid not null references auth.users(id) on delete cascade,
  reason     text not null check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);

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
    v_code := upper(substr(translate(encode(gen_random_bytes(6), 'base64'), '+/=Il0O1', 'ABCDEFG'), 1, 6));
    exit when v_code ~ '^[A-Z0-9]{6}$' and not exists (select 1 from guilds where code = v_code);
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
end $$;

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
end $$;

-- Adds finished trades to this week's goal. Guarded against inflated numbers:
-- at most 200 trades per call and one call per 20 seconds per player.
create or replace function report_contribution(p_trades int) returns void
language plpgsql security definer set search_path = public as $$
declare v_guild uuid; v_last timestamptz; v_add int := greatest(0, least(coalesce(p_trades, 0), 200));
begin
  select guild_id, last_report_at into v_guild, v_last from guild_members where user_id = auth.uid();
  if v_guild is null then raise exception 'not_in_guild'; end if;
  if v_add = 0 then return; end if;
  if v_last is not null and now() - v_last < interval '20 seconds' then return; end if;
  update guild_members set last_report_at = now() where user_id = auth.uid();
  insert into guild_week_contrib(guild_id, user_id, week_start, trades)
  values (v_guild, auth.uid(), guild_week_start(), v_add)
  on conflict (guild_id, user_id, week_start) do update set trades = guild_week_contrib.trades + v_add;
  update guilds set total_contribution = total_contribution + v_add where id = v_guild;
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

-- Everything the guild screen shows, in one call; the keys match GuildInfo in
-- src/guild/types.ts so the adapter can hand it straight through.
create or replace function get_my_guild() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_guild guilds; v_week date := guild_week_start(); v_members int; v_progress bigint; v_claimed boolean;
begin
  select g.* into v_guild from guilds g join guild_members m on m.guild_id = g.id where m.user_id = auth.uid();
  if v_guild.id is null then return null; end if;
  select count(*) into v_members from guild_members where guild_id = v_guild.id;
  select coalesce(sum(trades), 0) into v_progress from guild_week_contrib where guild_id = v_guild.id and week_start = v_week;
  select coalesce(bool_or(claimed), false) into v_claimed from guild_week_contrib
    where guild_id = v_guild.id and week_start = v_week and user_id = auth.uid();
  return jsonb_build_object(
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
  report_contribution(int), send_cheer(uuid, text), claim_weekly_reward(), report_guild(text), get_my_guild()
  to authenticated;
