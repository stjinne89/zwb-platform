-- Eerste racetips: samenvattingen van Zwift Insider (2026-10-27).
--
-- Op verzoek van de eigenaar, onder de naam Zwift Insider met een link naar het
-- artikel (bron 'bron', 0283). Eigen woorden, geen citaten. Gelezen op
-- 2026-10-27; de meeste komen uit stukken van september en oktober 2026, de
-- laatste drie uit oudere stukken (2023 en 2025) die nog kloppen met de
-- powerupgids van september 2026.
--
-- De volgorde in de lijst is die van created_at, nieuwste eerst; daarom telt
-- de eerste rij hieronder de minste seconden terug. Opnieuw draaien voegt niets
-- dubbel toe.

with tips (ord, body, url) as (
  values
    (1, 'In een race met meerdere rondes: begin achterin en rij in het wiel, dan houd je iets over voor de klimmen en de finale. Aan de eerste klim zie je wie er sterk is.',
        'https://zwiftinsider.com/race-lost-zrl-innsbruckring/'),
    (2, 'Ga niet achter elke aanval aan, zeker niet op het vlakke. De meeste aanvallen mislukken; laat ploegen met meer renners in de groep het gat dichtrijden.',
        'https://zwiftinsider.com/race-lost-zrl-innsbruckring/'),
    (3, 'Laat het veld vóór een sprint niet te ver weglopen. Wie eerst een gat moet dichten, heeft in de sprint zelf niets meer over.',
        'https://zwiftinsider.com/race-lost-makuri-40/'),
    (4, 'Herstel op vlakke en dalende stukken: in het wiel, hoge cadans, weinig watt. Dan heb je bij de volgende klim of sprint weer wat te geven.',
        'https://zwiftinsider.com/race-lost-makuri-40/'),
    (5, 'Leer vooraf waar de sprints en klimmen liggen en loop je raceplan in je hoofd door. Zeker als je die week meerdere routes rijdt: een vergissing in de race kost punten.',
        'https://zwiftinsider.com/race-lost-makuri-40/'),
    (6, 'Rij in een ontsnapping niet hard op kop voor renners die om dezelfde podiumplekken strijden als jij.',
        'https://zwiftinsider.com/race-lost-zrl-innsbruckring/'),
    (7, 'Een draft boost is niet alleen voor jezelf: gebruik hem ook om een ploeggenoot naar een betere plek te brengen.',
        'https://zwiftinsider.com/race-lost-makuri-40/'),
    (8, 'Blijf in de sprint in het wiel tot het juiste moment en neem de kortste lijn door de bochten.',
        'https://zwiftinsider.com/race-lost-makuri-40/'),
    (9, 'Wie te vroeg aangaat, betaalt dat. Een lange solo naar de streep wordt vaak nog ingelopen; soms win je meer met het wiel van wie wel aangaat.',
        'https://zwiftinsider.com/race-lost-zrl-innsbruckring/'),
    (10, 'Veer: 30 seconden 10% lichter, bewaar hem voor een klim. Draft boost: 40 seconden meer slipstream, gebruik hem in het wiel op snelle vlakke stukken of afdalingen. Aerohelm: 15 seconden 25% minder luchtweerstand, voor de sprint of als je geen wiel hebt.',
        'https://zwiftinsider.com/powerups/'),
    (11, 'Burrito: 20 seconden geen slipstream voor wie achter je zit, dus gebruik hem bij een aanval. Geest: 15 seconden onzichtbaar; activeer hem eerst en versnel daarna. In de laatste 400 meter werkt de geest niet.',
        'https://zwiftinsider.com/powerups/'),
    (12, 'Val in New York niet aan op de roltrappen: Zwift duwt je daar al, dus extra watt levert weinig op, en de veer werkt er zelfs tegen. Korte steile klimmen zoals de Hill KOM werken wel.',
        'https://zwiftinsider.com/zrl-r20-w5/'),
    (13, 'In het wiel heb je minder vermogen nodig dan wie voor je rijdt. Rijdt die 300 W, dan blijf je er vaak bij met 225 tot 250 W. Rij het minimum dat je plek houdt.',
        'https://zwiftinsider.com/5-racing-tips/'),
    (14, 'Op onverhard in Watopia en Makuri ga je trager en zie je minder door het stof: een goede plek om aan te vallen, als je vooraan zit. Met toets 9 krijg je een camera van bovenaf zonder stof.',
        'https://zwiftinsider.com/5-racing-tips/'),
    (15, 'Snelste tijd op een segment: begin achterin en schuif naar voren, zodat je aan kop komt terwijl je nog in de slipstream zit. Eerste over de streep win je vaak later in de race, als de groep moe is.',
        'https://zwiftinsider.com/zrl-segment-points-tips/')
)
insert into public.member_tips
  (profile_id, topic_slug, body, source, source_name, source_url, status, created_at, updated_at)
select null, 'zwift-racen', t.body, 'bron', 'Zwift Insider', t.url, 'published',
       now() - make_interval(secs => t.ord), now() - make_interval(secs => t.ord)
from tips t
where not exists (
  select 1 from public.member_tips m
  where m.source = 'bron' and m.body = t.body
);

-- Controle na toepassen:
-- select count(*) from public.member_tips where source = 'bron' and source_name = 'Zwift Insider';  -- 15
