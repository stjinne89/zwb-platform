-- Elk team kan zijn eigen Discord-kanaal linken, naast de WhatsApp-groep.
-- Eén kanaal per team, dus een kolom op teams en geen aparte tabel zoals bij
-- whatsapp_groups (die bestaan ook los van een team en in meervoud).
--
-- Toegestaan: een invite (discord.gg/... of discord.com/invite/...) en een
-- directe kanaallink (discord.com/channels/<server>/<kanaal>). Die laatste
-- werkt alleen voor wie al in de server zit; de invite is de veilige keuze.

alter table public.teams
  add column if not exists discord_url text;

alter table public.teams
  drop constraint if exists teams_discord_url_check;

alter table public.teams
  add constraint teams_discord_url_check
    check (
      discord_url is null
      or discord_url ~* '^https://(discord\.gg/[A-Za-z0-9-]+|(www\.)?discord\.com/(invite/[A-Za-z0-9-]+|channels/[0-9]+/[0-9]+))/?$'
    );

-- Forceer een PostgREST schema-cache reload, zodat de kolom direct beschikbaar is.
notify pgrst, 'reload schema';
