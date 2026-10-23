import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/app-ui";
import {
  BriljantView,
  type BriljantCompare,
  type BriljantHallStone,
  type BriljantTab,
} from "@/components/briljant/briljant-view";
import { StatsTabs } from "../_components/stats-tabs";
import { getRequestUser } from "@/lib/auth/request";
import { compareLines, snapshotAt, viewFromSnapshot, type AverageGroup } from "@/lib/briljant/compare";
import { recordView } from "@/lib/briljant/records";
import { FACET_LABELS } from "@/lib/briljant/score";
import {
  collectBriljant,
  loadClubAverages,
  loadHallStones,
  loadHistory,
  loadOwnSnapshots,
  loadSharing,
  hasTerugblik,
  refreshSources,
  rememberVisit,
  storeTerugblik,
} from "@/lib/briljant/server";
import { bestWins, briljantView } from "@/lib/briljant/view";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { mondayKey } from "@/lib/briljant/snapshot";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZWBriljant" };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Zo lang wacht de pagina hooguit op een ontbrekende terugblik. */
const TERUGBLIK_WAIT_MS = 6_000;
const weekLabel = (monday: string) =>
  new Date(`${monday}T12:00:00Z`).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

/** De gemiddelde stenen: van iedereen, en van mannen en vrouwen (eigenaar, 2026-10-22). */
const AVERAGE_STONES: Array<{ id: string; group: AverageGroup; label: string; short: string; subject: string }> = [
  { id: "zwb", group: "zwb", label: "ZWB-gemiddelde", short: "ZWB", subject: "het gemiddelde ZWB-lid" },
  { id: "zwb-man", group: "man", label: "Gemiddelde ZWB-man", short: "Man", subject: "de gemiddelde ZWB-man" },
  { id: "zwb-vrouw", group: "vrouw", label: "Gemiddelde ZWB-vrouw", short: "Vrouw", subject: "de gemiddelde ZWB-vrouw" },
];

