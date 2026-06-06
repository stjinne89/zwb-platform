-- Upgrade bestaande ZWB Segments-installaties die nog `europe_iconic`
-- gebruiken. De UI groepeert geografisch onder Benelux en Europa; de interne
-- collecties blijven bruikbaar voor synchronisatie en bronbeheer.

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'zwb_segments'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%collection%'
  loop
    execute format(
      'alter table public.zwb_segments drop constraint %I',
      constraint_name
    );
  end loop;
end
$$;

update public.zwb_segments
set
  collection = 'europe_flat',
  active = true,
  updated_at = now()
where collection = 'europe_iconic';

alter table public.zwb_segments
  add constraint zwb_segments_collection_check
  check (
    collection in ('cols', 'zwift_flat', 'benelux_popular', 'europe_flat')
  );

insert into public.zwb_segments (
  slug,
  name,
  collection,
  country,
  region,
  virtual,
  distance_m,
  elevation_gain_m,
  category,
  strava_segment_id,
  active,
  source,
  metadata
)
values
  ('benelux-burgemeester-bloemersweg', 'Burgemeester Bloemersweg', 'benelux_popular', 'NL', 'Gelderland', false, 2768, 43, 'segment', 1972717, true, 'strava-verified', '{"average_grade":0.3,"start_lat":52.056828,"start_lon":6.027380}'::jsonb),
  ('benelux-groenendaalseweg-loenen', 'Groenendaalseweg naar Loenen compleet', 'benelux_popular', 'NL', 'Gelderland', false, 4361, 17, 'segment', 7997126, true, 'strava-verified', '{"average_grade":-1.1,"start_lat":52.102869,"start_lon":5.956621}'::jsonb),
  ('benelux-koningsweg-a50-delenseweg', 'TC8Bar Koningsweg (A50-Delenseweg)', 'benelux_popular', 'NL', 'Gelderland', false, 1662, 10, 'segment', 18738318, true, 'strava-verified', '{"average_grade":0.1,"start_lat":52.038366,"start_lon":5.930962}'::jsonb),
  ('benelux-dwars-door-loenen', 'Dwars door Loenen', 'benelux_popular', 'NL', 'Gelderland', false, 1320, 0, 'segment', 4853335, true, 'strava-verified', '{"average_grade":-0.6,"start_lat":52.115891,"start_lon":6.017692}'::jsonb),
  ('benelux-langs-de-heide', 'langs de heide', 'benelux_popular', 'NL', 'Gelderland', false, 2061, 14, 'segment', 21493839, true, 'strava-verified', '{"average_grade":0.0,"start_lat":52.059893,"start_lon":6.022225}'::jsonb),
  ('benelux-ijsselbrug-doesburg', 'HF Brug Doesburg ri. Doesburg', 'benelux_popular', 'NL', 'Gelderland', false, 650, 5, 'segment', 2132192, true, 'strava-verified', '{"average_grade":0.3,"start_lat":52.022286,"start_lon":6.122265}'::jsonb),
  ('benelux-deelenseweg-woeste-hoeve', 'Deelenseweg - Woeste Hoeve (via krimweg)', 'benelux_popular', 'NL', 'Gelderland', false, 15618, 68, 'segment', 31734550, true, 'strava-verified', '{"average_grade":0.1,"start_lat":52.037704,"start_lon":5.906582}'::jsonb),
  ('benelux-hoenderloo-loenen', 'Hoenderloo > Loenen', 'benelux_popular', 'NL', 'Gelderland', false, 10423, 38, 'segment', 7006983, true, 'strava-verified', '{"average_grade":-0.2,"start_lat":52.118062,"start_lon":5.880713}'::jsonb),
  ('benelux-koningsweg-hoenderloo', 'Koningsweg - Hoenderloo', 'benelux_popular', 'NL', 'Gelderland', false, 9265, 36, 'segment', 4700472, true, 'strava-verified', '{"average_grade":0.0,"start_lat":52.038141,"start_lon":5.906214}'::jsonb),
  ('benelux-woeste-hoefweg', 'Woeste hoefweg W-O', 'benelux_popular', 'NL', 'Gelderland', false, 5890, 45, 'segment', 4282170, true, 'strava-verified', '{"average_grade":0.4,"start_lat":52.118104,"start_lon":5.875418}'::jsonb),
  ('europe-champs-elysees', 'Champs-Elysees', 'europe_flat', 'FR', 'Paris', false, null, 0, 'segment', null, true, 'curated-candidate', '{"search":"Champs Elysees sprint cycling","bounds":[[48.85,2.28],[48.89,2.34]]}'::jsonb),
  ('europe-roubaix-velodrome', 'Roubaix Velodrome', 'europe_flat', 'FR', 'Roubaix', false, null, 0, 'segment', null, true, 'curated-candidate', '{"search":"Roubaix Velodrome cycling","bounds":[[50.66,3.16],[50.70,3.20]]}'::jsonb),
  ('europe-trouee-d-arenberg', 'Trouee d Arenberg', 'europe_flat', 'FR', 'Nord', false, null, 0, 'cobbles', null, true, 'curated-candidate', '{"search":"Trouee d Arenberg cycling","bounds":[[50.36,3.39],[50.42,3.46]]}'::jsonb),
  ('europe-carrefour-de-l-arbre', 'Carrefour de l Arbre', 'europe_flat', 'FR', 'Nord', false, null, 0, 'cobbles', null, true, 'curated-candidate', '{"search":"Carrefour de l Arbre cycling","bounds":[[50.57,3.30],[50.62,3.37]]}'::jsonb),
  ('europe-via-roma-sprint', 'Via Roma Sprint', 'europe_flat', 'IT', 'Sanremo', false, null, 0, 'segment', null, true, 'curated-candidate', '{"search":"Via Roma sprint cycling","bounds":[[43.80,7.75],[43.83,7.80]]}'::jsonb),
  ('europe-promenade-des-anglais', 'Promenade des Anglais', 'europe_flat', 'FR', 'Nice', false, null, 0, 'segment', null, true, 'curated-candidate', '{"search":"Promenade des Anglais cycling","bounds":[[43.68,7.20],[43.71,7.28]]}'::jsonb),
  ('europe-playa-de-palma', 'Playa de Palma', 'europe_flat', 'ES', 'Mallorca', false, null, 0, 'segment', null, true, 'curated-candidate', '{"search":"Playa de Palma cycling","bounds":[[39.50,2.70],[39.56,2.80]]}'::jsonb),
  ('europe-tempelhofer-feld', 'Tempelhofer Feld', 'europe_flat', 'DE', 'Berlin', false, null, 0, 'segment', null, true, 'curated-candidate', '{"search":"Tempelhofer Feld cycling","bounds":[[52.46,13.38],[52.50,13.43]]}'::jsonb),
  ('europe-amager-strandpark', 'Amager Strandpark', 'europe_flat', 'DK', 'Copenhagen', false, null, 0, 'segment', null, true, 'curated-candidate', '{"search":"Amager Strandpark cycling","bounds":[[55.64,12.62],[55.68,12.67]]}'::jsonb),
  ('europe-the-mall-sprint', 'The Mall Sprint', 'europe_flat', 'GB', 'London', false, null, 0, 'segment', null, true, 'curated-candidate', '{"search":"The Mall sprint cycling London","bounds":[[51.50,-0.15],[51.52,-0.12]]}'::jsonb)
on conflict (slug) do update set
  name = excluded.name,
  collection = excluded.collection,
  country = excluded.country,
  region = excluded.region,
  virtual = excluded.virtual,
  distance_m = excluded.distance_m,
  elevation_gain_m = excluded.elevation_gain_m,
  category = excluded.category,
  strava_segment_id = coalesce(
    excluded.strava_segment_id,
    public.zwb_segments.strava_segment_id
  ),
  active = excluded.active,
  source = excluded.source,
  metadata = excluded.metadata,
  updated_at = now();
