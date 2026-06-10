"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  GripVertical,
  Plus,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_TTT_SETTINGS,
  type TttPlanInput,
  type TttPlanRiderInput,
  type TttSettings,
} from "@/lib/ttt/types";
import { optimizeTttPlan, saveTttPlan } from "../_actions";

export type PlannerTeam = {
  id: string;
  name: string;
  type: string;
  division: string | null;
  parentTeamId: string | null;
};

export type PlannerEvent = {
  id: string;
  title: string;
  startAt: string;
  teamId: string | null;
};

export type PlannerRider = {
  id: string;
  name: string;
  zwiftId: string | null;
  zrlCategory: string | null;
  ftpWatts: number | null;
  weightKg: number | null;
  teamIds: string[];
  lineupEventIds: string[];
  watts5m: number | null;
  watts20m: number | null;
  ftpWkg: number | null;
  riderType: string | null;
};

export type SavedTttPlan = {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  eventTitle: string | null;
  teamName: string | null;
};

export type InitialTttPlan = TttPlanInput & {
  status: string;
  apiResponse: unknown;
};

function n(value: number | null | undefined, digits = 0) {
  if (value == null || !Number.isFinite(value)) return "-";
  return value.toLocaleString("nl-NL", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function toInputRider(rider: PlannerRider, displayOrder: number): TttPlanRiderInput {
  return {
    profileId: rider.id,
    isManual: false,
    zwiftId: rider.zwiftId ?? "",
    name: rider.name,
    ftpWatts: rider.ftpWatts,
    weightKg: rider.weightKg,
    heightCm: null,
    power300Watts: rider.watts5m ?? rider.ftpWatts,
    pullWatts: rider.ftpWatts,
    pullDurationSeconds: 30,
    displayOrder,
    role: null,
    notes: null,
  };
}

function defaultPlan(teams: PlannerTeam[]): TttPlanInput {
  const firstTeam = teams[0];
  return {
    name: "ZWB TTT plan",
    eventId: null,
    parentTeamId: firstTeam?.parentTeamId ?? firstTeam?.id ?? "",
    teamId: firstTeam?.id ?? null,
    settings: DEFAULT_TTT_SETTINGS,
    riders: [],
  };
}

function planText(plan: TttPlanInput, apiResponse: unknown) {
  const rows = plan.riders
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((rider, index) =>
      [
        index + 1,
        rider.name,
        rider.pullWatts ?? "",
        rider.pullDurationSeconds ?? "",
        rider.ftpWatts ?? "",
        rider.weightKg ?? "",
      ].join("\t"),
    );
  const summary =
    typeof apiResponse === "object" &&
    apiResponse &&
    "data" in apiResponse &&
    typeof apiResponse.data === "object" &&
    apiResponse.data
      ? JSON.stringify(apiResponse.data, null, 2)
      : "";
  return [
    plan.name,
    "Volgorde\tRider\tPull watts\tPull duur\tFTP\tGewicht",
    ...rows,
    "",
    summary,
  ].join("\n");
}

function downloadFile(name: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function apiData(apiResponse: unknown) {
  return typeof apiResponse === "object" &&
    apiResponse &&
    "data" in apiResponse &&
    typeof apiResponse.data === "object" &&
    apiResponse.data
    ? (apiResponse.data as Record<string, unknown>)
    : null;
}

function routeLabel(value: unknown) {
  if (value === "next_wtrl" || value === "next_zrl") return "Next ZRL";
  if (value === "next") return "Next";
  return String(value ?? "-");
}

export function TttPlanner({
  teams,
  events,
  riders,
  savedPlans,
  manageableTeamIds,
  initialPlan,
}: {
  teams: PlannerTeam[];
  events: PlannerEvent[];
  riders: PlannerRider[];
  savedPlans: SavedTttPlan[];
  manageableTeamIds: string[];
  initialPlan: InitialTttPlan | null;
}) {
  const [planId, setPlanId] = useState(initialPlan?.id ?? null);
  const [name, setName] = useState(initialPlan?.name ?? defaultPlan(teams).name);
  const [eventId, setEventId] = useState(initialPlan?.eventId ?? null);
  const [parentTeamId, setParentTeamId] = useState(
    initialPlan?.parentTeamId ?? defaultPlan(teams).parentTeamId,
  );
  const [teamId, setTeamId] = useState(initialPlan?.teamId ?? defaultPlan(teams).teamId);
  const [settings, setSettings] = useState<TttSettings>(
    initialPlan?.settings ?? DEFAULT_TTT_SETTINGS,
  );
  const [raceRiders, setRaceRiders] = useState<TttPlanRiderInput[]>(
    initialPlan?.riders ?? [],
  );
  const [apiResponse, setApiResponse] = useState<unknown>(initialPlan?.apiResponse ?? null);
  const [status, setStatus] = useState<
    { kind: "idle" | "saved" | "optimized"; message?: string } | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [pending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const managed = manageableTeamIds.includes(parentTeamId) || (teamId ? manageableTeamIds.includes(teamId) : false);

  const teamOptions = useMemo(
    () =>
      teams.filter(
        (team) =>
          team.id === parentTeamId ||
          team.parentTeamId === parentTeamId ||
          (!parentTeamId && !team.parentTeamId),
      ),
    [teams, parentTeamId],
  );

  const roster = useMemo(() => {
    const ids = new Set([parentTeamId, teamId].filter(Boolean));
    const selectedIds = new Set(raceRiders.map((rider) => rider.profileId).filter(Boolean));
    return riders
      .filter((rider) => rider.teamIds.some((id) => ids.has(id)))
      .filter((rider) => !selectedIds.has(rider.id))
      .sort((a, b) => {
        const aLineup = eventId && a.lineupEventIds.includes(eventId) ? 0 : 1;
        const bLineup = eventId && b.lineupEventIds.includes(eventId) ? 0 : 1;
        if (aLineup !== bLineup) return aLineup - bLineup;
        return a.name.localeCompare(b.name, "nl");
      });
  }, [riders, raceRiders, parentTeamId, teamId, eventId]);

  const resultData = apiData(apiResponse);

  function currentPlan(): TttPlanInput {
    return {
      id: planId,
      name,
      eventId,
      parentTeamId,
      teamId,
      settings,
      riders: raceRiders.map((rider, index) => ({ ...rider, displayOrder: index })),
    };
  }

  function addRider(rider: PlannerRider) {
    if (raceRiders.length >= 8) {
      setStatus({ kind: "error", message: "Maximaal 8 riders in de race sheet." });
      return;
    }
    setRaceRiders((current) => [...current, toInputRider(rider, current.length)]);
  }

  function addManualRider() {
    if (raceRiders.length >= 8) {
      setStatus({ kind: "error", message: "Maximaal 8 riders in de race sheet." });
      return;
    }
    setRaceRiders((current) => [
      ...current,
      {
        profileId: null,
        isManual: true,
        zwiftId: "",
        name: `Gast ${current.filter((r) => r.isManual).length + 1}`,
        ftpWatts: null,
        weightKg: null,
        heightCm: null,
        power300Watts: null,
        pullWatts: null,
        pullDurationSeconds: 30,
        displayOrder: current.length,
        role: null,
        notes: null,
      },
    ]);
  }

  function patchRider(index: number, patch: Partial<TttPlanRiderInput>) {
    setRaceRiders((current) =>
      current.map((rider, i) => (i === index ? { ...rider, ...patch } : rider)),
    );
  }

  function moveRider(from: number, to: number) {
    setRaceRiders((current) => {
      if (to < 0 || to >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((rider, index) => ({ ...rider, displayOrder: index }));
    });
  }

  function save() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await saveTttPlan(currentPlan());
      if (res.ok) {
        setPlanId(res.planId);
        setStatus({ kind: "saved", message: res.message });
      } else {
        setStatus({ kind: "error", message: res.error });
      }
    });
  }

  function optimize() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await optimizeTttPlan(currentPlan());
      if (res.ok) {
        setPlanId(res.planId);
        if (res.apiResponse !== undefined) setApiResponse(res.apiResponse);
        setStatus({ kind: "optimized", message: res.message });
      } else {
        setStatus({ kind: "error", message: res.error });
      }
    });
  }

  function exportImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0f2a32";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#d6b46b";
    ctx.font = "bold 36px system-ui";
    ctx.fillText(name, 48, 64);
    ctx.fillStyle = "#ffffff";
    ctx.font = "20px system-ui";
    ctx.fillText(
      `Route ${settings.route} - ${raceRiders.length} riders`,
      48,
      100,
    );
    ctx.font = "18px ui-monospace, monospace";
    raceRiders.forEach((rider, index) => {
      const y = 150 + index * 56;
      ctx.fillStyle = index % 2 === 0 ? "#173b45" : "#12313a";
      ctx.fillRect(40, y - 34, 1120, 44);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${index + 1}. ${rider.name}`, 60, y - 6);
      ctx.fillStyle = "#d6b46b";
      ctx.fillText(`${rider.pullWatts ?? "-"}w`, 520, y - 6);
      ctx.fillText(`${rider.pullDurationSeconds ?? "-"}s`, 660, y - 6);
      ctx.fillText(`FTP ${rider.ftpWatts ?? "-"}`, 820, y - 6);
    });
    const a = document.createElement("a");
    a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "ttt-plan"}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  }

  function loadPlanHref(plan: SavedTttPlan) {
    return `/teams/ttt-planner?plan=${plan.id}`;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="rounded-lg border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Plannaam</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Event</span>
              <select
                value={eventId ?? ""}
                onChange={(e) => setEventId(e.target.value || null)}
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                <option value="">Geen event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {new Date(event.startAt).toLocaleDateString("nl-NL", {
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    - {event.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Parent team</span>
              <select
                value={parentTeamId}
                onChange={(e) => {
                  const next = e.target.value;
                  setParentTeamId(next);
                  setTeamId(next);
                }}
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                {teams
                  .filter((team) => !team.parentTeamId)
                  .map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Race team</span>
              <select
                value={teamId ?? ""}
                onChange={(e) => setTeamId(e.target.value || null)}
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                {teamOptions.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <SelectSetting label="Route" value={settings.route === "next_wtrl" ? "next_zrl" : settings.route} onChange={(route) => setSettings({ ...settings, route })} options={[["next_zrl", "Next ZRL"], ["next", "Next"]]} />
            <NumberSetting label="Target kph" value={settings.targetSpeed} min={20} max={60} step={0.1} onChange={(targetSpeed) => setSettings({ ...settings, targetSpeed })} />
            <NumberSetting label="Intensity" value={settings.intensity} min={-3} max={3} step={1} onChange={(intensity) => setSettings({ ...settings, intensity: intensity ?? 0 })} />
            <NumberSetting label="Efficiency" value={settings.efficiency} min={-2} max={2} step={1} onChange={(efficiency) => setSettings({ ...settings, efficiency: efficiency ?? 0 })} />
            <SelectSetting label="Strategie" value={settings.optimizationStrategy} onChange={(optimizationStrategy) => setSettings({ ...settings, optimizationStrategy })} options={[["variable", "Variable"], ["fixed", "Fixed"]]} />
            <NumberSetting label="Min pull" value={settings.minPullDuration} min={10} max={120} step={5} onChange={(minPullDuration) => setSettings({ ...settings, minPullDuration: minPullDuration ?? 30 })} />
            <NumberSetting label="Max pull" value={settings.maxPullDuration} min={30} max={600} step={15} onChange={(maxPullDuration) => setSettings({ ...settings, maxPullDuration: maxPullDuration ?? 180 })} />
            <SelectSetting label="Interval" value={String(settings.durationInterval)} onChange={(durationInterval) => setSettings({ ...settings, durationInterval: durationInterval === "10" ? 10 : 15 })} options={[["15", "15s"], ["10", "10s"]]} />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.allowZeroPulls}
              onChange={(e) => setSettings({ ...settings, allowZeroPulls: e.target.checked })}
            />
            Allow zero pulls
          </label>
        </div>

        <aside className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold">Opgeslagen plannen</h2>
          {savedPlans.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nog geen TTT-plannen.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {savedPlans.map((plan) => (
                <li key={plan.id}>
                  <Link
                    href={loadPlanHref(plan)}
                    className="block rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
                  >
                    <span className="block font-medium">{plan.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {plan.teamName ?? "Team"} - {plan.eventTitle ?? "Geen event"} - {plan.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.3fr]">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Teamleden</h2>
            <Button size="sm" variant="outline" onClick={addManualRider}>
              <Plus className="size-4" />
              Gast
            </Button>
          </div>
          <ul className="mt-3 max-h-[580px] space-y-2 overflow-y-auto pr-1">
            {roster.map((rider) => (
              <li key={rider.id} className="rounded-md border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{rider.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rider.zrlCategory ? `Cat ${rider.zrlCategory} - ` : ""}
                      FTP {rider.ftpWatts ?? "-"}w - 5m {rider.watts5m ?? "-"}w
                      {eventId && rider.lineupEventIds.includes(eventId) ? " - lineup" : ""}
                    </p>
                  </div>
                  <Button size="icon-sm" variant="outline" onClick={() => addRider(rider)}>
                    <Plus className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border bg-card p-4" ref={imageRef}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Raceplan ({raceRiders.length}/8)</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={!managed || pending} onClick={save}>
                <Save className="size-4" />
                Opslaan
              </Button>
              <Button size="sm" disabled={!managed || pending} onClick={optimize}>
                <Sparkles className="size-4" />
                Optimaliseren
              </Button>
            </div>
          </div>

          {raceRiders.length === 0 ? (
            <p className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Voeg renners toe uit het team of maak een gast aan.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {raceRiders.map((rider, index) => (
                <li
                  key={`${rider.profileId ?? "manual"}-${index}`}
                  draggable
                  onDragStart={() => setDragId(String(index))}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragId != null) moveRider(Number(dragId), index);
                    setDragId(null);
                  }}
                  className="rounded-md border bg-background p-3"
                >
                  <div className="grid gap-2 lg:grid-cols-[24px_1.2fr_repeat(6,minmax(70px,1fr))_72px] lg:items-end">
                    <GripVertical className="mt-2 size-4 text-muted-foreground" />
                    <Field label="Naam" value={rider.name} onChange={(name) => patchRider(index, { name })} />
                    <Field label="Zwift ID" value={rider.zwiftId} onChange={(zwiftId) => patchRider(index, { zwiftId })} />
                    <NumberField label="FTP" value={rider.ftpWatts} onChange={(ftpWatts) => patchRider(index, { ftpWatts })} />
                    <NumberField label="Kg" value={rider.weightKg} step={0.1} onChange={(weightKg) => patchRider(index, { weightKg })} />
                    <NumberField label="Cm" value={rider.heightCm} onChange={(heightCm) => patchRider(index, { heightCm })} />
                    <NumberField label="300s" value={rider.power300Watts} onChange={(power300Watts) => patchRider(index, { power300Watts })} />
                    <NumberField label="Pull w" value={rider.pullWatts} onChange={(pullWatts) => patchRider(index, { pullWatts })} />
                    <div className="flex items-center gap-1">
                      <Button size="icon-xs" variant="ghost" onClick={() => moveRider(index, index - 1)}>
                        <ArrowUp className="size-3" />
                      </Button>
                      <Button size="icon-xs" variant="ghost" onClick={() => moveRider(index, index + 1)}>
                        <ArrowDown className="size-3" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => setRaceRiders((cur) => cur.filter((_, i) => i !== index))}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-[120px_1fr]">
                    <NumberField label="Pull duur" value={rider.pullDurationSeconds} onChange={(pullDurationSeconds) => patchRider(index, { pullDurationSeconds })} />
                    <Field label="Notities" value={rider.notes ?? ""} onChange={(notes) => patchRider(index, { notes })} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {status.kind === "error" && (
            <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {status.message}
            </p>
          )}
          {(status.kind === "saved" || status.kind === "optimized") && (
            <p className="mt-3 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              {status.message}
              {planId && (
                <>
                  {" "}
                  <Link href={`/teams/ttt-planner/${planId}`} className="underline">
                    Open deelpagina
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Resultaat en export</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadFile("ttt-plan.json", "application/json", JSON.stringify({ plan: currentPlan(), apiResponse }, null, 2))}
            >
              <Download className="size-4" />
              Planbestand
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadFile("ttt-plan.txt", "text/plain", planText(currentPlan(), apiResponse))}
            >
              <Download className="size-4" />
              Text
            </Button>
            <Button size="sm" variant="outline" onClick={exportImage}>
              <Download className="size-4" />
              PNG
            </Button>
          </div>
        </div>

        {resultData ? (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Metric label="Geschatte tijd" value={formatSeconds(resultData.estimated_time_seconds)} />
            <Metric label="Gem. snelheid" value={resultData.estimated_avg_speed ? `${n(Number(resultData.estimated_avg_speed), 1)} kph` : "-"} />
            <Metric label="Team power" value={resultData.team_avg_power ? `${n(Number(resultData.team_avg_power))}w` : "-"} />
            <Metric label="Route" value={routeLabel(resultData.route ?? settings.route)} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Nog geen optimalisatie gedraaid.
          </p>
        )}
      </section>
    </div>
  );
}

function formatSeconds(value: unknown) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return [h, m, s]
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, "0")))
    .filter((part, index) => index > 0 || part !== "0")
    .join(":");
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border bg-card px-2 py-1.5"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  value: number | null;
  step?: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="text-xs">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <input
        type="number"
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full rounded-md border bg-card px-2 py-1.5"
      />
    </label>
  );
}

function NumberSetting({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  step: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full rounded-md border bg-background px-3 py-2"
      />
    </label>
  );
}

function SelectSetting<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-md border bg-background px-3 py-2"
      >
        {options.map(([option, label]) => (
          <option key={option} value={option}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
