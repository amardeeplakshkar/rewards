-- =====================================================================================
-- Server-side scheduler for the rewards app (runs INSIDE Supabase Postgres via pg_cron).
--
-- Replaces the external cron job that hit Vercel every 15-30s:
--   POST /api/wingo/settle  -> public.rw_wingo_tick()   (every 5 seconds)
--   POST /api/cron/tick     -> public.rw_cron_tick()    (every minute)
--
-- Zero HTTP requests reach Vercel for scheduling. Run this whole file once in
-- Supabase Dashboard -> SQL Editor. Safe to re-run (everything is CREATE OR REPLACE /
-- unschedule-then-schedule). After running it, DELETE the external cron jobs.
-- =====================================================================================

create extension if not exists pg_cron;

-- ---------- helpers ------------------------------------------------------------------

-- Unbiased random digit 0-9 from a v4 UUID (gen_random_uuid is crypto-random, core PG13+).
create or replace function public.rw_random_digit() returns int
language plpgsql volatile as $$
declare b int;
begin
  loop
    b := get_byte(uuid_send(gen_random_uuid()), 0);
    if b < 250 then return b % 10; end if;   -- reject 250..255 to avoid modulo bias
  end loop;
end $$;

-- Mirrors payoutForBet() in src/wingo/logic.ts. Returns whole rupees.
create or replace function public.rw_wingo_payout(p_type text, p_sel text, p_stake numeric, n int)
returns numeric language plpgsql immutable as $$
declare
  mult numeric := 0;
  colors text[];
  sz text := case when n >= 5 then 'Big' else 'Small' end;
begin
  colors := case when n = 0 then array['Red','Violet']
                 when n = 5 then array['Green','Violet']
                 when n % 2 = 1 then array['Green']
                 else array['Red'] end;
  if p_type = 'number' then
    if p_sel ~ '^[0-9]$' and p_sel::int = n then mult := 9; end if;
  elsif p_type = 'color' then
    if p_sel = any(colors) then
      mult := case when p_sel = 'Violet' then 4.5 when n in (0,5) then 1.5 else 2 end;
    end if;
  elsif p_type = 'size' then
    if p_sel = sz then mult := 2; end if;
  end if;
  return floor(p_stake * mult);
end $$;

-- Mirrors creditWallet()/postEntry() in src/services/wallet.ts (same advisory-lock key and
-- idempotency key, so it can never double-pay even if the app settles the same bet).
create or replace function public.rw_credit_wallet(
  p_user int, p_amount_minor numeric, p_key text, p_desc text, p_ref_type text, p_ref_id text
) returns void language plpgsql as $$
declare w record;
begin
  if p_amount_minor is null or p_amount_minor <= 0 then return; end if;
  perform pg_advisory_xact_lock(hashtextextended('wallet:' || p_user, 0));
  if exists (select 1 from wallet_transactions where idempotency_key = p_key) then return; end if;

  select * into w from wallets where user_id = p_user for update;
  if not found then
    insert into wallets (user_id) values (p_user) returning * into w;
  end if;

  insert into wallet_transactions
    (user_id, wallet_id, type, amount, balance_before, balance_after, currency,
     reference_type, reference_id, description, status, idempotency_key)
  values
    (p_user, w.id, 'GAME_REWARD', p_amount_minor,
     coalesce(w.available_balance, 0), coalesce(w.available_balance, 0) + p_amount_minor,
     coalesce(w.currency, 'INR'), p_ref_type, p_ref_id, p_desc, 'COMPLETED', p_key);

  update wallets
     set available_balance = coalesce(available_balance, 0) + p_amount_minor,
         lifetime_earned   = coalesce(lifetime_earned, 0) + p_amount_minor,
         updated_at        = now()
   where id = w.id;
end $$;

-- ---------- Wingo ----------------------------------------------------------------------

-- Pre-create the current AND next round for every mode, so users never have to wait for one.
create or replace function public.rw_wingo_ensure_rounds() returns int
language plpgsql as $$
declare
  m record; k int; dur_ms bigint; start_ms bigint; now_ms bigint; created int := 0; rc int;
begin
  now_ms := floor(extract(epoch from clock_timestamp()) * 1000);
  for m in select * from (values ('30s', 30), ('1m', 60), ('3m', 180), ('5m', 300)) as t(mode, secs) loop
    dur_ms := m.secs * 1000;
    for k in 0..1 loop
      start_ms := (now_ms / dur_ms) * dur_ms + k * dur_ms;
      insert into wingo_rounds (period_key, mode, status, start_at, betting_closes_at, ends_at, settlement_version)
      values (m.mode || '-' || start_ms, m.mode::enum_wingo_rounds_mode, 'OPEN',
              to_timestamp(start_ms / 1000.0),
              to_timestamp((start_ms + dur_ms) / 1000.0),
              to_timestamp((start_ms + dur_ms) / 1000.0), 1)
      on conflict (period_key) do nothing;
      get diagnostics rc = row_count;
      created := created + rc;
    end loop;
  end loop;
  return created;
end $$;

-- Settle every ended round exactly once. Mirrors settleDueWingoRounds() in src/services/wingo.ts.
create or replace function public.rw_wingo_settle_due() returns int
language plpgsql as $$
declare
  r record; b record; n int; payout numeric; settled int := 0;
