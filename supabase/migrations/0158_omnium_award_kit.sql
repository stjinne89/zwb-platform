-- NULLs tellen mee voor de uniciteit van een seizoensprijs / prijs voor het hele veld.
create unique index if not exists omnium_awards_scope_unique
  on public.omnium_prize_awards(prize_id,edition_id,league) nulls not distinct;
create unique index if not exists omnium_kit_award_unique
  on public.omnium_kit_codes(award_id) where award_id is not null;

create or replace function public.omnium_award_prize(p_prize_id uuid, p_edition_id uuid, p_rider_id uuid, p_user_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare prize omnium_prizes; award omnium_prize_awards; code_id uuid; eligible boolean;
begin
  -- Serialiseert ook twee toekenningen voor dezelfde prijs, vóórdat er een code gepakt wordt.
  select * into strict prize from omnium_prizes where id = p_prize_id for update;
  if (prize.scope = 'edition') <> (p_edition_id is not null) then raise exception 'Kies de juiste prijsscope.'; end if;
  if p_edition_id is not null and not exists(select 1 from omnium_editions where id = p_edition_id and season_id = prize.season_id) then raise exception 'Editie hoort niet bij het seizoen.'; end if;
  select * into award from omnium_prize_awards where prize_id = prize.id and edition_id is not distinct from p_edition_id and league is not distinct from prize.league;
  if found then
    if award.rider_id <> p_rider_id then raise exception 'Deze prijs is al aan een andere renner toegekend.'; end if;
    return award.id;
  end if;
  if prize.scope = 'edition' then
    select exists(select 1 from omnium_edition_standings where edition_id = p_edition_id and rider_id = p_rider_id and rank = 1 and not is_provisional and (prize.league is null or league = prize.league)) into eligible;
  else
    select exists(select 1 from omnium_season_standings where season_id = prize.season_id and rider_id = p_rider_id and rank = 1 and (prize.league is null or league = prize.league)) into eligible;
    if exists(select 1 from omnium_editions e where e.season_id = prize.season_id and
      (select count(*) from omnium_edition_events ee where ee.edition_id = e.id and ee.discipline <> 'recon' and ee.results_state = 'final') <> 4) then
      raise exception 'Het seizoen is nog niet compleet.';
    end if;
  end if;
  if not coalesce(eligible,false) then raise exception 'Kies een winnaar uit de definitieve stand.'; end if;
  insert into omnium_prize_awards(prize_id,edition_id,league,rider_id,awarded_by)
    values(prize.id,p_edition_id,prize.league,p_rider_id,p_user_id) returning * into award;
  if prize.kind = 'zwift_kit' then
    select id into code_id from omnium_kit_codes where season_id = prize.season_id and issued_at is null and award_id is null
      order by created_at,id limit 1 for update skip locked;
    if code_id is null then raise exception 'Geen vrije kitcodes voor dit seizoen.'; end if;
    update omnium_kit_codes set award_id = award.id, issued_at = now() where id = code_id;
  end if;
  return award.id;
end $$;
revoke all on function public.omnium_award_prize(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.omnium_award_prize(uuid,uuid,uuid,uuid) to service_role;
revoke all on public.omnium_kit_codes from anon,authenticated;

-- Een concepteditie mag ook via het palmares niet zichtbaar worden.
drop policy if exists omnium_prize_awards_public_read on public.omnium_prize_awards;
create policy omnium_prize_awards_public_read on public.omnium_prize_awards for select to anon,authenticated using (
  exists(select 1 from omnium_prizes p join omnium_seasons s on s.id = p.season_id where p.id = prize_id and s.published_at is not null)
  and (edition_id is null or exists(select 1 from omnium_editions e where e.id = edition_id and e.published_at is not null))
);
