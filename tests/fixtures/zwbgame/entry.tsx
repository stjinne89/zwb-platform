import { createRoot } from "react-dom/client";
import { GameClient } from "../../../src/app/(app)/zwbgame/game-client";
import { fixture, nearFinish, nearFinishFrr, nearFinishZrl } from "./services";
import "./reset.css";

declare global {
  interface Window { zwbgameFixture: { nearFinish: typeof nearFinish; nearFinishZrl: typeof nearFinishZrl; nearFinishFrr: typeof nearFinishFrr; removeOpponent: (id: string) => void } }
}
window.zwbgameFixture = { nearFinish, nearFinishZrl, nearFinishFrr, removeOpponent: (id) => { fixture.roster = fixture.roster.filter((r) => r.id !== id); } };
createRoot(document.getElementById("root")!).render(<GameClient initial={structuredClone(fixture)} />);
