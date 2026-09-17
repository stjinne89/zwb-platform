import { createRoot } from "react-dom/client";
import { GameClient } from "../../../src/app/(app)/zwbgame/game-client";
import { fixture, nearFinish } from "./services";
import "./reset.css";

declare global {
  interface Window { zwbgameFixture: { nearFinish: typeof nearFinish; removeOpponent: (id: string) => void } }
}
window.zwbgameFixture = { nearFinish, removeOpponent: (id) => { fixture.roster = fixture.roster.filter((r) => r.id !== id); } };
createRoot(document.getElementById("root")!).render(<GameClient initial={structuredClone(fixture)} />);
