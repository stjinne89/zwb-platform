-- Recht om het Omnium te beheren: edities aanmaken en publiceren, uitslagen
-- invoeren, prijzen toekennen.
--
-- Apart van events.manage_all omdat het Omnium een publieke, externe
-- competitie is: wie de ledenkalender beheert hoeft niet automatisch een
-- uitslag te kunnen publiceren die wereldwijd zichtbaar is, en andersom.

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
      'omnium.manage'
    ]::text[]
  );

update public.community_role_permissions
set permissions = (
  select array_agg(distinct permission order by permission)
  from unnest(
    permissions ||
    array['omnium.manage']::text[]
  ) as permissions(permission)
)
where role in ('board', 'community_manager');
