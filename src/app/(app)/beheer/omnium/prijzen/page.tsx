import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { OMNIUM_LEAGUES } from "@/lib/omnium/scales";
import { PrizeForm } from "./prize-form";

export const dynamic = "force-dynamic";

type JoinedRider = { display_name: string } | Array<{ display_name: string }> | null;
type Winner = {
  riderId: string;
  riderName: string;
  league: string;
};

function riderName(join: JoinedRider): string {
  if (Array.isArray(join)) return join[0]?.display_name ?? "Onbekende renner";
  return join?.display_name ?? "Onbekende renner";
}

const field = "w-full rounded-md border bg-background p-2 text-sm";

export default async function OmniumPrizesPage({
  searchParams,
}: {
  searchParams: Promise<{ seizoen?: string }>;
}) {
  const access = await getCurrentUserAccess(await createClient());
  if (!access.user) redirect("/login");
  if (!access.has("omnium.manage")) redirect("/dashboard");

  const admin = createAdminClient();
  const { seizoen } = await searchParams;
  const { data: seasonRows } = await admin
    .from("omnium_seasons")
    .select("id, slug, name, is_current")
    .order("slug", { ascending: false });
  const seasons = seasonRows ?? [];
  const season =
    seasons.find((row) => row.slug === seizoen) ??
    seasons.find((row) => row.is_current) ??
    seasons[0] ??
    null;

  if (!season) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="ZWB Omnium" title="Prijzen" />
        <EmptyState>Maak eerst een seizoen aan.</EmptyState>
      </div>
    );
  }

  const prizesResult = await admin
    .from("omnium_prizes")
    .select("id, title, scope, league, kind, sort_index")
    .eq("season_id", season.id)
    .order("scope")
    .order("sort_index");
  const prizes = prizesResult.data ?? [];

  const [editionsResult, editionWinnersResult, seasonWinnersResult, awardsResult, codesResult] =
    await Promise.all([
      admin
        .from("omnium_editions")
        .select("id, number, title")
        .eq("season_id", season.id)
        .order("number"),
      admin
        .from("omnium_edition_standings")
        .select("edition_id, rider_id, league, rank, is_provisional, omnium_riders(display_name)")
        .eq("rank", 1)
        .eq("is_provisional", false),
      admin
        .from("omnium_season_standings")
        .select("rider_id, league, rank, omnium_riders(display_name)")
        .eq("season_id", season.id)
        .eq("rank", 1),
      admin
        .from("omnium_prize_awards")
        .select("id, prize_id, edition_id, league, rider_id, status, omnium_riders(display_name)")
        .in(
          "prize_id",
          prizes.length
            ? prizes.map((prize) => prize.id)
            : ["00000000-0000-0000-0000-000000000000"],
        )
        .order("awarded_at", { ascending: false }),
      admin
        .from("omnium_kit_codes")
        .select("id, code, award_id, issued_at")
        .eq("season_id", season.id)
        .order("created_at"),
    ]);

  const editions = editionsResult.data ?? [];
  const editionIds = new Set(editions.map((edition) => edition.id as string));
  const editionWinners = new Map<string, Winner[]>();
  for (const row of editionWinnersResult.data ?? []) {
    if (!editionIds.has(row.edition_id as string)) continue;
    const list = editionWinners.get(row.edition_id as string) ?? [];
    list.push({
      riderId: row.rider_id as string,
      riderName: riderName(row.omnium_riders as JoinedRider),
      league: row.league as string,
    });
    editionWinners.set(row.edition_id as string, list);
  }
  const seasonWinners: Winner[] = (seasonWinnersResult.data ?? []).map((row) => ({
    riderId: row.rider_id as string,
    riderName: riderName(row.omnium_riders as JoinedRider),
    league: row.league as string,
  }));
  const awards = prizes.length ? (awardsResult.data ?? []) : [];
  const awardKeys = new Set(
    awards.map((award) => `${award.prize_id}|${award.edition_id ?? "season"}`),
  );
  const codeByAward = new Map(
    (codesResult.data ?? [])
      .filter((code) => code.award_id)
      .map((code) => [code.award_id as string, code.code as string]),
  );
  const freeCodes = (codesResult.data ?? []).filter((code) => !code.issued_at).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="ZWB Omnium"
        title="Prijzen"
        actions={<Link href="/beheer/omnium" className="text-sm underline">Terug</Link>}
      />

      <nav className="flex flex-wrap gap-2">
        {seasons.map((row) => (
          <Link
            key={row.id as string}
            href={`/beheer/omnium/prijzen?seizoen=${row.slug as string}`}
            className={row.id === season.id ? "rounded border border-primary px-3 py-1.5 text-sm" : "rounded border px-3 py-1.5 text-sm text-muted-foreground"}
          >
            {row.name as string}
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Prijs toevoegen</h2>
          <PrizeForm label="Prijs toevoegen">
            <input type="hidden" name="command" value="create" />
            <input type="hidden" name="season_id" value={season.id as string} />
            <input required name="title" maxLength={200} placeholder="Naam" className={field} />
            <select name="scope" className={field} defaultValue="edition">
              <option value="edition">Per editie</option>
              <option value="season">Per seizoen</option>
            </select>
            <select name="league" className={field} defaultValue="">
              <option value="">Alle leagues</option>
              {OMNIUM_LEAGUES.map((league) => <option key={league}>{league}</option>)}
            </select>
            <select name="kind" className={field} defaultValue="zwift_kit">
              <option value="zwift_kit">Zwift-kit</option>
              <option value="other">Andere prijs</option>
            </select>
          </PrizeForm>
        </section>

        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Kitcodes · {freeCodes} vrij</h2>
          <PrizeForm label="Codes toevoegen">
            <input type="hidden" name="command" value="codes" />
            <input type="hidden" name="season_id" value={season.id as string} />
            <textarea required name="codes" rows={8} className={`${field} font-mono`} />
          </PrizeForm>
        </section>
      </div>

      <section className="space-y-4">
        <h2 className="font-semibold">Winnaars toekennen</h2>
        {prizes.length === 0 && <EmptyState>Nog geen prijzen.</EmptyState>}
        {prizes.map((prize) => {
          const targets = prize.scope === "edition"
            ? editions.map((edition) => ({
                id: edition.id as string,
                label: `Editie ${edition.number as number} · ${edition.title as string}`,
                winners: editionWinners.get(edition.id as string) ?? [],
              }))
            : [{ id: "", label: "Seizoen", winners: seasonWinners }];
          return (
            <article key={prize.id as string} className="space-y-3 rounded-lg border bg-card p-4">
              <h3 className="font-medium">{prize.title as string} · {(prize.league as string | null) ?? "alle leagues"}</h3>
              {targets.map((target) => {
                const candidates = target.winners.filter(
                  (winner) => !prize.league || winner.league === prize.league,
                );
                const assigned = awardKeys.has(`${prize.id}|${target.id || "season"}`);
                if (assigned) {
                  return <p key={target.id || "season"} className="text-sm">{target.label} · toegekend</p>;
                }
                return (
                  <PrizeForm key={target.id || "season"} label="Toekennen">
                    <input type="hidden" name="command" value="award" />
                    <input type="hidden" name="prize_id" value={prize.id as string} />
                    <input type="hidden" name="edition_id" value={target.id} />
                    <label className="block text-sm">
                      {target.label}
                      <select name="rider_id" required className={field} defaultValue="">
                        <option value="">Kies winnaar</option>
                        {candidates.map((winner) => (
                          <option key={`${winner.riderId}-${winner.league}`} value={winner.riderId}>
                            {winner.riderName} · {winner.league}
                          </option>
                        ))}
                      </select>
                    </label>
                  </PrizeForm>
                );
              })}
            </article>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Toekenningen</h2>
        {awards.length === 0 && <EmptyState>Nog geen prijzen toegekend.</EmptyState>}
        {awards.map((award) => (
          <article key={award.id as string} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
            <div className="min-w-56 flex-1">
              <p className="font-medium">{riderName(award.omnium_riders as JoinedRider)}</p>
              <p className="text-sm text-muted-foreground">{award.status as string}</p>
            </div>
            {codeByAward.has(award.id as string) && (
              <input className={`${field} max-w-72 font-mono`} readOnly value={codeByAward.get(award.id as string)} aria-label="Kitcode" />
            )}
            {award.status === "pending" && (
              <PrizeForm label="Verzonden">
                <input type="hidden" name="command" value="status" />
                <input type="hidden" name="award_id" value={award.id as string} />
                <input type="hidden" name="status" value="sent" />
              </PrizeForm>
            )}
            {award.status === "sent" && (
              <PrizeForm label="Geclaimd">
                <input type="hidden" name="command" value="status" />
                <input type="hidden" name="award_id" value={award.id as string} />
                <input type="hidden" name="status" value="claimed" />
              </PrizeForm>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
