import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/app-ui";
import { BriljantView, type BriljantCompare } from "@/components/briljant/briljant-view";
import { getRequestUser } from "@/lib/auth/request";
import { snapshotAt, viewFromSnapshot } from "@/lib/briljant/compare";
import { FACET_LABELS } from "@/lib/briljant/score";
import {
  collectBriljant,
  loadClubAverage,
  loadHistory,
  loadMemberSnapshot,
  loadOwnSnapshots,
  loadSharing,
  loadVisibleMembers,
  hasTerugblik,
  refreshSources,
  rememberVisit,
  storeTerugblik,
} from "@/lib/briljant/server";
import { bestWins, briljantView } from "@/lib/briljant/view";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZWBriljant" };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Zo lang wacht de pagina hooguit op een ontbrekende terugblik. */
const TERUGBLIK_WAIT_MS = 6_000;
const weekLabel = (monday: string) =>
  new Date(`${monday}T12:00:00Z`).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

export default async function BriljantPage({
  searchParams,
}: {
  searchParams: Promise<{ datum?: string | string[]; met?: string | string[] }>;
}) {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const datum = typeof params.datum === "string" && DAY.test(params.datum) ? params.datum : null;
  const met = typeof params.met === "string" ? params.met : null;

  const admin = createAdminClient();
  const supabase = await createClient();
  const today = amsterdamDayKey();
  // Ontbreekt het vermogensprofiel of is het ouder dan zes dagen, dan nu ophalen:
  // anders blijven vermogen en durability leeg tot de wekelijkse job (die een lid
  // met een snapshot van deze week overslaat).
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
  const [collected, history, sharing, members, average] = await Promise.all([
    collectBriljant(admin, user.id),
    loadHistory(admin, user.id),
    loadSharing(admin, user.id),
    loadVisibleMembers(supabase, user.id),
    loadClubAverage(admin),
  ]);
  const live = briljantView({ seed: user.id, input: collected.input, consistency: collected.consistency, history });

  if (live.score == null) {
    return (
      <EmptyState>
        <p>Nog te weinig gegevens voor je steen.</p>
        <p className="mt-2 text-sm">
          Ontbreekt: {live.missing.map((facet) => FACET_LABELS[facet]).join(", ")}.{" "}
          <Link href="/hulp/training#zwbriljant" className="underline underline-offset-2">
            Wat is er nodig?
          </Link>
        </p>
      </EmptyState>
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

  let compare: BriljantCompare | null = null;
  if (met === "mooiste" && best) {
    compare = {
      id: "mooiste",
      name: `Mijn mooiste steen · ${weekLabel(best.week)}`,
      label: "Mijn mooiste steen",
      short: "Mooiste",
      view: viewFromSnapshot({ seed: user.id, snapshot: best, source: `week van ${weekLabel(best.week)}`, own }),
    };
  } else if (met === "zwb" && average) {
    compare = {
      id: "zwb",
      name: `ZWB-gemiddelde (${average.members} leden)`,
      label: "ZWB-gemiddelde",
      short: "ZWB",
      view: viewFromSnapshot({ seed: "zwb-gemiddelde", snapshot: average, source: "gemiddelde van de laatste weken" }),
    };
  } else if (met && members.some((member) => member.id === met)) {
    const other = await loadMemberSnapshot(supabase, met);
    if (other) {
      compare = {
        id: met,
        name: other.name,
        label: other.name,
        short: "Lid",
        view: viewFromSnapshot({ seed: met, snapshot: other.snapshot, source: `week van ${weekLabel(other.snapshot.week)}` }),
      };
    }
  }

  return (
    <BriljantView
      view={view}
      asOf={past ? past.week : null}
      asOfLabel={past ? weekLabel(past.week) : null}
      dates={{ first: snapshots.find((snapshot) => snapshot.score != null)?.week ?? null, today, chosen: datum }}
      compare={compare}
      options={{ average: average ? { members: average.members } : null, members, sharing, best: best != null }}
      wins={past ? [] : bestWins(collected.input, live.consistency?.value ?? null).slice(0, 3)}
    />
  );
}
