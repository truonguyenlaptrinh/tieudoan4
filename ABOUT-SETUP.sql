-- Chạy sau ACCOUNTS-SETUP.sql đã cấu hình UID thật.
create table if not exists public.portal_about (
 id integer primary key check(id=1), title text not null check(char_length(title) between 1 and 200), body text not null check(char_length(body) between 1 and 30000), updated_at timestamptz not null default now());
alter table public.portal_about enable row level security;
revoke all on public.portal_about from anon, authenticated;
grant select on public.portal_about to anon, authenticated;
grant insert, update on public.portal_about to authenticated;
drop policy if exists about_read on public.portal_about;
create policy about_read on public.portal_about for select to anon, authenticated using (true);
drop policy if exists about_insert on public.portal_about;
create policy about_insert on public.portal_about for insert to authenticated with check (public.account_is_admin());
drop policy if exists about_update on public.portal_about;
create policy about_update on public.portal_about for update to authenticated using (public.account_is_admin()) with check (public.account_is_admin());
