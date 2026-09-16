import { notFound } from "next/navigation";
import { loadEditionBySlug, loadEditionStandings } from "@/lib/omnium/public-data";
import { normalizeLeague } from "@/lib/omnium/parse-results";
import { StandingsOverlay } from "@/app/omnium/_components/standings-overlay";

export const revalidate = 15;
export const metadata = { title: "ZWB Omnium — Overlay", robots: { index: false, follow: false } };
export default async function OverlayPage({ params, searchParams }: {
  params: Promise<{ editie: string }>;
  searchParams: Promise<{ league?: string; rotate?: string }>;
}) {
  const { editie } = await params;
  const query = await searchParams;
  const found = await loadEditionBySlug(editie);
  if (!found) notFound();
  const league = normalizeLeague(query.league);
  if (query.league && !league) notFound();
  const rotate = query.rotate === "true" || query.rotate === "1" ? 15 : Number(query.rotate);
  return <StandingsOverlay title={found.edition.title} rows={await loadEditionStandings(found.edition.id)} league={league}
    rotateSeconds={Number.isFinite(rotate) && rotate >= 5 ? Math.min(rotate, 300) : 0} />;
}
