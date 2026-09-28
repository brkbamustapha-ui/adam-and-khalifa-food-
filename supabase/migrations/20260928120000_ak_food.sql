-- Adam & Khalifa Food : tables du site et du tableau de bord (préfixe ak_).
-- Aucune politique RLS : seules l'Edge Function "ak-api" (clé secrète) accède aux données.

create table if not exists public.ak_admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  password_hash text not null,
  token_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ak_secrets (
  key text primary key,
  value text not null
);

create table if not exists public.ak_menu (
  id integer primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ak_orders (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  public_token text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  customer_name text not null,
  customer_phone text not null,
  mode text not null,
  address text,
  pickup_time text,
  note text,
  items jsonb not null,
  total integer not null check (total >= 0),
  item_count integer not null default 0,
  ip_hash text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists ak_orders_created_idx on public.ak_orders (created_at desc);
create index if not exists ak_orders_status_idx on public.ak_orders (status, created_at desc);
create index if not exists ak_orders_ip_idx on public.ak_orders (ip_hash, created_at desc);

create table if not exists public.ak_login_attempts (
  id bigserial primary key,
  ip_hash text,
  username text,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists ak_login_attempts_idx on public.ak_login_attempts (created_at desc);

alter table public.ak_admins enable row level security;
alter table public.ak_secrets enable row level security;
alter table public.ak_menu enable row level security;
alter table public.ak_orders enable row level security;
alter table public.ak_login_attempts enable row level security;

-- clé de signature des sessions admin (générée une seule fois)
insert into public.ak_secrets (key, value)
values ('session_secret', encode(extensions.gen_random_bytes(48), 'base64'))
on conflict (key) do nothing;

-- Statistiques d'une période (heure d'Algérie). Seules les commandes confirmées comptent dans la recette.
create or replace function public.ak_stats(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
set search_path = public
as $$
  with o as (
    select status, total, mode, items, created_at
    from public.ak_orders
    where created_at >= p_from and created_at < p_to
  ),
  c as (select * from o where status = 'confirmed'),
  daily as (
    select (created_at at time zone 'Africa/Algiers')::date as day, count(*) as orders, sum(total) as revenue
    from c
    group by 1
  ),
  top as (
    select i ->> 'name' as name, sum((i ->> 'qty')::int) as qty, sum((i ->> 'lineTotal')::bigint) as revenue
    from c
    cross join lateral jsonb_array_elements(c.items) as i
    group by 1
    order by 2 desc, 3 desc
    limit 8
  ),
  modes as (
    select mode, count(*) as orders, sum(total) as revenue
    from c
    group by mode
  )
  select jsonb_build_object(
    'orders', (select count(*) from o),
    'pending', (select count(*) from o where status = 'pending'),
    'pendingAmount', coalesce((select sum(total) from o where status = 'pending'), 0),
    'confirmed', (select count(*) from c),
    'rejected', (select count(*) from o where status = 'rejected'),
    'revenue', coalesce((select sum(total) from c), 0),
    'average', coalesce((select round(avg(total)) from c), 0),
    'modes', coalesce((select jsonb_agg(jsonb_build_object('mode', mode, 'orders', orders, 'revenue', revenue) order by revenue desc) from modes), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'orders', orders, 'revenue', revenue) order by day) from daily), '[]'::jsonb),
    'top', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'qty', qty, 'revenue', revenue) order by qty desc, revenue desc) from top), '[]'::jsonb)
  );
$$;

-- Recette mois par mois (heure d'Algérie), du plus récent au plus ancien.
create or replace function public.ak_monthly(p_months integer default 24)
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'month', to_char(m, 'YYYY-MM'),
    'orders', orders,
    'confirmed', confirmed,
    'revenue', revenue
  ) order by m desc), '[]'::jsonb)
  from (
    select date_trunc('month', created_at at time zone 'Africa/Algiers') as m,
           count(*) as orders,
           count(*) filter (where status = 'confirmed') as confirmed,
           coalesce(sum(total) filter (where status = 'confirmed'), 0) as revenue
    from public.ak_orders
    where created_at >= (date_trunc('month', now() at time zone 'Africa/Algiers') - make_interval(months => greatest(p_months, 1) - 1)) at time zone 'Africa/Algiers'
    group by 1
  ) t;
$$;

revoke all on function public.ak_stats(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.ak_monthly(integer) from public, anon, authenticated;
grant execute on function public.ak_stats(timestamptz, timestamptz) to service_role;
grant execute on function public.ak_monthly(integer) to service_role;

-- Photos de la carte (lecture publique, écriture via URL signée générée par l'API)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ak-food', 'ak-food', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
