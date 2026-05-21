-- Vraag en Aanbod: aanbod/gezocht/vraag/tip + status.

alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts drop constraint if exists posts_status_check;

update public.posts
set kind = 'gezocht'
where kind = 'vraag';

alter table public.posts
  add constraint posts_kind_check check (
    kind in ('aanbod', 'gezocht', 'vraag', 'tip')
  );

alter table public.posts
  add column if not exists status text not null default 'open';

update public.posts
set status = 'open'
where status is null;

alter table public.posts
  alter column status set default 'open',
  alter column status set not null;

alter table public.posts
  add constraint posts_status_check check (
    status in ('open', 'gereserveerd', 'afgerond')
  );

create index if not exists posts_status_idx on public.posts (status, created_at desc);

alter table public.posts drop constraint if exists posts_category_check;
alter table public.posts
  add constraint posts_category_check check (
    category in (
      'fiets','frame','wielen','componenten','kleding','schoenen',
      'helm','accessoires','training-gear','tools','voeding','overig',
      'materiaal','training','race-craft','regelgeving','routes','algemeen'
    )
  );
