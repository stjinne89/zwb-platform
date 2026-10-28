"use client";

import dynamic from "next/dynamic";
import type { ChapterId } from "@/lib/clubverhaal/chapters";

// three.js draait alleen in de browser; tot de scène er is, staat de achtergrond van de pagina er.
const StoryScene = dynamic(() => import("./story-scene"), { ssr: false });

export function SceneStage({ chapter, frame }: { chapter: ChapterId; frame?: "story" | "hero" }) {
  return <StoryScene chapter={chapter} frame={frame} />;
}
