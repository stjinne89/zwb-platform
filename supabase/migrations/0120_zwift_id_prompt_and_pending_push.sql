-- Twee losse kolommen die bij elkaar horen omdat ze samen in één ronde landen.
--
-- 1. zwift_opt_out — de app vraagt bij inloggen om een Zwift-ID zolang dat leeg
--    is. Zonder een expliciet "ik zwift niet" blijft die vraag eeuwig
--    terugkomen bij leden die geen Zwift hebben.
--
-- 2. on_member_pending — beheerders krijgen een pushbericht zodra er iemand op
--    goedkeuring wacht. Default true, want anders krijgt niemand hem: de
--    send-helper slaat profielen zonder opt-in over.

alter table public.profiles
  add column if not exists zwift_opt_out boolean not null default false;

alter table public.notification_preferences
  add column if not exists on_member_pending boolean not null default true;

notify pgrst, 'reload schema';
