-- is_test en is_demo alleen via beheer of SQL (2026-11-16).
--
-- profiles_update_own laat een lid zijn eigen rij wijzigen, en 0333/0334
-- voegden twee kolommen toe die protect_profile_admin_fields niet kent. Zonder
-- deze trigger kon een lid zich verbergen (is_test) of zichzelf op alleen
-- kijken zetten (is_demo), en dat laatste niet meer terugdraaien.
-- De service-rol en de SQL-editor hebben geen auth.uid() en mogen het wel.

create or replace function public.protect_profile_account_flags()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if (new.is_test is distinct from old.is_test or new.is_demo is distinct from old.is_demo)
     and (select auth.uid()) is not null
     and not public.current_user_is_admin() then
    raise exception 'Alleen een beheerder kan een account test of demo maken.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_account_flags on public.profiles;
create trigger profiles_protect_account_flags
  before update of is_test, is_demo on public.profiles
  for each row execute function public.protect_profile_account_flags();

-- Controle na het draaien:
--   select tgname from pg_trigger
--    where tgrelid = 'public.profiles'::regclass and tgname = 'profiles_protect_account_flags';
