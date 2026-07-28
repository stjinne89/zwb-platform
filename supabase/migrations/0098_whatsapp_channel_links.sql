-- WhatsApp-kanalen naast groepen. Leden vroegen om WhatsApp-integratie; posten
-- in bestaande clubgroepen kan niet via de officiele API (Groups API werkt
-- alleen met eigen groepen van max. 8 leden en een geverifieerd business
-- account). Wat wel kan: deel-links vanuit de app en een clubkanaal linken.
-- Een kanaal-URL is https://whatsapp.com/channel/... en botst met de bestaande
-- CHECK op chat.whatsapp.com.

alter table public.whatsapp_groups
  add column if not exists kind text not null default 'group'
    check (kind in ('group', 'channel'));

alter table public.whatsapp_groups
  drop constraint if exists whatsapp_groups_invite_url_check;

alter table public.whatsapp_groups
  add constraint whatsapp_groups_invite_url_check
    check (invite_url ~* '^https://(chat\.whatsapp\.com/|(www\.)?whatsapp\.com/channel/)');

-- Forceer een PostgREST schema-cache reload, zodat de kolom direct beschikbaar is.
notify pgrst, 'reload schema';
