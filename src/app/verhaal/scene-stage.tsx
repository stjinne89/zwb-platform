"use client";

import dynamic from "next/dynamic";
import type { SceneSpec } from "@/lib/clubverhaal/scenes";

// three.js draait alleen in de browser; tot de scène er is, staat de achtergrond van de pagina er.
const StoryScene = dynamic(() => import("./story-scene"), { ssr: false });

export function SceneStage({ spec, frame }: { spec: SceneSpec; frame?: "story" | "hero" | "preview" }) {
  return <StoryScene spec={spec} frame={frame} />;
}
