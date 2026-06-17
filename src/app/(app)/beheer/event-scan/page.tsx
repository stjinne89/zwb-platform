import { redirect } from "next/navigation";
import { ArrowUpRight, Check, EyeOff, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { HelpLink, PageHeader } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import type { ExternalEventSource } from "@/lib/events/external-scan";
import {
  addCandidateParticipants,
  followZwbMembersAction,
  ignoreAllCandidates,
  ignoreCandidate,
  publishCandidate,
  scanExternalEventCandidates,
  testZwiftClubConnection,
  updateCandidateMatchStatus,
} from "./_actions";
import { ScanButton } from "./_components/scan-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatStart(value: string) {
  return new Date(value).toLocaleString("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Amsterdam",
  });
}

type CandidateRow = {
  id: string;
  source: ExternalEventSource;
  external_id: string;
  external_url: string;
  title: string;
  start_at: string;
  distance_km: number | string | null;
  elevation_m: number | string | null;
  zwb_match_status: "unknown" | "likely" | "confirmed" | "manual";
  first_seen_at: string;
  last_seen_at: string;
  ignored_at: string | null;
  published_event_id: string | null;
  published_at: string | null;
};

type ParticipantRow = {
  id: string;
  candidate_id: string;
  external_name: string;
  category: string | null;
  profile_id: string | null;
};

const MATCH_LABELS: Record<CandidateRow["zwb_match_status"], string> = {
  unknown: "Onbekend",
  likely: "Waarschijnlijk",
  confirmed: "Bevestigd",
  manual: "Handmatig",
};

function sourceLabel(source: CandidateRow["source"]) {
  switch (source) {
    case "mywhoosh":
      return "MyWhoosh";
    case "zwift":
      return "Zwift";
  }
}

