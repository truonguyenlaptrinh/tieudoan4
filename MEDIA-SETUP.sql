-- Thay UUID bên dưới bằng UID tài khoản quản trị trong Authentication > Users.
-- Chạy trong SQL Editor của cùng dự án Supabase. Không dùng service_role trên web.
create table if not exists public.activity_media_admins (uid uuid primary key references auth.users(id));
alter table public.activity_media_admins enable row level security;
insert into public.activity_media_admins values ('00000000-0000-0000-0000-000000000000') on conflict do nothing;
create or replace function public.activity_media_is_admin() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.activity_media_admins where uid=auth.uid()) $$;
revoke all on function public.activity_media_is_admin() from public;
grant execute on function public.activity_media_is_admin() to authenticated;
create table if not exists public.activity_media (id uuid primary key default gen_random_uuid(), path text not null unique, caption text not null check(char_length(caption)<=300), kind text not null check(kind in ('image','video')), created_at timestamptz not null default now());
alter table public.activity_media enable row level security;
grant select on public.activity_media to anon,authenticated;
grant insert,delete on public.activity_media to authenticated;
create policy activity_read on public.activity_media for select using (true);
create policy activity_insert on public.activity_media for insert to authenticated with check(public.activity_media_is_admin());
create policy activity_delete on public.activity_media for delete to authenticated using(public.activity_media_is_admin());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('activity-media','activity-media',true,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']) on conflict(id) do nothing;
create policy activity_storage_read on storage.objects for select using(bucket_id='activity-media');
create policy activity_storage_insert on storage.objects for insert to authenticated with check(bucket_id='activity-media' and public.activity_media_is_admin());
create policy activity_storage_delete on storage.objects for delete to authenticated using(bucket_id='activity-media' and public.activity_media_is_admin());
