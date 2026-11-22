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
  brand text not null,                       -- např. "Škoda"
  model text not null,                       -- např. "Octavia"
  year integer not null check (year >= 1900 and year <= 2100), -- např. 2019
  engine_code text not null,                 -- např. "DFHA"
  fuel_type text not null check (
    fuel_type in ('petrol', 'diesel', 'lpg', 'cng', 'hybrid', 'electric')
  ),
  current_odometer integer not null default 0, -- stav v kilometrech
  vin text,                                  -- 17místný VIN kód
  license_plate text not null,               -- SPZ vozidla (např. "1AB 2345")
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

-- 5. Tabulka záznamů tankování (Fuel Entries)
create table if not exists public.fuel_entries (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid references public.vehicles(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  odometer integer not null check (odometer > 0),
  liters numeric(8, 2) not null check (liters > 0),
  price_total_czk numeric(10, 2) not null check (price_total_czk > 0),
  price_per_liter numeric(8, 2) not null check (price_per_liter > 0),
  is_full_tank boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_fuel_entries_vehicle_id on public.fuel_entries(vehicle_id);
alter table public.fuel_entries enable row level security;

create policy "Vlastník vozidla může spravovat tankování"
  on public.fuel_entries for all
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id and v.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id and v.owner_id = auth.uid()
    )
  );

-- 6. Tabulka servisní knihy (Service Entries)
create table if not exists public.service_entries (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid references public.vehicles(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete set null,
  author_role text default 'owner' check (author_role in ('owner', 'mechanic')),
  workshop_stamp text,
  performer text,
  date date not null,
  odometer integer not null check (odometer >= 0),
  title text not null,
  description text,
  parts_summary text,
  material_price_czk integer default 0 not null check (material_price_czk >= 0),
  labor_price_czk integer default 0 not null check (labor_price_czk >= 0),
  total_price_czk integer default 0 not null check (total_price_czk >= 0),
  invoice_image_url text,
  is_confirmed_by_owner boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_service_entries_vehicle_id on public.service_entries(vehicle_id);
alter table public.service_entries enable row level security;

create policy "Vlastník vozidla může spravovat servisní knihu"
  on public.service_entries for all
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id and v.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id and v.owner_id = auth.uid()
    )
  );

-- 7. Tabulka blacklistu dílů (Blacklisted Parts)
create table if not exists public.blacklisted_parts (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid references public.vehicles(id) on delete cascade not null,
  part_name text not null,
  brand text not null,
  part_number text,
  reason text not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_blacklisted_parts_vehicle_id on public.blacklisted_parts(vehicle_id);
alter table public.blacklisted_parts enable row level security;

create policy "Vlastník vozidla může spravovat blacklist dílů"
  on public.blacklisted_parts for all
  to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id and v.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id and v.owner_id = (select auth.uid())
    )
  );

-- 8. Tabulka digitálního archivu dokumentů (Vehicle Documents - FR3)
create table if not exists public.vehicle_documents (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid references public.vehicles(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  doc_type text not null check (
    doc_type in ('technical_certificate', 'green_card', 'purchase_contract', 'stk_protocol', 'other')
  ),
  title text not null,
  image_url text not null,
  notes text,
  expiration_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_vehicle_documents_vehicle_id on public.vehicle_documents(vehicle_id);
create index if not exists idx_vehicle_documents_user_id on public.vehicle_documents(user_id);
alter table public.vehicle_documents enable row level security;

create policy "Vlastník vozidla může spravovat dokumenty"
  on public.vehicle_documents for all
  to authenticated
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id and v.owner_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.vehicles v
      where v.id = vehicle_id and v.owner_id = (select auth.uid())
    )
  );

-- 9. Privátní Storage bucket pro faktury, fotodokumentaci a archiv dokumentů
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'carlogix-documents',
  'carlogix-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "Uživatel může číst své dokumenty"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'carlogix-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Uživatel může nahrávat své dokumenty"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'carlogix-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Uživatel může upravovat své dokumenty"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'carlogix-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'carlogix-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Uživatel může mazat své dokumenty"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'carlogix-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 5. Ukázková data (Seed) pro ukázkové vozidlo
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
  'Škoda',
  'Octavia',
  2019,
  'DFHA',
  'diesel',
  165000,
  '1AB 2345',
  null,
  null,
  15000,
  165000
);
*/
