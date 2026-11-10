import "server-only";

import { getClub } from "@/lib/club";
import { assertSafeUrl } from "@/lib/net/safe-fetch";
import { parseDirectoryCaptains, type LadderCaptain } from "./challenge-post";
import { LadderLoginError } from "./fixture-page";

// Captain-directory van de ladder: alleen ingelogd, dus met LADDER_COOKIE. Per
// ploeg één zoekvraag op teamnaam; niets wordt bewaard.
const DIRECTORY_SEARCH_URL = "https://ladder.cycleracing.club/directory/search?q=";

export async function fetchLadderCaptains(
  team: { name: string; ladderTeamId: number | null },
  cookie: string,
): Promise<LadderCaptain[]> {
  const clubShort = (await getClub()).texts.shortName;
  const url = `${DIRECTORY_SEARCH_URL}${encodeURIComponent(team.name)}`;
  await assertSafeUrl(url);
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": `${clubShort} Platform Club Ladder challenge`,
      Referer: "https://ladder.cycleracing.club/directory",
      Cookie: cookie,
    },
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (res.status >= 300 && res.status < 400) {
    throw new LadderLoginError("Ladder-sessie verlopen: vernieuw LADDER_COOKIE.");
  }
  if (!res.ok) throw new Error(`Captains van ${team.name} gaven HTTP ${res.status}.`);
  return parseDirectoryCaptains(await res.json(), team);
}
