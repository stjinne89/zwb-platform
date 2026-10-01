-- Moderatie via het recht content.moderate_posts (rechtenronde fase C, 2026-10-01).
--
-- Eventchat, ritverslagen met hun reacties, eventfoto's en verjaardagsberichten,
-- -foto's, -GPX en -aanmeldingen kon naast de eigenaar alleen een technische
-- admin (profiles.is_admin) weghalen. Nu kan dat iedereen met "Content
-- modereren", in te stellen op /beheer/rechten. Admins hebben elk recht, dus voor
-- hen verandert niets.
--
-- Inactieve sponsors en ledenvoordelen lezen vroeg is_admin, terwijl de app
-- sponsors.manage gebruikt; nu ook sponsors.manage.
--
-- Alleen de beheervoorwaarde verandert; de rest van elke policy is gelijk aan
-- het origineel (0030, 0032, 0057, 0058, 0077, 0078, 0079).

drop policy if exists "sponsors_admin_read_inactive" on public.sponsors;
create policy "sponsors_admin_read_inactive" on public.sponsors
  for select to authenticated using (public.current_user_has_permission('sponsors.manage'));

drop policy if exists "member_benefits_admin_read_inactive" on public.member_benefits;
create policy "member_benefits_admin_read_inactive" on public.member_benefits
  for select to authenticated using (public.current_user_has_permission('sponsors.manage'));

drop policy if exists "event_photos_own_or_admin_delete" on public.event_photos;
create policy "event_photos_own_or_admin_delete" on public.event_photos
  for delete to authenticated using (
    auth.uid() = profile_id
    or public.current_user_has_permission('content.moderate_posts')
  );

drop policy if exists "event_photos_storage_member_delete" on storage.objects;
create policy "event_photos_storage_member_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'event-photos'
    and (
      (storage.foldername(name))[2] = auth.uid()::text
      or public.current_user_has_permission('content.moderate_posts')
    )
  );

drop policy if exists "event_reports_delete_own_or_admin" on public.event_reports;
create policy "event_reports_delete_own_or_admin" on public.event_reports
  for delete to authenticated using (
    auth.uid() = profile_id
    or public.current_user_has_permission('content.moderate_posts')
  );

drop policy if exists "event_report_comments_delete_own_or_admin" on public.event_report_comments;
create policy "event_report_comments_delete_own_or_admin" on public.event_report_comments
  for delete to authenticated using (
    auth.uid() = profile_id
    or public.current_user_has_permission('content.moderate_posts')
  );

drop policy if exists "event_chat_delete_own_or_admin" on public.event_chat_messages;
create policy "event_chat_delete_own_or_admin" on public.event_chat_messages
  for delete to authenticated using (
    auth.uid() = profile_id
    or public.current_user_has_permission('content.moderate_posts')
  );

drop policy if exists "birthday_messages_author_or_admin_delete" on public.birthday_messages;
create policy "birthday_messages_author_or_admin_delete" on public.birthday_messages
  for delete to authenticated using (
    auth.uid() = author_profile_id
    or auth.uid() = birthday_profile_id
    or public.current_user_has_permission('content.moderate_posts')
  );

drop policy if exists "birthday_photos_uploader_or_admin_delete" on public.birthday_photos;
create policy "birthday_photos_uploader_or_admin_delete" on public.birthday_photos
  for delete to authenticated using (
    auth.uid() = uploader_profile_id
    or auth.uid() = birthday_profile_id
    or public.current_user_has_permission('content.moderate_posts')
  );

drop policy if exists "birthday_photos_storage_owner_or_admin_delete" on storage.objects;
create policy "birthday_photos_storage_owner_or_admin_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'birthday-photos'
    and (
      (storage.foldername(name))[3] = auth.uid()::text
      or (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_has_permission('content.moderate_posts')
    )
  );

drop policy if exists "birthday_gpx_owner_or_admin_delete" on storage.objects;
create policy "birthday_gpx_owner_or_admin_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'birthday-gpx'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.current_user_has_permission('content.moderate_posts')
    )
  );

drop policy if exists "birthday_ride_rsvps_owner_or_admin_delete" on public.birthday_ride_rsvps;
create policy "birthday_ride_rsvps_owner_or_admin_delete" on public.birthday_ride_rsvps
  for delete to authenticated using (
    auth.uid() = profile_id
    or auth.uid() = birthday_profile_id
    or public.current_user_has_permission('content.moderate_posts')
  );
