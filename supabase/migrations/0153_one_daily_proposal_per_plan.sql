-- Eén automatisch dagvoorstel per schema per dag, afgedwongen door de database.
--
-- De adaptatie-cron controleert vóór het uitzetten of een schema vandaag al een
-- generatie had (handledToday, commit 1839204). Die controle en de insert van de
-- generatie liggen seconden uit elkaar: daartussen worden wellness, belasting en
-- beschikbaarheid opgehaald. Twee runs die elkaar overlappen (een trage run plus
-- de volgende, of een handmatige aanroep naast de geplande) zien dan allebei
-- niets en zetten allebei een betaalde generatie uit, met elk een eigen schema en
-- pushmelding. Een plafond per dag beperkt de schade maar voorkomt dat niet.
--
-- adapt_from_date is de Amsterdamse dag waar het voorstel over gaat, dus precies
-- de sleutel die "één per dag" betekent. De tweede insert faalt met 23505 vóór de
-- OpenAI-call; de code behandelt dat als "al gedaan" en niet als fout.
--
-- Alleen vanaf 14 september 2026: van 11 tot en met 13 september zette de cron
-- tientallen voorstellen per schema per dag uit. Die rijen zijn historie en
-- blijven staan; met hen erin zou het aanmaken van de index falen.
--
-- Volgorde: kan vóór of na de code. Zonder deze index werkt de code gewoon, maar
-- dan zonder de databasegrendel.

create unique index if not exists training_ai_generations_one_daily_per_plan_day
  on public.training_ai_generations (parent_plan_id, adapt_from_date)
  where adaptation_kind = 'daily'
    and adapt_from_date >= date '2026-09-14';

-- Verificatie (handmatig, na uitvoeren):
--
-- 1. De index bestaat:
--    select indexname, indexdef from pg_indexes
--    where indexname = 'training_ai_generations_one_daily_per_plan_day';
--
-- 2. Geen dubbele dagvoorstellen sinds de grens (moet leeg zijn, anders faalt
--    stap 1 en moeten deze rijen eerst worden bekeken):
--    select parent_plan_id, adapt_from_date, count(*)
--    from public.training_ai_generations
--    where adaptation_kind = 'daily' and adapt_from_date >= date '2026-09-14'
--    group by 1, 2 having count(*) > 1;
