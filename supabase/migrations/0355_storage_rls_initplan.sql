-- Uit de wekelijkse databasecheck van 2026-11-17: zestien policies op
-- storage.objects riepen auth.uid() per rij aan. Met (select auth.uid()) rekent
-- Postgres die één keer per query uit, zoals 0210, 0256 en 0325 voor public al
-- deden. De advisor auth_rls_initplan kijkt niet in het storage-schema, daarom
-- stonden deze er nog.
--
-- Alleen de uitdrukking verandert: alter policy houdt commando, rollen en
-- permissive gelijk. De voorwaarden zijn letterlijk overgenomen uit pg_policies
-- in productie op 2026-11-20.

alter policy "avatars_own_delete" on storage.objects
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
alter policy "avatars_own_insert" on storage.objects
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
alter policy "avatars_own_update" on storage.objects
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter policy "bikes_own_delete" on storage.objects
  using (bucket_id = 'bikes' and (storage.foldername(name))[1] = (select auth.uid())::text);
alter policy "bikes_own_insert" on storage.objects
  with check (bucket_id = 'bikes' and (storage.foldername(name))[1] = (select auth.uid())::text);
alter policy "bikes_own_update" on storage.objects
  using (bucket_id = 'bikes' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'bikes' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter policy "birthday_gpx_members_read" on storage.objects
  using (
    bucket_id = 'birthday-gpx'
    and exists (
      select 1
      from public.profiles viewer
      join public.profiles birthday_member
        on birthday_member.id::text = (storage.foldername(objects.name))[1]
      where viewer.id = (select auth.uid())
        and viewer.is_approved
        and (birthday_member.share_birthday or birthday_member.id = (select auth.uid()))
    )
  );
alter policy "birthday_gpx_owner_insert" on storage.objects
  with check (
    bucket_id = 'birthday-gpx'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.profiles profile
      where profile.id = (select auth.uid()) and profile.is_approved
    )
  );
alter policy "birthday_gpx_owner_or_admin_delete" on storage.objects
  using (
    bucket_id = 'birthday-gpx'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.current_user_has_permission('content.moderate_posts')
    )
  );

alter policy "birthday_photos_storage_members_insert" on storage.objects
  with check (
    bucket_id = 'birthday-photos'
    and (storage.foldername(name))[3] = (select auth.uid())::text
    and exists (
      select 1
      from public.profiles viewer
      join public.profiles birthday_member
        on birthday_member.id::text = (storage.foldername(objects.name))[1]
      where viewer.id = (select auth.uid())
        and viewer.is_approved
        and birthday_member.is_approved
        and birthday_member.share_birthday
    )
  );
alter policy "birthday_photos_storage_members_read" on storage.objects
  using (
    bucket_id = 'birthday-photos'
    and exists (
      select 1
      from public.profiles viewer
      join public.profiles birthday_member
        on birthday_member.id::text = (storage.foldername(objects.name))[1]
      where viewer.id = (select auth.uid())
        and viewer.is_approved
        and (birthday_member.share_birthday or birthday_member.id = (select auth.uid()))
    )
  );
alter policy "birthday_photos_storage_owner_or_admin_delete" on storage.objects
  using (
    bucket_id = 'birthday-photos'
    and (
      (storage.foldername(name))[3] = (select auth.uid())::text
      or (storage.foldername(name))[1] = (select auth.uid())::text
      or public.current_user_has_permission('content.moderate_posts')
    )
  );

alter policy "event-gpx delete own" on storage.objects
  using (bucket_id = 'event-gpx' and (select auth.uid())::text = (storage.foldername(name))[1]);
alter policy "event-gpx upload own" on storage.objects
  with check (bucket_id = 'event-gpx' and (select auth.uid())::text = (storage.foldername(name))[1]);

alter policy "event_photos_storage_member_delete" on storage.objects
  using (
    bucket_id = 'event-photos'
    and (
      (storage.foldername(name))[2] = (select auth.uid())::text
      or public.current_user_has_permission('content.moderate_posts')
    )
  );
alter policy "event_photos_storage_member_insert" on storage.objects
  with check (bucket_id = 'event-photos' and (storage.foldername(name))[2] = (select auth.uid())::text);

-- Verificatie (handmatig, na uitvoeren): verwacht 0 rijen.
-- select policyname from pg_policies
--  where schemaname = 'storage' and tablename = 'objects'
--    and (coalesce(qual, '') || coalesce(with_check, '')) ~ 'auth\.uid\(\)'
--    and (coalesce(qual, '') || coalesce(with_check, '')) !~* 'select auth\.uid\(\)';
