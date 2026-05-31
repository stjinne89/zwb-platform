-- Categorie + positie in de categorie bij gescrapte uitslagen (bv. "M2", 1e).

alter table public.event_results
  add column if not exists category text,
  add column if not exists category_rank int;
