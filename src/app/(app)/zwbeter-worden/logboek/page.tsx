import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app-ui";
import {
  estimateCycle,
  summarizeSymptomLoad,
  type SymptomLog,
} from "@/lib/training/symptoms";
import { LogForm } from "./_components/log-form";
import { OptInButton } from "./_components/opt-in";

export const dynamic = "force-dynamic";

function amsterdamToday(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

export default async function LogboekPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("symptom_tracking_enabled, sex")
    .eq("id", user.id)
    .maybeSingle();
  const enabled = Boolean(profile?.symptom_tracking_enabled);

  const header = (
    <PageHeader
      eyebrow="ZWB Training"
      title="Logboek"
      description="Hoe je je voelt, zodat je schema erop kan meebewegen."
    />
  );

  // Het logboek gaat over klachten rond de cyclus en is niet voor mannen
  // geschreven. Het menu-item is verborgen (nav-config), maar een bookmark of
  // een oude link komt hier nog steeds uit — vandaar ook deze controle.
  if (profile?.sex !== "vrouw") {
    return (
      <div className="space-y-6">
        {header}
        <section className="space-y-3 rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Het logboek is nu ingericht op klachten rond de cyclus en daarom
            alleen beschikbaar voor leden met{" "}
            <strong className="text-foreground">Vrouw</strong> bij{" "}
            <Link href="/profiel" className="underline underline-offset-2">
              geslacht in je profiel
            </Link>
            .
          </p>
          {/* Wie het logboek eerder aanzette moet het ook weer uit kunnen
              zetten; die knop staat alleen hier, dus zonder dit zou zijn
              klachtensignaal voor altijd naar het schema blijven gaan. */}
          {enabled ? <OptInButton enabled /> : null}
        </section>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="space-y-6">
        {header}
        <section className="space-y-3 rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Alleen jij ziet wat hier staat — je trainer niet. Zie de{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              privacyverklaring
            </Link>
            .
          </p>
          <OptInButton enabled={false} />
        </section>
      </div>
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - 120);
  const { data: logRows } = await supabase
    .from("symptom_logs")
    .select("id, log_date, severity, symptoms, cycle_start, note")
    .eq("profile_id", user.id)
    .gte("log_date", since.toISOString().slice(0, 10))
    .order("log_date", { ascending: false });

  const logs = (logRows ?? []) as SymptomLog[];
  const today = amsterdamToday();
  const load = summarizeSymptomLoad(logs);
  const cycle = estimateCycle(logs);

  return (
    <div className="space-y-6">
      {header}

      {(load || cycle) && (
        <section className="flex flex-wrap gap-4 rounded-lg border bg-card p-4 text-sm">
          {load && (
            <p>
              <span className="text-muted-foreground">Afgelopen week:</span>{" "}
              <strong>{load.label}</strong>{" "}
              <span className="text-muted-foreground">({load.days} dagen ingevuld)</span>
            </p>
          )}
          {cycle && (
            <p>
              <span className="text-muted-foreground">Laatste start:</span>{" "}
              <strong>
                {new Date(cycle.lastStart).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "short",
                })}
              </strong>
              {cycle.averageLengthDays && (
                <span className="text-muted-foreground">
                  {" "}
                  · gemiddeld {cycle.averageLengthDays} dagen
                </span>
              )}
            </p>
          )}
        </section>
      )}

      <LogForm
        today={today}
        existing={logs.find((log) => log.log_date === today) ?? null}
        recent={logs.slice(0, 21)}
      />

      <div className="flex justify-end">
        <OptInButton enabled />
      </div>
    </div>
  );
}
