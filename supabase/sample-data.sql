-- Tidy Nest: SAMPLE DATA for practice (optional)
-- Fills the last 60 days with generated orders, visits and chats so the admin
-- has numbers to look at. Every generated row is marked is_sample = true, and the
-- admin shows a "Sample data" notice while any of it exists.
-- Remove it any time from Admin → Home → "Remove sample data".
--
-- Run AFTER schema.sql: Supabase → SQL Editor → New query → paste → Run.

alter table public.orders add column if not exists is_sample boolean not null default false;
alter table public.conversations add column if not exists is_sample boolean not null default false;
alter table public.page_views add column if not exists is_sample boolean not null default false;

do $$
declare
  first_names text[] := array['Emily','Jason','Sophia','Michael','Olivia','Daniel','Priya','Ryan','Hannah','Mark','Grace','Tyler','Megan','Tom','Alicia','Ben','Nora','Luis','Sam','Laura','Kevin','Chloe','Ethan','Ava','Noah','Mia','Lucas','Zoe','Isaac','Ella'];
  last_names text[] := array['Carter','Miller','Nguyen','Brooks','Reed','Kim','Patel','Scott','Lee','Thompson','Wilson','Adams','Ross','Becker','Gomez','Walsh','Ortega','Liu','Martinez','Brown','Hayes','Price','Turner','Morgan','Bennett'];
  cities text[] := array['Austin','Columbus','San Jose','Denver','Raleigh','Seattle','Edison','Portland','Phoenix','Chicago','Boston','Tampa','San Diego','Atlanta','Nashville','Minneapolis'];
  states text[] := array['TX','OH','CA','CO','NC','WA','NJ','OR','AZ','IL','MA','FL','CA','GA','TN','MN'];
  n_orders integer := 1100;
  i integer; k integer; c integer; qty integer;
  t timestamptz; fname text; lname text;
  new_id uuid; new_num integer;
  p record;
  sub numeric(10,2); ship numeric(10,2);
  pay text; ful text;
  conv uuid;
