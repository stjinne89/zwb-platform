-- Verberg niet-betrouwbare milestone-definities op publieke profielen.
-- Auto-badges en bestuur-aangemaakte custom badges blijven zichtbaar; oude
-- handmatig toegekende badges blijven zichtbaar als historisch verdiende badge.

create or replace function public.get_public_profile_milestone_badges(target_profile_id uuid)
returns table (
  id text,
  title text,
  description text,
  icon text,
  color text,
  achievement_code text,
  tier text,
  visual_hint text,
  trigger_source text,
  trigger_config jsonb,
  sort_order int,
  earned boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.title,
    b.description,
    b.icon,
    b.color,
    b.achievement_code,
    b.tier,
    b.visual_hint,
    b.trigger_source,
    b.trigger_config,
    b.sort_order,
    exists (
      select 1
      from public.achievement_awards a
      where a.profile_id = target_profile_id
        and a.badge_id = b.id
        and a.award_scope = 'milestone'
    ) as earned
  from public.profiles p
  join public.achievement_badges b on b.kind = 'milestone'
  where p.id = target_profile_id
    and p.is_approved = true
    and p.public_profile_enabled = true
    and public.profile_visible(p.id, 'badges')
    and (
      b.trigger_source = 'auto'
      or b.id like 'custom\_%' escape '\'
      or exists (
        select 1
        from public.achievement_awards a
        where a.profile_id = target_profile_id
          and a.badge_id = b.id
          and a.award_scope = 'milestone'
      )
    )
  order by b.sort_order
$$;

grant execute on function public.get_public_profile_milestone_badges(uuid) to anon, authenticated;
