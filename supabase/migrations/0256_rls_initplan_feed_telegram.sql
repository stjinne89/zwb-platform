-- RLS: auth.uid() één keer per query op de agenda-feed en de Telegram-koppeling.
--
-- 0236_calendar_feed_tokens en 0253_ride_messages kwamen na 0210_rls_initplan en
-- gebruikten weer een kale auth.uid(). De databasecheck van 2026-10-20 zag de
-- advisor auth_rls_initplan van 0 naar 6 gaan. Zelfde regels, als initplan.

alter policy calendar_feed_tokens_select_own on public.calendar_feed_tokens
  using ((select auth.uid()) = profile_id);
alter policy calendar_feed_tokens_insert_own on public.calendar_feed_tokens
  with check ((select auth.uid()) = profile_id);
alter policy calendar_feed_tokens_update_own on public.calendar_feed_tokens
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);
alter policy calendar_feed_tokens_delete_own on public.calendar_feed_tokens
  using ((select auth.uid()) = profile_id);

alter policy telegram_links_own_select on public.telegram_links
  using ((select auth.uid()) = profile_id);
alter policy telegram_links_own_delete on public.telegram_links
  using ((select auth.uid()) = profile_id);