begin
  if exists (select 1 from public.orders where is_sample) then
    raise notice 'Sample data is already loaded. Remove it from the admin first if you want to reload.';
    return;
  end if;

  create temp table w on commit drop as
    select id, price, title,
      case sku when 'TN-001' then 16 when 'TN-004' then 14 when 'TN-002' then 12 when 'TN-010' then 12
               when 'TN-006' then 11 when 'TN-007' then 10 when 'TN-005' then 10 when 'TN-003' then 9
               when 'TN-011' then 9 when 'TN-008' then 7 when 'TN-012' then 7 else 4 end as wt
    from public.products where status = 'active';

  if not exists (select 1 from w) then
    raise exception 'No active products found. Run schema.sql first.';
  end if;

  -- Order times, oldest first so order numbers follow the dates.
  -- Slightly fewer orders in the older 30 days, so recent periods show growth.
  create temp table ot on commit drop as
    select case when raw > now() then now() - random() * (now() - date_trunc('day', now() - interval '6 hours')) else raw end as t
    from (select d, date_trunc('day', now() - d * interval '1 day') + (12 + random() * 13) * interval '1 hour' as raw
          from (select floor(random() * 60)::int as d from generate_series(1, n_orders)) y) x
    where not (d >= 30 and random() < 0.15)
    order by 1;

  -- Orders
  for t in select ot.t from ot order by ot.t loop
    c := 1 + floor(random() * array_length(cities, 1))::int;
    fname := first_names[1 + floor(random() * array_length(first_names, 1))::int];
    lname := last_names[1 + floor(random() * array_length(last_names, 1))::int];

    insert into public.orders (customer_name, email, address1, city, state, zip, subtotal, shipping, total, created_at, is_sample)
    values (fname || ' ' || lname, lower(fname || '.' || lname) || '@example.com',
            (100 + floor(random() * 9800))::int || ' Sample St', cities[c], states[c], lpad((10000 + floor(random() * 89999))::int::text, 5, '0'),
            0, 0, 0, t, true)
    returning id, number into new_id, new_num;

    sub := 0;
    for k in 1..(1 + (random() < 0.45)::int + (random() < 0.15)::int) loop
      select * into p from w order by -ln(random()) / wt limit 1;
      qty := case when random() < 0.15 then 2 else 1 end;
      insert into public.order_items (order_id, product_id, title, unit_price, quantity)
      values (new_id, p.id, p.title, p.price, qty);
      sub := sub + p.price * qty;
    end loop;
    ship := case when sub >= 50 then 0 else 5.99 end;

    if random() < 0.03 then
      pay := 'refunded'; ful := 'canceled';
    elsif now() - t < interval '1 day' then
      pay := case when random() < 0.2 then 'pending' else 'paid' end;
      ful := case when random() < 0.6 then 'unfulfilled' else 'fulfilled' end;
    else
      pay := 'paid'; ful := 'fulfilled';
    end if;

    update public.orders set subtotal = sub, shipping = ship, total = sub + ship,
      payment_status = pay, fulfillment_status = ful
    where id = new_id;

    -- the visit that led to this order
    insert into public.page_views (session_id, path, referrer, device, created_at, is_sample)
    select 'sample-o' || new_num, v.path,
           (array['','','www.google.com','l.instagram.com','l.facebook.com','www.pinterest.com','mail.google.com'])[1 + floor(random() * 7)::int],
           (array['Mobile','Mobile','Mobile','Mobile','Desktop','Desktop','Tablet'])[1 + floor(random() * 7)::int],
           t - v.mins * interval '1 minute', true
    from (values ('/', 9), ('/cart', 4), ('/checkout', 2), ('/thank-you', 0)) as v(path, mins);
  end loop;

  -- Visits that did not buy
  create temp table s on commit drop as
    select g,
      (select case when raw > now() then now() - random() * (now() - date_trunc('day', now() - interval '6 hours')) else raw end
         from (select date_trunc('day', now() - floor(random() * 60) * interval '1 day') + (12 + random() * 13) * interval '1 hour' + g * interval '0 second' as raw) z) as ts,
      (array['/','/','/','/','/','/products/insulated-steel-bottle','/products/glass-meal-prep-containers','/products/motion-sensor-night-light','/products/wall-mounted-spice-rack','/products/collapsible-fabric-bins'])[1 + floor(random() * 10)::int] as landing,
      (array['','','','','www.google.com','www.google.com','www.google.com','l.facebook.com','l.instagram.com','l.instagram.com','www.pinterest.com','www.bing.com','mail.google.com'])[1 + floor(random() * 13)::int] as ref,
      (array['Mobile','Mobile','Mobile','Mobile','Mobile','Mobile','Mobile','Desktop','Desktop','Tablet'])[1 + floor(random() * 10)::int] as device,
      random() as r
    from generate_series(1, 19000) g;

  insert into public.page_views (session_id, path, referrer, device, created_at, is_sample)
  select 'sample-s' || g, landing, ref, device, ts, true from s;
  insert into public.page_views (session_id, path, referrer, device, created_at, is_sample)
  select 'sample-s' || g, '/products/acacia-wood-cutting-board', ref, device, ts + interval '1 minute', true from s where r < 0.45;
  insert into public.page_views (session_id, path, referrer, device, created_at, is_sample)
  select 'sample-s' || g, '/cart', ref, device, ts + interval '2 minutes', true from s where r < 0.07;
  insert into public.page_views (session_id, path, referrer, device, created_at, is_sample)
  select 'sample-s' || g, '/checkout', ref, device, ts + interval '3 minutes', true from s where r < 0.02;

  -- Chats
  insert into public.conversations (customer_name, email, unread_admin, last_message_at, created_at, is_sample)
  values ('Sarah Johnson', 'sarah.j@example.com', true, now() - interval '12 minutes', now() - interval '14 minutes', true)
  returning id into conv;
  insert into public.messages (conversation_id, sender, body, created_at) values
    (conv, 'customer', 'Hi! Does the 25 oz bottle come in sage green?', now() - interval '14 minutes'),
    (conv, 'customer', 'And is it dishwasher safe?', now() - interval '12 minutes');

  insert into public.conversations (customer_name, email, unread_admin, last_message_at, created_at, is_sample)
  values ('Mark Thompson', 'mark.t@example.com', true, now() - interval '40 minutes', now() - interval '40 minutes', true)
  returning id into conv;
  insert into public.messages (conversation_id, sender, body, created_at) values
    (conv, 'customer', 'My order has not moved in 3 days. Can you check?', now() - interval '40 minutes');

  insert into public.conversations (customer_name, email, unread_admin, last_message_at, created_at, is_sample)
  values ('Priya Patel', 'priya.p@example.com', true, now() - interval '1 hour 2 minutes', now() - interval '1 hour 2 minutes', true)
  returning id into conv;
  insert into public.messages (conversation_id, sender, body, created_at) values
    (conv, 'customer', 'I just ordered but used my old address. Can I change it before it ships?', now() - interval '1 hour 2 minutes');

  insert into public.conversations (customer_name, email, unread_admin, last_message_at, created_at, is_sample)
  values ('Chris Walker', null, true, now() - interval '1 hour 48 minutes', now() - interval '1 hour 48 minutes', true)
  returning id into conv;
  insert into public.messages (conversation_id, sender, body, created_at) values
    (conv, 'customer', 'Do you ship to Canada?', now() - interval '1 hour 48 minutes');

  insert into public.conversations (customer_name, email, unread_admin, status, last_message_at, created_at, is_sample)
  values ('Laura Martinez', 'laura.m@example.com', false, 'done', now() - interval '1 day', now() - interval '1 day 8 hours', true)
  returning id into conv;
  insert into public.messages (conversation_id, sender, body, created_at) values
    (conv, 'admin', 'Your bins are out for delivery today!', now() - interval '1 day 8 hours'),
    (conv, 'customer', 'Got them, thank you!', now() - interval '1 day');

  raise notice 'Sample data loaded.';
end $$;
