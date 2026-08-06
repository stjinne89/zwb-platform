import { redirect } from "next/navigation";
import { Grid3x3, MapPin, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, HelpLink, PageHeader } from "@/components/app-ui";
import {
  countNewThisYear,
  fetchBlockCounts,
  fetchClubBlocks,
  fetchOwnBlocks,
} from "@/lib/zwblokken/query";
import { BlocksMap, type MemberOption } from "./_components/blocks-map";

export const dynamic = "force-dynamic";

const nl = (n: number) => n.toLocaleString("nl-NL");

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-card/90 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default async function ZwblokkenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [club, counts, ownBlocks, newThisYear, profilesResult] =
    await Promise.all([
      fetchClubBlocks(supabase),
      fetchBlockCounts(supabase),
      fetchOwnBlocks(supabase, user.id),
      countNewThisYear(supabase, user.id),
      supabase
        .from("profiles")
        .select("id, display_name")
        .eq("is_approved", true),
    ]);

  const profiles = (profilesResult.data ?? []) as {
    id: string;
    display_name: string | null;
  }[];

  // Alleen leden die daadwerkelijk blokken hebben; de kiezer moet geen lege
  // namen bevatten. De eigen naam staat altijd bovenaan.
  const members: MemberOption[] = profiles
    .map((p) => ({
      id: p.id,
      name: p.display_name ?? "Naamloos lid",
      blocks: counts.get(p.id) ?? 0,
    }))
    .filter((m) => m.blocks > 0 || m.id === user.id)
    .sort((a, b) => {
      if (a.id === user.id) return -1;
      if (b.id === user.id) return 1;
      return b.blocks - a.blocks;
    });

  const ownCount = counts.get(user.id) ?? 0;
  const leaderboard = members.filter((m) => m.blocks > 0).slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Club"
        title="ZWBlokken"
        description="Elk blok dat je ooit doorkruist hebt, kleurt in."
        actions={<HelpLink href="/hulp#zwblokken" />}
      />

      {club.total === 0 ? (
        <EmptyState>
          Er zijn nog geen ZWBlokken berekend. Zodra de Strava-sync gedraaid
          heeft, verschijnen ze hier.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              icon={<Grid3x3 className="size-3.5" />}
              label="Jouw blokken"
              value={nl(ownCount)}
            />
            <Stat
              icon={<Sparkles className="size-3.5" />}
              label="Nieuw dit jaar"
              value={nl(newThisYear)}
            />
            <Stat
              icon={<MapPin className="size-3.5" />}
              label="Hele club"
              value={nl(club.total)}
            />
          </div>

          <BlocksMap
            club={club.packed}
            maxRiders={club.maxRiders}
            initialOwn={ownBlocks}
            members={members}
            selectedId={user.id}
          />

          {leaderboard.length > 0 && (
            <section className="rounded-lg border bg-card/90 p-4">
              <h2 className="text-sm font-semibold">Meeste blokken</h2>
              <ol className="mt-3 space-y-1.5">
                {leaderboard.map((m, i) => (
                  <li
                    key={m.id}
                    className="flex items-baseline gap-3 text-sm"
                  >
                    <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                      {i + 1}
                    </span>
                    <span
                      className={
                        m.id === user.id ? "font-semibold" : undefined
                      }
                    >
                      {m.name}
                    </span>
                    <span className="ml-auto tabular-nums text-muted-foreground">
                      {nl(m.blocks)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  );
}
