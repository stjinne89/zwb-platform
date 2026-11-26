import { notFound } from "next/navigation";
import { BackLink, PageHeader } from "@/components/app-ui";
import { getClub } from "@/lib/club";
import { normalizeCode } from "@/lib/tv/pairing";
import { youtubeLiveConfigured } from "@/lib/youtube-live/oauth";
import { PairForm } from "./pair-form";

// TV koppelen (0374), op de telefoon: de QR-code van de tv geeft de code mee,
// anders tik je hem over. /tv zelf is openbaar (de tv), deze pagina niet: de
// layout van de app stuurt wie niet ingelogd is naar het inloggen.

export const dynamic = "force-dynamic";

export const metadata = { title: "Tv koppelen" };

export default async function PairTvPage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  if (!youtubeLiveConfigured() || !(await getClub()).isEnabled("livestream")) notFound();
  const { code } = await searchParams;
  return (
    <div className="space-y-4">
      <BackLink href="/kalender" label="Kalender" />
      <PageHeader eyebrow="Streams" title="Tv koppelen" />
      <PairForm initialCode={normalizeCode(typeof code === "string" ? code : null) ?? ""} />
    </div>
  );
}
