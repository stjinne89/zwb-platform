-- Dubbele trainingsdoelen opruimen.
--
-- Het doelformulier had een kale opslaanknop: een tweede klik verzond het
-- formulier opnieuw. Op 20 augustus 2026 waren vijf van de twintig doelen zo'n
-- exacte herhaling — zelfde lid, zelfde titel, zelfde type, zelfde doeldatum,
-- telkens twee seconden na de vorige. Eén lid had er drie identiek staan.
--
-- Sinds diezelfde dag weigert createTrainingGoal een herhaling binnen vijf
-- minuten en schakelt de knop zichzelf uit tijdens het verzenden; deze migratie
-- ruimt op wat er al stond.
--
-- Alleen kopieën zonder schema. Een doel waar een plan aan hangt blijft staan,
-- ook als het een dubbele lijkt: dat plan verwijst ernaar en die verwijzing mag
-- niet zomaar veranderen. In de praktijk hangt een plan altijd aan de eerste van
-- de reeks, dus er blijft niets nodigs achter.

with genummerd as (
  select
    g.id,
    row_number() over (
      partition by g.profile_id, g.title, g.goal_type, g.target_date
      order by g.created_at
    ) as plek
  from public.training_goals as g
)
delete from public.training_goals as doel
using genummerd
where doel.id = genummerd.id
  and genummerd.plek > 1
  and not exists (
    select 1 from public.training_plans as plan where plan.goal_id = doel.id
  );

notify pgrst, 'reload schema';
