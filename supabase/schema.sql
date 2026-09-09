-- DreamTrail schema: multi-trip planner with auth, sharing, memories, documents

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  cities text[] not null default '{}',
  share_token uuid not null default gen_random_uuid(),
  share_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  date date not null,
  city text not null default 'TBD',
  confirmed boolean not null default false,
  badges text[] not null default '{}',
  events jsonb not null default '[]',
  stay jsonb,
  unique(trip_id, date)
);

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  day date not null,
  type text not null check (type in ('note','photo')),
  text text,
  storage_path text,
  owner uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  place text not null,
  category text not null check (category in ('stay','transport','activity')),
  title text not null,
  storage_path text not null,
  owner uuid not null references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table trips enable row level security;
alter table days enable row level security;
alter table memories enable row level security;
alter table documents enable row level security;

drop policy if exists trips_owner on trips;
create policy trips_owner on trips for all to authenticated
  using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists days_owner on days;
create policy days_owner on days for all to authenticated
  using (exists (select 1 from trips t where t.id = trip_id and t.owner = auth.uid()))
  with check (exists (select 1 from trips t where t.id = trip_id and t.owner = auth.uid()));

drop policy if exists memories_owner on memories;
create policy memories_owner on memories for all to authenticated
  using (exists (select 1 from trips t where t.id = trip_id and t.owner = auth.uid()))
  with check (exists (select 1 from trips t where t.id = trip_id and t.owner = auth.uid()));

drop policy if exists documents_owner on documents;
create policy documents_owner on documents for all to authenticated
  using (exists (select 1 from trips t where t.id = trip_id and t.owner = auth.uid()))
  with check (exists (select 1 from trips t where t.id = trip_id and t.owner = auth.uid()));

-- Public read-only share view (token-gated), strips the token itself
create or replace function get_shared_trip(p_token uuid)
returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object(
    'trip', to_jsonb(t) - 'share_token',
    'days', (select coalesce(jsonb_agg(d order by d.date), '[]'::jsonb) from days d where d.trip_id = t.id),
    'memories', (select coalesce(jsonb_agg(m order by m.created_at), '[]'::jsonb) from memories m where m.trip_id = t.id)
  ) from trips t
  where t.share_enabled and t.share_token = p_token
$$;
revoke all on function get_shared_trip(uuid) from public;
grant execute on function get_shared_trip(uuid) to anon, authenticated;

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('trip-photos','trip-photos', true), ('trip-documents','trip-documents', false)
on conflict (id) do nothing;

drop policy if exists photos_owner_insert on storage.objects;
create policy photos_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists photos_public_read on storage.objects;
create policy photos_public_read on storage.objects for select
  using (bucket_id = 'trip-photos');
drop policy if exists photos_owner_delete on storage.objects;
create policy photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists docs_owner_select on storage.objects;
create policy docs_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'trip-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists docs_owner_insert on storage.objects;
create policy docs_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists docs_owner_delete on storage.objects;
create policy docs_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'trip-documents' and (storage.foldername(name))[1] = auth.uid()::text);
