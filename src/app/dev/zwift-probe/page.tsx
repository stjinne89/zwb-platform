import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allSegments } from "@/lib/zwift/route-segments";
import { ZwiftProbe } from "./zwift-probe";

// Alleen bij lokaal ontwikkelen: meet of een browser zelf bij Zwift kan inloggen
// en ophalen (docs/losse-apps-onderzoek-2026-11-11.md). Er hoort geen API-route
// bij; alle verzoeken gaan vanuit de browser rechtstreeks naar Zwift.

export const metadata: Metadata = { title: "Zwift-meting" };

/** Monceau Sprint (Parijs), ook gebruikt in de meting van 2026-09-22. */
const DEFAULT_SEGMENT_ID = "1059797545";

export default function ZwiftProbePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ZwiftProbe segments={allSegments()} defaultSegmentId={DEFAULT_SEGMENT_ID} />;
}
