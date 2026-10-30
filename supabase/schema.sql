-- Tidy Nest database
-- Run this whole file once in Supabase → SQL Editor → New query → Run.
-- It is safe to run again: existing tables are kept.

create extension if not exists pgcrypto;

-- ---------- Products ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text not null default '',
  collection text not null default 'Kitchen'
    check (collection in ('Kitchen', 'Bed & Bath', 'Storage & Cleaning')),
  price numeric(10,2) not null check (price >= 0),
  compare_at numeric(10,2),
  sku text,
  available integer not null default 0 check (available >= 0),
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  image_url text,
  created_at timestamptz not null default now()
);

-- ---------- Orders ----------
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique default nextval('public.order_number_seq'),
  customer_name text not null,
  email text not null,
  phone text,
  address1 text not null,
  city text not null,
  state text not null,
  zip text not null,
  note text,
  subtotal numeric(10,2) not null,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'refunded')),
  fulfillment_status text not null default 'unfulfilled'
    check (fulfillment_status in ('unfulfilled', 'fulfilled', 'canceled')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  title text not null,
  unit_price numeric(10,2) not null,
  quantity integer not null check (quantity > 0)
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ---------- Chat ----------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid(),
  customer_name text not null,
  email text,
  status text not null default 'open' check (status in ('open', 'done')),
  unread_admin boolean not null default true,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender text not null check (sender in ('customer', 'admin')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages(conversation_id, created_at);

-- ---------- Visits (for Analytics) ----------
create table if not exists public.page_views (
  id bigserial primary key,
  session_id text not null,
  path text not null,
  referrer text,
  device text,
  created_at timestamptz not null default now()
);
create index if not exists page_views_time_idx on public.page_views(created_at);

-- ---------- Sample-data flag (see supabase/sample-data.sql) ----------
alter table public.orders add column if not exists is_sample boolean not null default false;
alter table public.conversations add column if not exists is_sample boolean not null default false;
alter table public.page_views add column if not exists is_sample boolean not null default false;

-- ---------- Phone notifications (phase 2) ----------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  label text,
  prefs jsonb not null default '{"orders": true, "updates": false, "chats": true, "chatMode": "first", "practice": true, "quiet": false}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Practice mode (phase 2) ----------
create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running' check (status in ('running', 'paused', 'ended')),
  freq text not null default 'mid' check (freq in ('low', 'mid', 'high')),
  diff text not null default 'mixed' check (diff in ('easy', 'mixed', 'hard')),
  next_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  paused_at timestamptz,
  paused_seconds integer not null default 0,
  ended_at timestamptz,
  feedback jsonb
);
alter table public.conversations add column if not exists is_practice boolean not null default false;
alter table public.conversations add column if not exists practice_session_id uuid references public.practice_sessions(id) on delete cascade;
alter table public.conversations add column if not exists persona jsonb;
alter table public.conversations add column if not exists ai_pending_at timestamptz;

-- ---------- Security ----------
-- All reads and writes go through the website's server with the service key,
-- so the public (anon) key cannot read or change any table directly.
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.page_views enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.practice_sessions enable row level security;

-- ---------- Place an order (checks stock and updates it in one step) ----------
create or replace function public.create_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c jsonb := payload->'customer';
  it jsonb;
  p public.products%rowtype;
  qty integer;
  sub numeric(10,2) := 0;
  ship numeric(10,2);
  new_order public.orders%rowtype;
begin
  if jsonb_array_length(coalesce(payload->'items', '[]'::jsonb)) = 0 then
    raise exception 'Your cart is empty.';
  end if;

  for it in select * from jsonb_array_elements(payload->'items') loop
    qty := (it->>'quantity')::integer;
    select * into p from public.products where id = (it->>'product_id')::uuid for update;
    if not found or p.status <> 'active' then
      raise exception 'A product in your cart is no longer available.';
    end if;
    if qty < 1 or qty > p.available then
      raise exception 'Only % left of %.', p.available, p.title;
    end if;
    sub := sub + p.price * qty;
  end loop;

  ship := case when sub >= 50 then 0 else 5.99 end;

  insert into public.orders (customer_name, email, phone, address1, city, state, zip, note, subtotal, shipping, total, is_sample)
  values (c->>'name', c->>'email', c->>'phone', c->>'address1', c->>'city', c->>'state', c->>'zip',
          payload->>'note', sub, ship, sub + ship, coalesce((payload->>'sample')::boolean, false))
  returning * into new_order;

  for it in select * from jsonb_array_elements(payload->'items') loop
    qty := (it->>'quantity')::integer;
    select * into p from public.products where id = (it->>'product_id')::uuid;
    insert into public.order_items (order_id, product_id, title, unit_price, quantity)
    values (new_order.id, p.id, p.title, p.price, qty);
    update public.products set available = available - qty where id = p.id;
  end loop;

  return jsonb_build_object('id', new_order.id, 'number', new_order.number, 'total', new_order.total);
end;
$$;

-- ---------- Cancel an order and put the stock back ----------
create or replace function public.cancel_order(p_order uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.orders where id = p_order and fulfillment_status = 'unfulfilled') then
    update public.products pr
      set available = pr.available + oi.quantity
      from public.order_items oi
      where oi.order_id = p_order and oi.product_id = pr.id;
    update public.orders set fulfillment_status = 'canceled',
      payment_status = case when payment_status = 'paid' then 'refunded' else payment_status end
      where id = p_order;
  end if;
end;
$$;

revoke all on function public.create_order(jsonb) from public, anon, authenticated;
revoke all on function public.cancel_order(uuid) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;
grant execute on function public.cancel_order(uuid) to service_role;

-- ---------- Image storage for product photos ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- ---------- Starter products (only added if the table is empty) ----------
insert into public.products (slug, title, description, collection, price, compare_at, sku, available, status, image_url)
select * from (values
  ('glass-meal-prep-containers', 'Glass Meal Prep Containers, Set of 5', 'Oven-safe glass containers with snap-lock lids. [Add your own details]', 'Kitchen', 34.99, 42.99, 'TN-001', 42, 'active', '/products/containers.svg'),
  ('wall-mounted-spice-rack', 'Wall-Mounted Spice Rack, 3-Tier', 'Three shelves that fit standard spice jars. [Add your own details]', 'Kitchen', 27.99, null, 'TN-002', 28, 'active', '/products/spice-rack.svg'),
  ('acacia-wood-cutting-board', 'Acacia Wood Cutting Board', 'Solid acacia board with a hanging handle. [Add your own details]', 'Kitchen', 24.99, null, 'TN-003', 9, 'active', '/products/cutting-board.svg'),
  ('insulated-steel-bottle', 'Insulated Steel Bottle, 25 oz', 'Double-wall stainless steel bottle. [Add your own details]', 'Kitchen', 22.99, 26.99, 'TN-004', 6, 'active', '/products/bottle.svg'),
  ('silicone-utensil-set', 'Silicone Utensil Set, 6 Pieces', 'Heat-resistant utensils with a holder. [Add your own details]', 'Kitchen', 19.99, null, 'TN-005', 35, 'active', '/products/utensils.svg'),
  ('motion-sensor-night-light', 'Motion-Sensor Night Light, 2-Pack', 'Soft light that turns on when you walk by. [Add your own details]', 'Bed & Bath', 18.99, null, 'TN-006', 4, 'active', '/products/night-light.svg'),
  ('adhesive-wall-hooks', 'Adhesive Wall Hooks, 10-Pack', 'No-drill hooks for towels, keys and bags. [Add your own details]', 'Bed & Bath', 9.99, null, 'TN-007', 120, 'active', '/products/wall-hooks.svg'),
  ('bamboo-bathtub-tray', 'Bamboo Bathtub Tray', 'Bamboo tray that rests across the tub. [Add your own details]', 'Bed & Bath', 29.99, null, 'TN-008', 18, 'active', '/products/bath-tray.svg'),
  ('microfiber-towel-set', 'Quick-Dry Microfiber Towel Set', 'Soft towels that dry fast. [Add your own details]', 'Bed & Bath', 24.99, null, 'TN-009', 0, 'draft', '/products/towels.svg'),
  ('collapsible-fabric-bins', 'Collapsible Fabric Bins, Set of 3', 'Fold-flat bins with handles. [Add your own details]', 'Storage & Cleaning', 21.99, null, 'TN-010', 51, 'active', '/products/fabric-bins.svg'),
  ('under-sink-organizer', 'Under-Sink Organizer, 2-Tier', 'Sliding two-tier rack for cabinets. [Add your own details]', 'Storage & Cleaning', 25.99, null, 'TN-011', 22, 'active', '/products/under-sink.svg'),
  ('spin-mop-bucket-set', 'Spin Mop & Bucket Set', 'Spin mop with a wringer bucket. [Add your own details]', 'Storage & Cleaning', 39.99, null, 'TN-012', 15, 'active', '/products/spin-mop.svg')
) as v(slug, title, description, collection, price, compare_at, sku, available, status, image_url)
where not exists (select 1 from public.products);
