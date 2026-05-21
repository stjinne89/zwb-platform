-- "Materiaal" → "Vraag en Aanbod": marketplace-velden op posts.
-- - kind: aanbod (te koop / aangeboden) of vraag (gezocht)
-- - price: vrije tekst (bv. "€350", "Bieden vanaf 100", "Ruilen voor X")
-- - Marketplace-categorieën worden toegevoegd; bestaande categorieën
--   blijven geldig zodat oude posts niet breken.

alter table public.posts
  add column if not exists kind text not null default 'aanbod'
    check (kind in ('aanbod','vraag')),
  add column if not exists price text;

create index if not exists posts_kind_idx on public.posts (kind, created_at desc);

-- Uitgebreide category-constraint: oude + nieuwe marketplace-categorieën.
alter table public.posts drop constraint if exists posts_category_check;
alter table public.posts
  add constraint posts_category_check check (
    category in (
      -- Marketplace
      'fiets','frame','wielen','componenten','kleding','schoenen',
      'helm','accessoires','training-gear','tools','voeding','overig',
      -- Backwards compat met oude kennisbank-categorieën
      'materiaal','training','race-craft','regelgeving','routes','algemeen'
    )
  );
