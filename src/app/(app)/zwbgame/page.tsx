import Link from "next/link";
import { loadGame } from "@/lib/zwbgame/server";
import { GameClient } from "./game-client";
import { ModuleName } from "@/components/club-texts-provider";
import { moduleName } from "@/lib/club";

export async function generateMetadata() {
  return { title: `${await moduleName("managerspel")} — jouw club, jouw koers` };
}
export const dynamic = "force-dynamic";

export default async function GamePage() {
  let bootstrap;
  try { bootstrap = await loadGame(); }
  catch (error) {
    return <div className="space-y-4"><h1 className="text-3xl font-bold"><ModuleName module="managerspel" /></h1><p role="status">{error instanceof Error ? error.message : <><ModuleName module="managerspel" /> is tijdelijk niet beschikbaar.</>}</p><Link className="underline" href="/hulp/wedstrijden#zwbgame">Hulp</Link></div>;
  }
  if (!bootstrap.available) return <div className="space-y-4"><h1 className="text-3xl font-bold"><ModuleName module="managerspel" /></h1><p role="status"><ModuleName module="managerspel" /> is nog niet beschikbaar.</p></div>;
  return <GameClient initial={bootstrap} />;
}
