-- Breid eventcategorieen uit voor specifiekere outdoor-ritten.

alter table public.events
  drop constraint if exists events_type_check;

alter table public.events
  add constraint events_type_check
  check (
    type in (
      'outdoor',
      'gran_fondo',
      'toertocht',
      'gravel_race',
      'zrl',
      'ladder',
      'flamme_rouge',
      'social',
      'training',
      'overig'
    )
  );