begin
  for r in
    select id, period_key from wingo_rounds
     where status = 'OPEN' and ends_at <= now()
     order by ends_at limit 200
  loop
    begin  -- sub-transaction: one bad round can't block the others
      perform pg_advisory_xact_lock(hashtextextended('wingo-round:' || r.period_key, 0));
      perform 1 from wingo_rounds where id = r.id and status = 'OPEN' and ends_at <= now() for update;
      if not found then continue; end if;

      n := public.rw_random_digit();

      for b in select * from wingo_bets where round_id = r.id and status = 'PENDING' for update loop
        payout := public.rw_wingo_payout(b.type::text, b.selection, b.stake, n);
        if payout > 0 then
          perform public.rw_credit_wallet(
            b.user_id, payout * 100, 'wingo-payout:' || b.idempotency_key,
            'Wingo ' || b.mode || ' payout', 'wingo-bet', b.id::text);
        end if;
        update wingo_bets
           set status = case when payout > 0 then 'WON' else 'LOST' end::enum_wingo_bets_status,
               payout = payout, winning_number = n, settled_at = now(), updated_at = now()
         where id = b.id;
      end loop;

      update wingo_rounds
         set status = 'SETTLED', winning_number = n, settled_at = now(), updated_at = now()
       where id = r.id;
      settled := settled + 1;
    exception when others then
      raise warning '[rw_wingo_settle_due] round % failed: %', r.period_key, sqlerrm;
    end;
  end loop;
  return settled;
end $$;

create or replace function public.rw_wingo_tick() returns int
language plpgsql as $$
declare s int;
begin
  s := public.rw_wingo_settle_due();
  perform public.rw_wingo_ensure_rounds();
  return s;
end $$;

-- ---------- General tick (replaces POST /api/cron/tick) ---------------------------------

create or replace function public.rw_cron_tick() returns void
language plpgsql as $$
declare c record;
begin
  -- tasks / games: activate & expire
  update tasks set status = 'ACTIVE',  updated_at = now() where status = 'SCHEDULED' and starts_at <= now();
  update tasks set status = 'EXPIRED', updated_at = now() where status = 'ACTIVE'    and ends_at   <= now();
  update games set status = 'ACTIVE',  updated_at = now() where status = 'SCHEDULED' and starts_at <= now();
  update games set status = 'EXPIRED', updated_at = now() where status = 'ACTIVE'    and ends_at   <= now();

  -- campaigns: activate & expire
  update campaigns set status = 'ACTIVE',  updated_at = now() where status = 'SCHEDULED' and starts_at <= now();
  update campaigns set status = 'EXPIRED', updated_at = now() where status = 'ACTIVE'    and ends_at   <= now();

  -- campaign started notifications (once per campaign per user)
  for c in select id, name from campaigns where status = 'ACTIVE' and start_notified_at is null loop
    insert into notifications (user_id, type, title, body, dedupe_key, channels)
    select u.id, 'CAMPAIGN_STARTED', 'New campaign live',
           '"' || c.name || '" is now live — check it out!',
           'campaign:' || c.id || ':started:' || u.id, '{"in_app":"SENT"}'::jsonb
      from users u where u.status = 'ACTIVE'
    on conflict (dedupe_key) do nothing;
    update campaigns set start_notified_at = now() where id = c.id;
  end loop;

  -- campaign ending-soon notifications (ends within 24h)
  for c in select id, name from campaigns
            where status = 'ACTIVE' and ending_notified_at is null
              and ends_at > now() and ends_at <= now() + interval '24 hours' loop
    insert into notifications (user_id, type, title, body, dedupe_key, channels)
    select u.id, 'CAMPAIGN_ENDING', 'Campaign ending soon',
           '"' || c.name || '" ends within 24 hours.',
           'campaign:' || c.id || ':ending:' || u.id, '{"in_app":"SENT"}'::jsonb
      from users u where u.status = 'ACTIVE'
    on conflict (dedupe_key) do nothing;
    update campaigns set ending_notified_at = now() where id = c.id;
  end loop;

  -- expire abandoned game sessions
  update game_sessions set status = 'EXPIRED', ended_at = now(), updated_at = now()
   where status = 'STARTED' and expires_at < now();
end $$;

-- ---------- Schedules -------------------------------------------------------------------

do $$
begin
  perform cron.unschedule(jobname) from cron.job
   where jobname in ('rw-wingo-tick', 'rw-cron-tick', 'rw-cron-cleanup');
end $$;

-- Wingo: every 5 seconds (pg_cron >= 1.5 supports second intervals; Supabase has it).
select cron.schedule('rw-wingo-tick', '5 seconds', $$select public.rw_wingo_tick()$$);

-- Scheduled content + notifications: every minute.
select cron.schedule('rw-cron-tick', '* * * * *', $$select public.rw_cron_tick()$$);

-- Keep pg_cron's own run log small (the 5s job writes ~17k rows/day otherwise).
select cron.schedule('rw-cron-cleanup', '0 * * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '1 day'$$);

-- Run once now so rounds exist immediately.
select public.rw_wingo_tick();