function numberText(value: number | string | null, suffix: string) {
  if (value == null || value === "") return "";
  return ` · ${Number(value).toLocaleString("nl-NL", {
    maximumFractionDigits: 1,
  })} ${suffix}`;
}

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function EventScanPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const scanStatus = firstParam(params, "scan");
  const scanFound = firstParam(params, "found");
  const scanSaved = firstParam(params, "saved");
  const scanAuto = firstParam(params, "auto");
  const clubStatus = firstParam(params, "club");
  const scanMessage = firstParam(params, "message");
  const importStatus = firstParam(params, "import");
  const importMatched = firstParam(params, "matched");
  const importSaved = firstParam(params, "saved");

  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) redirect("/login");
  if (!access.has("events.manage_all")) redirect("/dashboard");

  const admin = createAdminClient();
  const [{ data, error }, { data: participantRows }] = await Promise.all([
    admin
      .from("external_event_candidates")
      .select(
        "id, source, external_id, external_url, title, start_at, distance_km, elevation_m, zwb_match_status, first_seen_at, last_seen_at, ignored_at, published_event_id, published_at",
      )
      .order("start_at", { ascending: true }),
    admin
      .from("external_event_participants")
      .select("id, candidate_id, external_name, category, profile_id")
      .order("external_name", { ascending: true }),
  ]);
  const candidates = (data ?? []) as CandidateRow[];
  const participantsByCandidate = new Map<string, ParticipantRow[]>();
  for (const participant of (participantRows ?? []) as ParticipantRow[]) {
    const current = participantsByCandidate.get(participant.candidate_id) ?? [];
    current.push(participant);
    participantsByCandidate.set(participant.candidate_id, current);
  }
  const active = candidates;
  const unpublishedCount = candidates.filter(
    (candidate) => !candidate.published_event_id,
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eventscan"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <HelpLink href="/hulp#eventbeheer" />
            <form action={followZwbMembersAction}>
              <Button type="submit" variant="outline" size="sm">
                ZWB-leden volgen
              </Button>
            </form>
            <form action={testZwiftClubConnection}>
              <Button type="submit" variant="outline" size="sm">
                Test clubkoppeling
              </Button>
            </form>
            <form action={scanExternalEventCandidates}>
              <ScanButton />
            </form>
          </div>
        }
      />

      {(clubStatus === "test" || clubStatus === "follow") && scanMessage && (
        <section className="rounded-lg border bg-card p-4 text-xs text-muted-foreground">
          <pre className="whitespace-pre-wrap break-words font-mono">
            {scanMessage}
          </pre>
        </section>
      )}

      {scanStatus && (
        <section
          className={`rounded-lg border p-4 text-sm ${
            scanStatus === "error"
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "bg-card text-muted-foreground"
          }`}
        >
          {scanStatus === "ok" && (
            <p>
              Scan klaar: {scanFound ?? 0} gevonden, {scanSaved ?? 0} opgeslagen
              {scanAuto ? `, ${scanAuto} automatisch als ZWB herkend` : ""}.
            </p>
          )}
          {scanStatus === "empty" && <p>Scan klaar: geen events gevonden.</p>}
          {scanStatus === "error" && <p>Scan mislukt: {scanMessage}</p>}
          {scanStatus !== "error" && scanMessage && (
            <p className="mt-1">{scanMessage}</p>
          )}
        </section>
      )}

      {importStatus && (
        <section
          className={`rounded-lg border p-4 text-sm ${
            importStatus === "error"
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "bg-card text-muted-foreground"
          }`}
        >
          {importStatus === "ok" && (
            <p>
              Import klaar: {importMatched ?? 0} herkend, {importSaved ?? 0} opgeslagen.
            </p>
          )}
          {importStatus === "empty" && <p>Import klaar: geen nieuwe matches.</p>}
          {importStatus === "error" && <p>Import mislukt: {scanMessage}</p>}
          {importStatus !== "error" && scanMessage && (
            <p className="mt-1">{scanMessage}</p>
          )}
        </section>
      )}

      {error && (
        <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Kon concept-events niet laden: {error.message}
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <Metric label="Concepten" value={candidates.length} />
        <Metric label="Nog te beoordelen" value={unpublishedCount} />
      </section>

      <section className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <h2 className="font-semibold">Concept-events</h2>
          {unpublishedCount > 0 && (
            <form action={ignoreAllCandidates}>
              <Button type="submit" variant="ghost" size="sm">
                <EyeOff data-icon="inline-start" />
                Negeer alle
              </Button>
            </form>
          )}
        </div>
        {active.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Geen actieve concept-events.
          </p>
        ) : (
          <ul className="divide-y">
            {active.map((candidate) => (
              <CandidateItem
                key={candidate.id}
                candidate={candidate}
                participants={participantsByCandidate.get(candidate.id) ?? []}
              />
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

function CandidateItem({
  candidate,
  participants,
}: {
  candidate: CandidateRow;
  participants: ParticipantRow[];
}) {
  const published = Boolean(candidate.published_event_id);

  return (
    <li className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {sourceLabel(candidate.source)}
          </span>
          <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
            {MATCH_LABELS[candidate.zwb_match_status]}
          </span>
          <h3 className="truncate font-medium">{candidate.title}</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatStart(candidate.start_at)}
          {numberText(candidate.distance_km, "km")}
          {numberText(candidate.elevation_m, "hm")}
        </p>
        {participants.length > 0 && (
          <p className="mt-1 text-sm">
            <span className="font-medium">ZWB: </span>
            {participants
              .map((participant) =>
                participant.category
                  ? `${participant.external_name} (${participant.category})`
                  : participant.external_name,
              )
              .join(", ")}
          </p>
        )}
        {!published && (
          <details className="mt-3 rounded-md border bg-background/70 p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Deelnemers toevoegen
            </summary>
            <form action={addCandidateParticipants} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <input type="hidden" name="candidate_id" value={candidate.id} />
              <label className="grid gap-1 text-sm">
                <span className="font-medium">Namen</span>
                <textarea
                  name="participants"
                  rows={2}
                  className="min-h-16 rounded-md border bg-background px-2 py-1 text-sm"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  name="category"
                  defaultValue=""
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                >
                  <option value="">Cat.</option>
                  {["A", "B", "C", "D", "E"].map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" variant="outline">
                  <Plus data-icon="inline-start" />
                  Voeg toe
                </Button>
              </div>
            </form>
          </details>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
          <a
            href={candidate.external_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Bron
            <ArrowUpRight className="size-3" />
          </a>
          <span className="text-muted-foreground">
            Laatst gezien {formatStart(candidate.last_seen_at)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <form action={updateCandidateMatchStatus} className="flex items-center gap-1">
          <input type="hidden" name="candidate_id" value={candidate.id} />
          <select
            name="zwb_match_status"
            defaultValue={candidate.zwb_match_status}
            className="h-8 rounded-md border bg-background px-2 text-sm"
            disabled={published}
          >
            {Object.entries(MATCH_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="outline" disabled={published}>
            Opslaan
          </Button>
        </form>

        {published ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700 dark:text-green-400">
            <Check className="size-4" />
            Gepubliceerd
          </span>
        ) : (
          <>
            <form action={publishCandidate}>
              <input type="hidden" name="candidate_id" value={candidate.id} />
              <Button type="submit" size="sm">
                <Plus data-icon="inline-start" />
                Publiceer
              </Button>
            </form>
            <form action={ignoreCandidate}>
              <input type="hidden" name="candidate_id" value={candidate.id} />
              <Button type="submit" size="sm" variant="ghost">
                <EyeOff data-icon="inline-start" />
                Negeer
              </Button>
            </form>
          </>
        )}
      </div>
    </li>
  );
}
