-- ============================================================
--  BNP Cocktail Bar — Supabase Schema
--  Run this entire file in: Supabase > SQL Editor > New query
-- ============================================================

-- ── EVENTS ────────────────────────────────────────────────────────────────
create table if not exists public.events (
  id            text        primary key,           -- keep app-generated IDs
  client_name   text        not null default '',
  event_name    text        not null,
  event_type    text        not null default 'private'
                            check (event_type in ('wedding', 'corporate', 'private')),
  date          date        not null,
  location      text        not null default '',
  manager_name  text        not null default '',
  status        text        not null default 'active'
                            check (status in ('active', 'completed')),
  notes         text        not null default '',
  created_at    timestamptz not null default now()
);

-- ── INVENTORY ITEMS (master catalog for future stock tracking) ─────────────
create table if not exists public.inventory_items (
  id            uuid        primary key default gen_random_uuid(),
  item_name     text        not null,
  category      text        not null,
  current_stock integer     not null default 0,
  unit          text,
  price         numeric(10,2) not null default 0,
  item_type     text        not null default 'count'
                            check (item_type in ('count', 'checkbox', 'select')),
  sub_category  text,
  is_flat_fee   boolean     not null default false,
  created_at    timestamptz not null default now()
);

-- ── EVENT INVENTORY (items issued/returned per event) ─────────────────────
--  event_id → events.id (cascade delete)
--  item_id  → inventory_items.id (set null if catalog item removed)
--  custom_item_* → used for ad-hoc items not in the catalog
create table if not exists public.event_inventory (
  id                   uuid        primary key default gen_random_uuid(),
  event_id             text        not null references public.events(id) on delete cascade,
  item_id              uuid        references public.inventory_items(id) on delete set null,
  custom_item_name     text,
  custom_item_category text,
  quantity_out         integer     not null default 0,
  quantity_returned    integer     not null default 0,
  is_checked           boolean     not null default false,
  selected_variant     text,
  baskets_out          integer     not null default 0,
  baskets_returned     integer     not null default 0,
  price_at_event       numeric(10,2) not null default 0,
  -- TRUE once the event is closed and item status is final
  is_accounted_for     boolean     not null default false,
  created_at           timestamptz not null default now(),

  -- every row must have either a catalog item or a custom name
  constraint must_have_item check (
    item_id is not null or custom_item_name is not null
  )
);

-- ── INDEXES ───────────────────────────────────────────────────────────────
create index if not exists idx_event_inventory_event_id on public.event_inventory(event_id);
create index if not exists idx_events_status             on public.events(status);
create index if not exists idx_events_date               on public.events(date desc);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────
--  The app uses a PIN gate (not Supabase Auth), so we grant full access
--  to the anon role. Change this if you add proper auth later.
alter table public.events           enable row level security;
alter table public.inventory_items  enable row level security;
alter table public.event_inventory  enable row level security;

drop policy if exists "anon_all" on public.events;
drop policy if exists "anon_all" on public.inventory_items;
drop policy if exists "anon_all" on public.event_inventory;

create policy "anon_all" on public.events          for all using (true) with check (true);
create policy "anon_all" on public.inventory_items for all using (true) with check (true);
create policy "anon_all" on public.event_inventory for all using (true) with check (true);

-- ── HELPER VIEW: unclosed items per event ────────────────────────────────
--  Use this in Supabase dashboard to spot events with missing equipment.
create or replace view public.unclosed_event_items as
  select
    e.event_name,
    e.date,
    e.manager_name,
    ei.custom_item_name  as item_name,
    ei.custom_item_category as category,
    ei.quantity_out,
    ei.quantity_returned,
    (ei.quantity_out - ei.quantity_returned) as missing
  from public.event_inventory ei
  join public.events e on e.id = ei.event_id
  where ei.is_checked = false
    and ei.quantity_out > ei.quantity_returned
    and e.status = 'active'
  order by e.date desc;