export default async function BriljantPage({
  searchParams,
}: {
  searchParams: Promise<{ datum?: string | string[]; met?: string | string[]; tab?: string | string[]; lid?: string | string[]; van?: string | string[] }>;
}) {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const datum = typeof params.datum === "string" && DAY.test(params.datum) ? params.datum : null;
  const met = typeof params.met === "string" ? params.met : null;

  const admin = createAdminClient();
  const supabase = await createClient();
  const today = amsterdamDayKey();
  // Ontbreekt het vermogensprofiel, is het ouder dan zes dagen of is er sindsdien
  // gereden, dan nu ophalen: anders wacht een nieuwe beste waarde op de wekelijkse
  // job (die een lid met een snapshot van deze week overslaat).
  await refreshSources(admin, user.id, 1_500).catch(() => null);
  // Zonder terugblik op de huidige schaal heeft de datumkiezer niets om naar terug
  // te gaan. De wekelijkse job slaat wie deze week al keek over, dus hier eenmalig
  // zelf; hooguit een paar seconden wachten, daarna gaat de pagina gewoon door.
  if (!(await hasTerugblik(admin, user.id))) {
    await Promise.race([
      storeTerugblik(admin, user.id, today).catch(() => 0),
      new Promise((resolve) => setTimeout(resolve, TERUGBLIK_WAIT_MS)),
    ]);
  }
  const [collected, history, sharing, shared, averages] = await Promise.all([
    collectBriljant(admin, user.id),
    loadHistory(admin, user.id),
    loadSharing(admin, user.id),
    loadHallStones(supabase, user.id),
    loadClubAverages(admin),
  ]);
  // Alleen de gemiddelden met genoeg leden.
  const averageStones = AVERAGE_STONES.filter((stone) => averages[stone.group] != null);
  // Wie zijn steen verbergt, ziet ook die van anderen niet (eigenaar, 2026-10-22;
  // in RLS sinds 0268). Het anonieme ZWB-gemiddelde en de records blijven.
  const hallStones = sharing ? shared : [];
  const members = hallStones.map(({ id, name }) => ({ id, name }));
  const live = briljantView({ seed: user.id, input: collected.input, consistency: collected.consistency, history });

  if (live.score == null) {
    return (
      <>
        <StatsTabs active="/stats/zwbriljant" title="ZWBriljant" />
        <EmptyState>
          <p>Nog te weinig gegevens voor je steen.</p>
          <p className="mt-2 text-sm">
            Ontbreekt: {live.missing.map((facet) => FACET_LABELS[facet]).join(", ")}.{" "}
            <Link href="/hulp/training#zwbriljant" className="underline underline-offset-2">
              Wat is er nodig?
            </Link>
          </p>
        </EmptyState>
      </>
    );
  }

  await rememberVisit(admin, user.id, collected);
  const snapshots = await loadOwnSnapshots(admin, user.id);

  // Een gekozen datum toont de week op of vóór die datum, uit de snapshots.
  const past = datum && datum < today ? snapshotAt(snapshots, datum) : null;
  // Je eigen stenen tonen ook de meting, teruggerekend uit de punten.
  const own = { sex: collected.input.sex };
  const view = past
    ? viewFromSnapshot({ seed: user.id, snapshot: past, source: `week van ${weekLabel(past.week)}`, own })
    : live;

  // Je mooiste steen: de week met de hoogste score, uit alles wat er bewaard is.
  const best = snapshots.reduce<(typeof snapshots)[number] | null>(
    (top, snapshot) => (snapshot.score != null && (top?.score == null || snapshot.score > top.score) ? snapshot : top),
    null,
  );

  // De recordsteen: elk onderdeel op de recordwaarde (Diamant), met de houders.
  const records = recordView(collected.input.sex);

  // De stenen die je naast de jouwe kunt zetten of in de galerij los kunt bekijken. Van
  // andere leden zie je alleen punten: een steen uit een snapshot zonder `own`.
  const stoneFor = (id: string): BriljantCompare | null => {
    if (id === "ik") return { id, name: "Jij", label: "Jij", short: "Jij", view: live };
    if (id === "records") {
      return { id, name: "Records", label: "Records", short: "Record", view: records.view, holders: records.holders };
    }
    if (id === "mooiste" && best) {
      return {
        id,
        name: `Mijn mooiste steen · ${weekLabel(best.week)}`,
        label: "Mijn mooiste steen",
        short: "Mooiste",
        view: viewFromSnapshot({ seed: user.id, snapshot: best, source: `week van ${weekLabel(best.week)}`, own }),
      };
    }
    const averageStone = averageStones.find((stone) => stone.id === id);
    const average = averageStone ? averages[averageStone.group] : null;
    if (averageStone && average) {
      return {
        id,
        name: `${averageStone.label} (${average.members} leden)`,
        label: averageStone.label,
        short: averageStone.short,
        subject: averageStone.subject,
        region: `${average.members} leden`,
        date: weekLabel(average.week),
        view: viewFromSnapshot({
          // De vorm van de steen hangt aan de seed; die van het ZWB-gemiddelde blijft.
          seed: id === "zwb" ? "zwb-gemiddelde" : id,
          snapshot: average,
          source: "gemiddelde van de laatste weken",
        }),
      };
    }
    const other = hallStones.find((stone) => stone.id === id);
    if (!other) return null;
    return {
      id,
      name: other.name,
      label: other.name,
      short: "Lid",
      subject: other.name,
      region: other.region,
      date: weekLabel(other.snapshot.week),
      view: viewFromSnapshot({ seed: id, snapshot: other.snapshot, source: `week van ${weekLabel(other.snapshot.week)}` }),
    };
  };

  // Drie tabbladen: Ik (je eigen steen, met datum), ZWB (de galerij, en een lid los)
  // en Vergelijken (een tweede steen naast de jouwe). Oude links met ?met= blijven werken.
  const tab: BriljantTab =
    params.tab === "zwb" || met === "zaal" ? "zwb" : params.tab === "vergelijken" || (met && params.tab !== "ik") ? "vergelijken" : "ik";
  const lid = tab === "zwb" && typeof params.lid === "string" ? params.lid : null;
  // Vergelijken: links (`van`, standaard jij) tegen rechts (`met`). Ook twee andere
  // leden tegen elkaar (eigenaar, 2026-10-22).
  const vanId = tab === "vergelijken" && typeof params.van === "string" ? params.van : "ik";
  const left = tab === "vergelijken" ? (stoneFor(vanId) ?? stoneFor("ik")!) : null;
  const fallback = left?.id === "ik" ? (averages.zwb ? "zwb" : (members[0]?.id ?? "records")) : "ik";
  const right = tab === "vergelijken" ? (met && met !== left?.id ? stoneFor(met) : null) ?? stoneFor(fallback) : null;
  // Een steen los in de galerij, of links bij vergelijken als dat niet jij bent.
  const subject = lid ? stoneFor(lid) : left && left.id !== "ik" ? left : null;
  const compare = right;
  // Zinnen alleen tussen jou, leden en het ZWB-gemiddelde: null is jij.
  const nameOf = (stone: BriljantCompare) => (stone.id === "ik" ? null : stone.subject);
  const lines =
    left && right && nameOf(left) !== undefined && nameOf(right) !== undefined
      ? compareLines(left.view, right.view, nameOf(left) as string | null, nameOf(right) as string | null)
      : [];

  // De galerij: je steen van nu, de gemiddelden, iedereen die deelt en de records,
  // elk met een bordje: renner, woonplaats of regio (als bekend), score en datum.
  let hall: BriljantHallStone[] | null = null;
  // De sponsors met een logo hangen aan de wand van de galerij (eigenaar, 2026-10-23).
  let sponsors: Array<{ id: string; name: string }> = [];
  if (tab === "zwb" && !subject) {
    const { data: sponsorRows } = await supabase
      .from("sponsors")
      .select("id, name")
      .eq("active", true)
      .not("logo_url", "is", null)
      .order("display_order");
    sponsors = (sponsorRows ?? []) as Array<{ id: string; name: string }>;
    const { data: ownProfile } = await supabase.from("profiles").select("region").eq("id", user.id).maybeSingle();
    const ownRegion = (ownProfile as { region: string | null } | null)?.region?.trim() || null;
    const others = [...averageStones.map((stone) => stone.id), ...hallStones.map((stone) => stone.id)]
      .map(stoneFor)
      .filter((stone): stone is BriljantCompare => stone != null);
    hall = [
      { id: "ik", name: "Jij", region: ownRegion, date: weekLabel(mondayKey(today)), view: live },
      ...others.map((stone) => ({ id: stone.id, name: stone.label, region: stone.region ?? null, date: stone.date ?? null, view: stone.view })),
      { id: "records", name: "Records", region: null, date: null, view: records.view },
    ];
  }

  return (
    <>
      <StatsTabs active="/stats/zwbriljant" title="ZWBriljant" />
      <BriljantView
        tab={tab}
        view={subject ? subject.view : tab === "ik" ? view : live}
        subject={subject}
        asOf={tab === "ik" && past ? past.week : null}
        asOfLabel={tab === "ik" && past ? weekLabel(past.week) : null}
        dates={{ first: snapshots.find((snapshot) => snapshot.score != null)?.week ?? null, today, chosen: datum }}
        compare={compare}
        lines={lines}
        options={{ averages: averageStones.map(({ id, label }) => ({ id, label })), members, best: best != null }}
        wins={tab === "ik" && !past ? bestWins(collected.input, live.consistency?.value ?? null).slice(0, 3) : []}
        hall={hall}
        sponsors={sponsors}
        hidden={!sharing}
      />
    </>
  );
}
