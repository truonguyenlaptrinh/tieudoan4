begin;
-- Abort unless exactly one existing account administrator, matching the existing profile.
do $$ begin if (select count(*) from public.account_admins) <> 1 or not exists(select 1 from public.account_admins a join public.profiles p on p.id=a.uid where p.role='admin') then raise exception 'Cần đúng một account_admins trùng profiles admin'; end if; end $$;
create unique index if not exists v29_single_admin on public.account_admins ((true));
create table if not exists public.v29_members(uid uuid primary key references auth.users(id) on delete cascade, state text not null check(state in ('pending','active','locked')) default 'pending');
alter table public.v29_members enable row level security;
revoke all on public.v29_members from anon,authenticated;
create or replace function public.v29_editor() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.v29_members m join public.profiles p on p.id=m.uid where m.uid=auth.uid() and m.state='active' and p.role='editor') $$;
revoke all on function public.v29_editor() from public; grant execute on function public.v29_editor() to authenticated;
-- Replace existing helpers without changing their signatures.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select public.account_is_admin() $$;
create or replace function public.can_edit() returns boolean language sql stable security definer set search_path='' as $$ select public.account_is_admin() or public.v29_editor() $$;
create or replace function public.activity_media_is_admin() returns boolean language sql stable security definer set search_path='' as $$ select public.account_is_admin() $$;
drop policy if exists "Update own profile" on public.profiles;
revoke update on public.profiles from authenticated,anon;
-- Existing editors require explicit approval; retain all content.
insert into public.v29_members(uid) select id from public.profiles where role='editor' on conflict do nothing;
create table if not exists public.v29_uploads(id uuid primary key default gen_random_uuid(), owner uuid not null default auth.uid() references auth.users(id), path text not null unique, caption text not null, state text not null default 'pending' check(state in ('pending','approved','rejected')), public_url text, created_at timestamptz not null default now());
alter table public.v29_uploads enable row level security;
revoke all on public.v29_uploads from anon,authenticated;
grant select,insert,update on public.v29_uploads to authenticated;
create policy v29_upload_read on public.v29_uploads for select to authenticated using(public.account_is_admin() or (public.v29_editor() and owner=auth.uid()));
create policy v29_upload_insert on public.v29_uploads for insert to authenticated with check((public.account_is_admin() or public.v29_editor()) and owner=auth.uid() and state='pending' and public_url is null and split_part(path,'/',1)=auth.uid()::text);
create policy v29_upload_update on public.v29_uploads for update to authenticated using(public.account_is_admin()) with check(public.account_is_admin());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('v29-pending','v29-pending',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy v29_private_insert on storage.objects for insert to authenticated with check(bucket_id='v29-pending' and (public.account_is_admin() or public.v29_editor()) and (storage.foldername(name))[1]=auth.uid()::text);
create policy v29_private_read on storage.objects for select to authenticated using(bucket_id='v29-pending' and (public.account_is_admin() or (public.v29_editor() and (storage.foldername(name))[1]=auth.uid()::text)));
create policy v29_private_delete on storage.objects for delete to authenticated using(bucket_id='v29-pending' and (public.account_is_admin() or (public.v29_editor() and (storage.foldername(name))[1]=auth.uid()::text)));
commit;
