import "server-only";

import { cookies } from "next/headers";
import { parsePowerScope, POWER_SCOPE_COOKIE, type PowerScope } from "./power-scope";

/** De keuze alles of indoor van wie kijkt; zonder cookie alles. */
export async function readPowerScope(): Promise<PowerScope> {
  return parsePowerScope((await cookies()).get(POWER_SCOPE_COOKIE)?.value);
}
