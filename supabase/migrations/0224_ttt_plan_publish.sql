-- TTT-plan publiceren: een concept is alleen voor wie het plan beheert, een
-- gepubliceerd plan ook voor de rest van het team.

alter table public.ttt_plans
  add column if not exists published_at timestamptz;

create or replace function public.can_read_ttt_plan(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ttt_plans p
    where p.id = p_plan_id
      and (
        public.can_manage_ttt_plan(p.parent_team_id, p.team_id)
        or (
          p.published_at is not null
          and exists (
            select 1
            from public.team_members tm
            where tm.profile_id = auth.uid()
              and tm.team_id in (p.parent_team_id, coalesce(p.team_id, p.parent_team_id))
          )
        )
      )
  );
$$;
