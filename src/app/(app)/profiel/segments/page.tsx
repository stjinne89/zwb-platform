import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPinned } from "lucide-react";
import { segmentSession } from "@/lib/segments/query";
import { StravaAttribution } from "@/components/strava-brand";
import { SegmentExplorer } from "./_components/segment-explorer";

export const dynamic = "force-dynamic";
export default async function SegmentsPage() {
  // The layout presents the existing consent dialog; APIs still require current consent.
  if (!await segmentSession(false)) redirect("/login");
  return <div className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Club</p>
        <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight"><MapPinned className="size-7 text-primary" />ZWB Segments</h1></div>
      <nav className="flex gap-4 text-sm"><Link className="hover:underline" href="/profiel/segments/collecties?filter=zwift">Zwift & collecties</Link><Link className="text-muted-foreground hover:underline" href="/hulp/segments">Hulp</Link></nav>
    </header>
    <SegmentExplorer />
    <StravaAttribution />
  </div>;
}
