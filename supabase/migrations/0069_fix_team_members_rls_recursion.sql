-- Voorkom infinite recursion in de team_members write-policy.
-- De oude policy keek direct in team_members terwijl hij team_members moest
-- autoriseren. Deze security-definer helper doet de captain-check buiten RLS.

create or replace function public.current_user_is_team_captain(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = target_team_id
      and tm.profile_id = auth.uid()
      and tm.role in ('captain','co-captain')
  );
$$;

grant execute on function public.current_user_is_team_captain(uuid) to authenticated;

drop policy if exists "team_members_admin_or_captain_write" on public.team_members;
drop policy if exists "team_members_permission_or_captain_write" on public.team_members;

create policy "team_members_permission_or_captain_write"
  on public.team_members
  for all to authenticated
  using (
    public.current_user_has_permission('teams.manage_roster')
    or public.current_user_is_team_captain(team_id)
  )
  with check (
    public.current_user_has_permission('teams.manage_roster')
    or public.current_user_is_team_captain(team_id)
  );
