-- Rechten per thema (rechtenronde fase B, 2026-10-01).
--
-- Een paar brede rechten dekten losse beheerschermen af. Nu krijgt elk thema een
-- eigen recht, zodat je op /beheer/rechten precies kunt geven wat iemand nodig
-- heeft:
--   calendar.sources         eventscan en Zwift-routes          (was events.manage_all)
--   competitions.manage      ZRL-kalender, WTRL-teams, FRR       (was teams.manage_roster
--                                                                 of events.manage_all)
--   integrations.manage      Strava-sync, segmenten, storingen   (was community.manage)
--   notifications.broadcast  pushbericht aan alle leden          (was community.manage)
--   zwbgame.manage           ZWBgame-peloton                     (was alleen is_admin)
--
-- Niemand verliest toegang: elke rol die nu het oude recht heeft, krijgt het
-- nieuwe erbij. live.manage werd nergens gebruikt en verdwijnt.

update public.community_role_permissions
   set permissions = array_remove(permissions, 'live.manage');

alter table public.community_role_permissions
  drop constraint if exists community_role_permissions_allowed;

alter table public.community_role_permissions
  add constraint community_role_permissions_allowed
  check (
    permissions <@ array[
      'events.create',
      'events.manage_all',
      'calendar.sources',
      'competitions.manage',
      'teams.create',
      'teams.manage_roster',
      'teams.manage_results',
      'teams.sync_sources',
      'content.create_posts',
      'content.moderate_posts',
      'media.manage',
      'community.manage',
      'notifications.broadcast',
      'integrations.manage',
      'members.approve',
      'members.manage_roles',
      'roles.manage_permissions',
      'achievements.finalize',
      'live.start',
      'sponsors.manage',
      'polls.manage',
      'training.view_assigned',
      'training.manage_assignments',
      'training.create_plans',
      'training.publish_plans',
      'training.ai_generate',
      'omnium.manage',
      'src.manage',
      'zwbgame.manage'
    ]::text[]
  );

-- Het nieuwe recht erbij voor elke rol met het oude; zonder dubbele.
update public.community_role_permissions
   set permissions = (
     select array_agg(distinct permission order by permission)
       from unnest(permissions || array['calendar.sources']::text[]) as t(permission)
   )
 where 'events.manage_all' = any(permissions);

update public.community_role_permissions
   set permissions = (
     select array_agg(distinct permission order by permission)
       from unnest(permissions || array['competitions.manage']::text[]) as t(permission)
   )
 where permissions && array['teams.manage_roster', 'events.manage_all']::text[];

update public.community_role_permissions
   set permissions = (
     select array_agg(distinct permission order by permission)
       from unnest(permissions || array['integrations.manage', 'notifications.broadcast']::text[]) as t(permission)
   )
 where 'community.manage' = any(permissions);

update public.community_role_permissions
   set permissions = (
     select array_agg(distinct permission order by permission)
       from unnest(permissions || array['zwbgame.manage']::text[]) as t(permission)
   )
 where role = 'board';
