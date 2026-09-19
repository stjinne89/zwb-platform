import Link from "next/link";
import { loadGame } from "@/lib/zwbgame/server";
import { GameClient } from "./game-client";

export const metadata = { title: "ZWBgame — jouw club, jouw koers" };
export const dynamic = "force-dynamic";

export default async function GamePage() {
  let bootstrap;
  try { bootstrap = await loadGame(); }
  catch (error) {
    return <div className="space-y-4"><h1 className="text-3xl font-bold">ZWBgame</h1><p role="status">{error instanceof Error ? error.message : "ZWBgame is tijdelijk niet beschikbaar."}</p><Link className="underline" href="/hulp#zwbgame">Hulp</Link></div>;
  }
  if (!bootstrap.available) return <div className="space-y-4"><h1 className="text-3xl font-bold">ZWBgame</h1><p role="status">ZWBgame is nog niet beschikbaar.</p></div>;
  return <GameClient initial={bootstrap} />;
}
