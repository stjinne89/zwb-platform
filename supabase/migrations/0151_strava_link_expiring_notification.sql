-- Notificatie-voorkeur: Strava-koppeling wordt binnenkort opgeruimd.
--
-- Hoort bij het inactiviteitsbeleid uit dezelfde ronde: koppelingen zonder ritten
-- en zonder login krijgen eerst een waarschuwing voordat we ze deauthoriseren.
-- Default aan -- dit is geen marketing maar een aankondiging dat er iets van het
-- lid wordt afgenomen.

alter table public.notification_preferences
  add column if not exists on_strava_link_expiring boolean not null default true;

notify pgrst, 'reload schema';
