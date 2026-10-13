-- TTT-plan delen met de Discord-bot: een geheime link per plan. De bot haalt het
-- plan op via /api/ttt/plan/[token]; die route leest met de service-role, dus er
-- komt geen RLS-policy bij. Leeg = niet gedeeld.

alter table public.ttt_plans
  add column if not exists share_token text;

create unique index if not exists ttt_plans_share_token_key
  on public.ttt_plans (share_token)
  where share_token is not null;
