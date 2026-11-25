-- Chạy một lần, thay UUID bằng UID quản trị viên được phép tạo tài khoản.
create table if not exists public.account_admins (uid uuid primary key references auth.users(id) on delete cascade);
alter table public.account_admins enable row level security;
revoke all on public.account_admins from anon, authenticated;
insert into public.account_admins(uid) values ('00000000-0000-0000-0000-000000000000') on conflict do nothing;
create or replace function public.account_is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.account_admins where uid=auth.uid()) $$;
revoke all on function public.account_is_admin() from public;
grant execute on function public.account_is_admin() to authenticated;
