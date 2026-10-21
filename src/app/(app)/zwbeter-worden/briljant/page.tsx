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
  refreshSources,
  rememberVisit,
} from "@/lib/briljant/server";
import { bestWins, briljantView } from "@/lib/briljant/view";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZWBriljant" };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
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
  const view = past ? viewFromSnapshot({ seed: user.id, snapshot: past, source: `week van ${weekLabel(past.week)}` }) : live;

  let compare: BriljantCompare | null = null;
  if (met === "zwb" && average) {
    compare = {
      id: "zwb",
      name: `ZWB-gemiddelde (${average.members} leden)`,
      view: viewFromSnapshot({ seed: "zwb-gemiddelde", snapshot: average, source: "gemiddelde van de laatste weken" }),
    };
  } else if (met && met !== "zwb" && members.some((member) => member.id === met)) {
    const other = await loadMemberSnapshot(supabase, met);
    if (other) {
      compare = {
        id: met,
        name: other.name,
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
      options={{ average: average ? { members: average.members } : null, members, sharing }}
      wins={past ? [] : bestWins(collected.input, live.consistency?.value ?? null).slice(0, 3)}
    />
  );
}
