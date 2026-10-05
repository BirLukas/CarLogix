-- ==============================================================================
-- CarLogix - Supabase PostgreSQL Database Schema
-- Autor: Lukáš Černík (Maturitní práce - Obor IT)
-- Cíl: Správa uživatelských profilů, oprávnění (RBAC) a garáže vozidel dle PRD
-- ==============================================================================

-- 1. Tabulka uživatelských profilů (napojeno na auth.users v Supabase)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text,
  is_mechanic boolean default false not null,
  workshop_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index pro rychlé vyhledávání podle e-mailu
create index if not exists idx_profiles_email on public.profiles(email);

-- Komentář k tabulce
comment on table public.profiles is 'Uživatelské profily rozšiřující Supabase Auth o metadata a servisní režim';

-- 2. Automatický trigger pro založení profilu při registraci nového uživatele
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, display_name, is_mechanic)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'displayName', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'isMechanic')::boolean, false)
  );
  return new;
end;
$$;

-- Zabezpečení: zakázat přímé volání trigger funkce z venkovního REST API
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- Registrace triggeru na auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Tabulka garáže vozidel (Vehicles)
create table if not exists public.vehicles (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users(id) on delete cascade not null,
  brand text not null,                       -- např. "Peugeot"
  model text not null,                       -- např. "206"
  year integer not null,                     -- např. 2006
  engine_code text not null,                 -- např. "KFW" (1.4i TU3JP)
  fuel_type text not null check (
    fuel_type in ('petrol', 'diesel', 'lpg', 'cng', 'hybrid', 'electric')
  ),
  current_odometer integer not null default 0, -- stav v kilometrech
  vin text,                                  -- 17místný VIN kód
  license_plate text not null,               -- SPZ vozidla (např. "4H1 2060")
  stk_expiration_date date,                  -- Expirace technické kontroly STK
  insurance_expiration_date date,            -- Expirace povinného ručení
  oil_interval_km integer not null default 15000, -- Interval výměny motorového oleje
  last_oil_change_km integer not null default 0,  -- Tachometr při poslední výměně
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexy pro efektivní dotazování
create index if not exists idx_vehicles_owner_id on public.vehicles(owner_id);
create index if not exists idx_vehicles_license_plate on public.vehicles(license_plate);

-- 4. Zabezpečení Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;

-- RLS politiky pro profily:
create policy "Uživatelé mohou číst pouze svůj vlastní profil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Uživatelé mohou aktualizovat pouze svůj vlastní profil"
  on public.profiles for update
  using (auth.uid() = id);

-- RLS politiky pro vozidla:
create policy "Vlastník může zobrazit svá vozidla"
  on public.vehicles for select
  using (auth.uid() = owner_id);

create policy "Vlastník může přidat nové vozidlo"
  on public.vehicles for insert
  with check (auth.uid() = owner_id);

create policy "Vlastník může upravovat svá vozidla"
  on public.vehicles for update
  using (auth.uid() = owner_id);

create policy "Vlastník může smazat své vozidlo"
  on public.vehicles for delete
  using (auth.uid() = owner_id);

-- 5. Ukázková data (Seed) pro referenční vozidlo Peugeot 206
-- (Poznámka: v produkci vkládejte až po vytvoření uživatele s konkrétním owner_id)
/*
insert into public.vehicles (
  owner_id,
  brand,
  model,
  year,
  engine_code,
  fuel_type,
  current_odometer,
  license_plate,
  stk_expiration_date,
  insurance_expiration_date,
  oil_interval_km,
  last_oil_change_km
) values (
  '00000000-0000-0000-0000-000000000000', -- nahraďte auth.uid()
  'Peugeot',
  '206',
  2006,
  'KFW',
  'petrol',
  184520,
  '4H1 2060',
  '2026-11-14',
  '2026-12-31',
  15000,
  179000
);
*/
