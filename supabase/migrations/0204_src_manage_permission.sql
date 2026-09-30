-- Recht om de Sunday Race Club te beheren (wens van de eigenaar, 2026-09-30):
-- de SRC-kalender verversen, SRC-teams aanmaken, renners uit de uitslag aan
-- leden koppelen, en leden in een maand zetten of eruit halen.
--
-- Apart van events.manage_all, zodat een event-organiser de SRC kan doen zonder
-- alle events van de club te mogen bewerken en verwijderen. Standaard voor het
-- bestuur, de community-beheerder en de event-organiser; aan te passen op
-- /beheer/rechten.

alter table public.community_role_permissions
  drop constraint if exists community_role_permissions_allowed;

alter table public.community_role_permissions
  add constraint community_role_permissions_allowed
  check (
    permissions <@ array[
      'events.create',
      'events.manage_all',
      'teams.create',
      'teams.manage_roster',
      'teams.manage_results',
      'teams.sync_sources',
      'content.create_posts',
      'content.moderate_posts',
      'media.manage',
      'community.manage',
      'members.approve',
      'members.manage_roles',
      'roles.manage_permissions',
      'achievements.finalize',
      'live.start',
      'live.manage',
      'sponsors.manage',
      'polls.manage',
      'training.view_assigned',
      'training.manage_assignments',
      'training.create_plans',
      'training.publish_plans',
      'training.ai_generate',
      'omnium.manage',
      'src.manage'
    ]::text[]
  );

update public.community_role_permissions
set permissions = (
  select array_agg(distinct permission order by permission)
  from unnest(
    permissions ||
    array['src.manage']::text[]
  ) as permissions(permission)
)
where role in ('board', 'community_manager', 'event_organizer');
