-- Naloper op 0135: de wees van een dubbel doel.
--
-- 0135 hield van elke reeks identieke doelen de oudste en verwijderde de latere
-- kopieën zonder schema. In de praktijk bleek het schema juist aan de *tweede*
-- rij te hangen — de trainer maakt het aan vanuit de doelenlijst en pakt daar de
-- onderste. De oudste rij bleef dus staan als doel zonder schema, precies naast
-- het echte. Drie keer, bij drie verschillende leden.
--
-- Deze migratie ruimt die wezen op: een doel zonder schema waarvan een identieke
-- tweelingrij (zelfde lid, titel, type, doeldatum) wél een schema heeft. Blijft
-- van een reeks geen enkele rij met een schema over, dan raken we niets aan —
-- dan is er geen "echte" om naar te wijzen en beslist niemand dat op de tast.

delete from public.training_goals as wees
where not exists (
    select 1 from public.training_plans as plan where plan.goal_id = wees.id
  )
  and exists (
    select 1
    from public.training_goals as echt
    join public.training_plans as plan on plan.goal_id = echt.id
    where echt.id <> wees.id
      and echt.profile_id = wees.profile_id
      and echt.title = wees.title
      and echt.goal_type = wees.goal_type
      and echt.target_date is not distinct from wees.target_date
  );

notify pgrst, 'reload schema';
