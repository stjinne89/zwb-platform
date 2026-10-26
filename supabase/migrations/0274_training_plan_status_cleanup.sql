-- Schema-statussen opruimen na "één knop Publiceren" (2026-10-26, zie
-- docs/schema-goedkeuren-publiceren-analyse.md).
--
-- Sinds die ronde zet de app geen schema meer op 'review' en keurt hij niet meer
-- goed zonder te publiceren. Wat er nog van vroeger staat, krijgt hier de status
-- die past bij wat er werkelijk in intervals.icu staat. De check op
-- training_plans.status blijft ongewijzigd: 'review' mag nog, er komt alleen
-- niets meer bij.

-- 1. 'review' werd nergens gelezen. Staat er al een training van zo'n schema in
--    intervals.icu, dan loopt het half: 'approved', zodat "Opnieuw versturen" de
--    rest kan nasturen. Anders is het gewoon weer een concept.
update public.training_plans p
set status = case
      when exists (
        select 1
        from public.training_workouts w
        where w.plan_id = p.id
          and w.superseded_at is null
          and w.publish_status = 'published'
      ) then 'approved'
      else 'draft'
    end,
    approved_at = case
      when p.approved_at is null and exists (
        select 1
        from public.training_workouts w
        where w.plan_id = p.id
          and w.superseded_at is null
          and w.publish_status = 'published'
      ) then p.updated_at
      else p.approved_at
    end
where p.status = 'review';

-- 2. Goedgekeurd maar nooit gepubliceerd, terwijl alle trainingen (rustdagen
--    niet meegeteld) al in intervals.icu staan: dat is gewoon gepubliceerd.
update public.training_plans p
set status = 'published',
    published_at = coalesce(p.published_at, p.approved_at, p.updated_at),
    published_by = coalesce(p.published_by, p.approved_by)
where p.status = 'approved'
  and exists (
    select 1
    from public.training_workouts w
    where w.plan_id = p.id
      and w.superseded_at is null
      and w.status <> 'skipped'
  )
  and not exists (
    select 1
    from public.training_workouts w
    where w.plan_id = p.id
      and w.superseded_at is null
      and w.status <> 'skipped'
      and w.publish_status <> 'published'
  );
