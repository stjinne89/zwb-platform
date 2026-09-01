import { redirect } from "next/navigation";
import { routes as zwiftRoutes } from "zwift-data";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/app-ui";
import { syncableRoutes } from "@/lib/events/zwift-route-sync";
import { runRouteProfileSpike, syncRouteLibrary } from "./_actions";
import { SpikeButton, SyncButton } from "./_components/spike-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type RouteRow = {
  route_id: number;
  slug: string;
  name: string;
  world: string | null;
  profile_distance_m: number | string | null;
  profile_elevation_m: number | string | null;
  profile_raw_elevation_m: number | string | null;
  synced_at: string | null;
  sync_error: string | null;
};

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function num(value: number | string | null) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function ZwiftRoutesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const message = firstParam(params, "message");

  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) redirect("/login");
  if (!access.has("events.manage_all")) redirect("/dashboard");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("zwift_routes")
    .select(
      "route_id, slug, name, world, profile_distance_m, profile_elevation_m, profile_raw_elevation_m, synced_at, sync_error",
    )
    .order("slug", { ascending: true });

  const stored = (data ?? []) as RouteRow[];
  const syncable = syncableRoutes();
  const withProfile = stored.filter((row) => row.synced_at);
  const withProblem = stored.filter((row) => row.sync_error);
  const oldestSync = stored
    .map((row) => row.synced_at)
    .filter((value): value is string => Boolean(value))
    .sort()[0];
  const remaining = syncable.length - withProfile.length;

  // Sorteer de probleemgevallen naar boven: die vragen om een beslissing, de
  // rest is achtergrond.
  const ordered = [...stored].sort((a, b) => {
    const problem = Number(Boolean(b.sync_error)) - Number(Boolean(a.sync_error));
    return problem !== 0 ? problem : a.slug.localeCompare(b.slug);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Zwift-routes"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <form action={runRouteProfileSpike}>
              <SpikeButton />
            </form>
            <form action={syncRouteLibrary}>
              <SyncButton
                label={remaining > 0 ? `Routes ophalen (${remaining})` : "Routes ophalen"}
              />
            </form>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Beschikbaar" value={syncable.length} />
        <Metric label="Met profiel" value={withProfile.length} />
        <Metric label="Segment past niet" value={withProblem.length} />
      </section>

      {oldestSync && (
        <p className="text-sm text-muted-foreground">
          Oudste opgehaalde profiel:{" "}
          {new Date(oldestSync).toLocaleString("nl-NL", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Europe/Amsterdam",
          })}
          . Loopt die op bij elke klik op &quot;Alles opnieuw&quot;, dan schiet de sweep op.
        </p>
      )}

      {message && (
        <section className="rounded-lg border bg-card p-4 text-xs">
          <pre className="whitespace-pre-wrap break-words font-mono">{message}</pre>
        </section>
      )}

      {error && (
        <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Kon de routebibliotheek niet laden: {error.message}
        </section>
      )}

      <section className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <h2 className="font-semibold">Opgehaalde routes</h2>
          {withProfile.length > 0 && (
            <form action={syncRouteLibrary}>
              <input type="hidden" name="refresh_all" value="1" />
              <SyncButton label="Alles opnieuw" />
            </form>
          )}
        </div>
        {stored.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Nog geen routes opgehaald.
          </p>
        ) : (
          <ul className="divide-y">
            {ordered.map((row) => (
              <RouteItem key={row.route_id} row={row} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function RouteItem({ row }: { row: RouteRow }) {
  const distanceKm = num(row.profile_distance_m);
  const elevationM = num(row.profile_elevation_m);
  const rawElevationM = num(row.profile_raw_elevation_m);
  // Waar zwift-data de route op houdt, zodat het verschil af te lezen is in
  // plaats van dat er alleen "aandacht nodig" staat.
  const meta = zwiftRoutes.find((item) => item.id === Number(row.route_id));

  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 p-4">
      <div className="min-w-0">
        <p className="truncate font-medium">{row.name}</p>
        <p className="text-sm text-muted-foreground">
          {row.world ?? "onbekende wereld"}
          {distanceKm != null && ` · ${(distanceKm / 1000).toFixed(1)} km`}
          {elevationM != null && ` · ${Math.round(elevationM)} hm`}
        </p>
        {meta && (
          <p className="text-xs text-muted-foreground">
            zwift-data: {meta.distance} km · {meta.elevation} hm
            {distanceKm != null &&
              ` · afstandsverschil ${(((distanceKm / 1000 - meta.distance) / meta.distance) * 100).toFixed(1)}%`}
            {/* Ruw naast gesmoothd: zo is te zien wat het smoothing-venster
                wegneemt en of zwift-data simpelweg de ruwe som overneemt. */}
            {rawElevationM != null && ` · ruw ${Math.round(rawElevationM)} hm`}
          </p>
        )}
        {row.sync_error && (
          <p className="mt-1 text-sm text-destructive">{row.sync_error}</p>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {row.synced_at
          ? new Date(row.synced_at).toLocaleDateString("nl-NL", {
              dateStyle: "medium",
              timeZone: "Europe/Amsterdam",
            })
          : "niet opgehaald"}
      </span>
    </li>
  );
}
