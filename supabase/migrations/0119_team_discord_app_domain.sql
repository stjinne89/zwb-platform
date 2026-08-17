-- discordapp.com is de oude domeinnaam van Discord. De app deelt die nog
-- steeds bij "kanaallink kopiëren" en hij redirect naar discord.com, maar de
-- CHECK uit 0118 kende alleen discord.com. Verruimen dus, anders wordt een
-- link die de gebruiker net uit Discord kopieerde alsnog geweigerd.

alter table public.teams
  drop constraint if exists teams_discord_url_check;

alter table public.teams
  add constraint teams_discord_url_check
    check (
      discord_url is null
      or discord_url ~* '^https://(discord\.gg/[A-Za-z0-9-]+|(www\.)?(discord|discordapp)\.com/(invite/[A-Za-z0-9-]+|channels/[0-9]+/[0-9]+))/?$'
    );

notify pgrst, 'reload schema';
