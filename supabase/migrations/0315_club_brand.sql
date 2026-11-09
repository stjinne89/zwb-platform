-- Huisstijl van de club, deel 2: lettertype, logo en beeldmerk (fase 2 van de
-- generieke versie, docs/multi-club-ontwerp.md; keuzes eigenaar 2026-11-09).
--
-- Lettertype: een vaste lijst van vier, met de bestanden in src/fonts. Leeg is
-- de standaard, Barlow Semi Condensed. Een nieuwe letter in de lijst vraagt een
-- nieuwe migratie voor de check; dat is bewust, want hij vraagt ook een bestand.
--
-- Logo (breed, voor het inlogscherm en de kop) en beeldmerk (vierkant; de app
-- maakt er de app-iconen, favicons en de deelkaart van). Beide als publieke URL
-- in de bucket club-assets. Leeg = de vaste ZWB-bestanden in public/, dus voor
-- ZWB verandert er niets.
--
-- Lezen en schrijven zoals de rest van club_settings (0313): iedereen leest,
-- alleen de service role schrijft, na de controle op roles.manage_permissions.
-- De bucket is publiek leesbaar; uploaden doet de server met de service role.

alter table public.club_settings
  add column if not exists font text,
  add column if not exists logo_url text,
  add column if not exists mark_url text;

alter table public.club_settings
  drop constraint if exists club_settings_font_known;
alter table public.club_settings
  add constraint club_settings_font_known check (
    font is null or font in ('barlow', 'archivo', 'inter', 'schibsted')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('club-assets', 'club-assets', true, 2097152, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "club_assets_public_read" on storage.objects;
create policy "club_assets_public_read" on storage.objects
  for select to public using (bucket_id = 'club-assets');
