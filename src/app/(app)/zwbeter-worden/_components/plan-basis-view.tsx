// Het tabblad Uitgangspunten: de persoonlijke voorkeuren, en daaronder waarop
// het lopende schema is gemaakt. Gedeeld door de ledenpagina en de trainerpagina.

import Link from "next/link";
import { SlidersHorizontal, UserRound } from "lucide-react";
import type { createAdminClient } from "@/lib/supabase/admin";
import { loadPlanBasisInput } from "@/lib/training/basis-input";
import { loadPreferences, MAX_PREFERENCES } from "@/lib/training/preferences";
import { planBasisGroups } from "./plan-basis";
import { PreferencesPanel } from "./preferences-panel";

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Amsterdam",
  });
}

export async function PlanBasisView({
  admin,
  profileId,
  currentUserId,
  showPreferences,
  showLinks = true,
}: {
  admin: ReturnType<typeof createAdminClient>;
  /** Over wie het gaat; voor de trainer de gekozen renner. */
  profileId: string;
  currentUserId: string;
  /** Alleen het lid en zijn aangewezen trainers zien en schrijven voorkeuren. */
  showPreferences: boolean;
  /** De links gaan naar de eigen pagina's van het lid; een trainer heeft er niets aan. */
  showLinks?: boolean;
}) {
  const [preferences, basis] = await Promise.all([
    showPreferences ? loadPreferences(admin, profileId) : Promise.resolve([]),
    loadPlanBasisInput(admin, profileId).catch(() => null),
  ]);

  const groups = basis ? planBasisGroups(basis.input) : [];
  // Wat het lopende schema al kende: op tekst vergeleken, want de invoer van een
  // generatie bewaart geen id's.
  const weighed = new Set((basis?.input.preferences ?? []).map((preference) => preference.text));
  const pendingIds = basis
    ? preferences.filter((preference) => !weighed.has(preference.body)).map((preference) => preference.id)
    : [];

  return (
    <div className="space-y-4">
      {showPreferences ? (
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <UserRound className="size-4" />
            Persoonlijke voorkeuren
          </h2>
          <PreferencesPanel
            profileId={profileId}
            currentUserId={currentUserId}
            preferences={preferences}
            pendingIds={pendingIds}
            full={preferences.length >= MAX_PREFERENCES}
          />
        </section>
      ) : null}

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <SlidersHorizontal className="size-4" />
          {basis ? `Meegewogen in het schema van ${fmtDay(basis.madeAt)}` : "Meegewogen in het schema"}
        </h2>

        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Er loopt nog geen schema.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {groups.map((group) => (
              <article key={group.id} className="rounded-md border bg-background p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">{group.title}</h3>
                  {group.link && showLinks ? (
                    <Link href={group.link.href} className="text-xs text-primary hover:underline">
                      {group.link.label}
                    </Link>
                  ) : null}
                </div>
                <dl className="mt-2 space-y-1 text-sm">
                  {group.rows.map((row, index) => (
                    <div key={`${row.label}-${index}`} className="flex justify-between gap-3">
                      <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
                      <dd className="text-right font-medium">{row.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">{group.effect}</p>
              </article>
            ))}
          </div>
        )}

        <Link
          href="/hulp/schema#uitgangspunten"
          className="inline-flex text-sm font-medium text-primary hover:underline"
        >
          De vaste regels
        </Link>
      </section>
    </div>
  );
}
