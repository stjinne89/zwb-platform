-- De standaardworkouts op de trainingsvormen van 28 september 2026: tempo is
-- 81-86% FTP, sweet spot 87-89%. De sweet-spotblokken lagen op 86-94% en hadden
-- daardoor hun midden boven 90%, in de drempelzone: ze kleurden geel en heten in
-- de app nu Drempel. De tempoblokken lagen op 76-86% en vielen deels in
-- intensieve duur (71-80%).
--
-- Alleen de blokken met intensity 'tempo' in de standaardset van sweet spot,
-- tempo en "Duur met tempoblokken" krijgen een nieuw doel. Warming-up, herstel,
-- cooling-down, de testen en eigen workouts van trainers blijven zoals ze zijn.
-- Workouts die al in een schema staan, zijn kopieën en veranderen niet mee.

update public.training_workout_templates t
set structure_json = (
  select jsonb_agg(
    case
      when b ->> 'intensity' = 'tempo' then
        jsonb_set(b, '{target}', to_jsonb(case when t.form = 'sweetspot' then '87-89%' else '81-86%' end))
      else b
    end
    order by ord
  )
  from jsonb_array_elements(t.structure_json) with ordinality as e(b, ord)
)
where t.is_standard
  and (
    t.form in ('sweetspot', 'tempo')
    or (t.form = 'duur' and t.title = 'Duur met tempoblokken')
  )
  and jsonb_typeof(t.structure_json) = 'array'
  and jsonb_array_length(t.structure_json) > 0;

notify pgrst, 'reload schema';
