// Discord-links voor teams. Twee vormen zijn bruikbaar:
//
// - invite  → https://discord.gg/<code> of https://discord.com/invite/<code>
// - kanaal  → https://discord.com/channels/<server-id>/<kanaal-id>
//
// De kanaallink opent direct het juiste kanaal, maar werkt alleen voor wie al
// lid is van de server. discordapp.com is de oude domeinnaam: de Discord-app
// deelt die nog steeds en hij redirect naar discord.com, dus accepteer beide.
// Houd de regex gelijk aan de CHECK op public.teams.

const HOST = String.raw`(www\.)?(discord|discordapp)\.com`;
const INVITE = new RegExp(
  String.raw`^https://(discord\.gg|${HOST}/invite)/[A-Za-z0-9-]+/?$`,
  "i",
);
const CHANNEL = new RegExp(String.raw`^https://${HOST}/channels/[0-9]+/[0-9]+/?$`, "i");

export function isValidDiscordUrl(url: string): boolean {
  const value = url.trim();
  return INVITE.test(value) || CHANNEL.test(value);
}

export const DISCORD_URL_ERROR =
  "Gebruik een https://discord.gg/… invite of een https://discord.com/channels/… kanaallink.";
