-- De kopman als avatar (2026-11-20).
--
-- Wens eigenaar: een lid kiest in het profiel of de foto of de eigen kopman
-- (0347) de avatar is. Kiest een lid met een foto de kopman, dan wijst
-- avatar_url naar het plaatje van de kopman (/live/kopman/<id>) en bewaart
-- avatar_photo_url de foto, zodat terugkiezen hem terugzet. Een nieuwe foto
-- uploaden maakt de foto weer de avatar.
--
-- Een lid zonder foto krijgt de kopman bij het tonen (lib/avatar.ts); daar is
-- geen kolom voor nodig. Het shirt (winter of zomer) staat in
-- stream_kopman.look.
--
-- profiles_update_own laat het lid de eigen rij wijzigen; de kolom valt
-- daaronder, net als avatar_url.

alter table public.profiles add column if not exists avatar_photo_url text;

notify pgrst, 'reload schema';

-- Controle na toepassen:
-- select count(*) from public.profiles where avatar_photo_url is not null;
