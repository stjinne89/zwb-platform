"use client";

import { useOptimistic, useState, useTransition, type CSSProperties, type DragEvent } from "react";
import { X } from "lucide-react";
import { MemberLink } from "@/components/member-link";
import { Button } from "@/components/ui/button";
import {
  LADDER_RANKS,
  LADDER_ROSTER_SIZE,
  applyLadderDraft,
  checkLadderTeam,
  ladderRankName,
  parseLadderRank,
  sortPuzzleRiders,
  type LadderBand,
  type LadderCheckLevel,
  type LadderDraft,
  type LadderPuzzleRider,
  type LadderPuzzleTeam,
  type LadderTeamCheck,
} from "@/lib/club-ladder/puzzle";
import {
  ZMAP_CAP_HIGH,
  ZMAP_CAP_LOW,
  checkLadderTeamZmap,
  formatWkg,
  sortByZmap,
  type ZmapRiderStatus,
  type ZmapTeamCheck,
} from "@/lib/club-ladder/zmap-rule";
import { zValueSourceLabel } from "@/lib/teams/zrl-ranking";
import { cn } from "@/lib/utils";
import {
  addLadderRosterRider,
  moveLadderDraftRider,
  moveLadderPuzzleRider,
  resetLadderDraft,
  withdrawLadderRider,
  setLadderRiderRank,
  setLadderTeamBand,
} from "../_actions";

/** Kleur per rank, Diamond tot Copper; leesbaar in licht en donker. */
const RANK_COLORS: Record<number, string> = {
  1: "#4cc3dc",
  2: "#d6336c",
  3: "#2f9e6b",
  4: "#2f62c9",
  5: "#8e5cc9",
  6: "#7f93a6",
  7: "#c9a227",
  8: "#9aa1a8",
  9: "#a8713d",
  10: "#b5653a",
};

const LEVEL_LABEL: Record<LadderCheckLevel, string> = { ok: "Past", warn: "Past bijna", bad: "Past niet" };

const LEVEL_PILL: Record<LadderCheckLevel, string> = {
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  bad: "bg-destructive/15 text-destructive",
};

const SELECT =
  "min-h-11 rounded-md border border-input bg-background px-1.5 py-1 text-xs sm:min-h-8";
const FIELD =
  "min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-2 py-1.5 text-sm sm:min-h-9";

const BENCH = "";

type Mode = "nu" | "s8";
const MODES: Array<{ id: Mode; label: string }> = [
  { id: "nu", label: "Nu" },
  { id: "s8", label: "Seizoen 8" },
];

const TONE_LABEL: Record<ZmapRiderStatus, string> = {
  ok: "Past",
  risk: "Risico",
  out: "Valt buiten",
  unknown: "Geen zMAP",
};
const TONE_TILE: Record<ZmapRiderStatus, string> = {
  ok: "border-emerald-500/60 bg-emerald-500/10",
  risk: "border-yellow-500/70 bg-yellow-400/15",
  out: "border-destructive bg-destructive/10",
  unknown: "",
};
const TONE_BAR: Record<ZmapRiderStatus, string> = {
  ok: "bg-emerald-500",
  risk: "bg-yellow-400",
  out: "bg-destructive",
  unknown: "bg-border",
};

/** "4,60–5,80", "vanaf 4,60", "tot 3,70" of "alles". */
function roomText(room: [number, number]) {
  const [from, to] = room;
  if (from <= ZMAP_CAP_LOW && to >= ZMAP_CAP_HIGH) return "alles";
  if (to >= ZMAP_CAP_HIGH) return `vanaf ${formatWkg(from)}`;
  if (from <= ZMAP_CAP_LOW) return `tot ${formatWkg(to)}`;
  return `${formatWkg(from)}–${formatWkg(to)}`;
}

type State = { teams: LadderPuzzleTeam[]; riders: LadderPuzzleRider[]; draft: LadderDraft };
type Change =
  | { type: "move"; key: string; teamId: string | null }
  | { type: "draft"; key: string; teamId: string | null }
  | { type: "draftReset" }
  | { type: "rank"; zwiftId: string; rank: number | null }
  | { type: "band"; teamId: string; band: LadderBand | null }
  | { type: "remove"; key: string };

function apply(state: State, change: Change): State {
  switch (change.type) {
    case "move":
      return {
        ...state,
        riders: state.riders.map((r) => (r.key === change.key ? { ...r, teamId: change.teamId } : r)),
      };
    case "draft":
      return { ...state, draft: { ...state.draft, [change.key]: change.teamId } };
    case "draftReset":
      return { ...state, draft: {} };
    case "rank":
      return {
        ...state,
        riders: state.riders.map((r) => (r.zwiftId === change.zwiftId ? { ...r, rank: change.rank } : r)),
      };
    case "remove":
      return { ...state, riders: state.riders.filter((r) => r.key !== change.key) };
    case "band":
      return {
        ...state,
        teams: change.band
          ? state.teams.map((t) => (t.id === change.teamId ? { ...t, band: change.band! } : t))
          : state.teams.filter((t) => t.id !== change.teamId),
      };
  }
}

type Result = { ok: boolean; error?: string };

export function LadderPuzzle({
  teams,
  riders,
  otherTeams,
  canEdit,
  season8 = false,
  draft = {},
}: {
  teams: LadderPuzzleTeam[];
  riders: LadderPuzzleRider[];
  /** Ladderteams zonder band, die nog in de puzzel kunnen. */
  otherTeams: Array<{ id: string; name: string }>;
  canEdit: boolean;
  /** Toggle naar de zMAP-regel van seizoen 8; de renners hebben dan een zMAP. */
  season8?: boolean;
  /** Conceptindeling voor seizoen 8 (0371); slepen in Seizoen 8 verandert alleen dit. */
  draft?: LadderDraft;
}) {
  const [state, applyOptimistic] = useOptimistic<State, Change>({ teams, riders, draft }, apply);
  const [mode, setMode] = useState<Mode>("nu");
  const s8 = season8 && mode === "s8";
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropLane, setDropLane] = useState<string | null>(null);

  function run(change: Change | null, action: () => Promise<Result>) {
    setError(null);
    startTransition(async () => {
      if (change) applyOptimistic(change);
      const res = await action();
      if (!res.ok) setError(res.error ?? "Mislukt.");
    });
  }

  // In Seizoen 8 ligt iedereen waar het concept hem legt; de echte teams blijven staan.
  const board = s8 ? applyLadderDraft(state.riders, state.draft) : state.riders;
  const hasDraft = Object.keys(state.draft).length > 0;

  function move(key: string, teamId: string | null) {
    const rider = board.find((r) => r.key === key);
    if (!rider || rider.teamId === teamId) return;
    setPlaced(key);
    const ref = { kind: rider.kind, id: rider.id };
    if (s8) run({ type: "draft", key, teamId }, () => moveLadderDraftRider(ref, teamId));
    else run({ type: "move", key, teamId }, () => moveLadderPuzzleRider(ref, teamId));
  }

  function resetDraft() {
    if (!window.confirm("Concept terugzetten op de indeling van nu?")) return;
    run({ type: "draftReset" }, () => resetLadderDraft());
  }

  const checks = new Map(
    state.teams.map((team) => [
      team.id,
      checkLadderTeam(team, board.filter((r) => r.teamId === team.id)),
    ]),
  );
  const zChecks = new Map(
    s8
      ? state.teams.map((team) => [
          team.id,
          checkLadderTeamZmap(board.filter((r) => r.teamId === team.id)),
        ])
      : [],
  );
  const levelOf = (teamId: string) => (s8 ? zChecks.get(teamId)?.level : checks.get(teamId)?.level);
  // Seizoen 8: de ladder zet teams op hun mediaan-zMAP, dus ook hier.
  const shownTeams = s8
    ? [...state.teams].sort(
        (a, b) => (zChecks.get(b.id)?.median ?? -1) - (zChecks.get(a.id)?.median ?? -1),
      )
    : state.teams;
  const teamIds = new Set(state.teams.map((t) => t.id));
  const loose = board.filter((r) => !r.teamId || !teamIds.has(r.teamId));
  const fits = state.teams.filter((t) => levelOf(t.id) === "ok").length;
  const done = state.teams.length > 0 && fits === state.teams.length && loose.length === 0;

  const lanes = [
    ...state.teams.map((team) => ({ id: team.id, team })),
    { id: BENCH, team: null },
  ];

  function piece(rider: LadderPuzzleRider, check: LadderTeamCheck | null, zCheck: ZmapTeamCheck | null = null) {
    return (
      <Piece
        key={rider.key}
        rider={rider}
        check={check}
        s8={s8}
        zCheck={zCheck}
        lanes={lanes}
        canEdit={canEdit}
        pending={pending}
        justPlaced={placed === rider.key}
        dragging={dragKey === rider.key}
        onDragStart={(event) => {
          event.dataTransfer.setData("text/plain", rider.key);
          event.dataTransfer.effectAllowed = "move";
          setDragKey(rider.key);
        }}
        onDragEnd={() => {
          setDragKey(null);
          setDropLane(null);
        }}
        onMove={(teamId) => move(rider.key, teamId)}
        onRank={(rank) =>
          rider.zwiftId &&
          run({ type: "rank", zwiftId: rider.zwiftId, rank }, () => setLadderRiderRank(rider.zwiftId!, rank))
        }
        onRemove={() => {
          if (!window.confirm(`${rider.name} uit de ladder halen?`)) return;
          run({ type: "remove", key: rider.key }, () =>
            withdrawLadderRider({ kind: rider.kind, id: rider.id }),
          );
        }}
      />
    );
  }

  function dropProps(laneId: string) {
    if (!canEdit) return {};
    return {
      onDragOver: (event: DragEvent) => {
        if (!dragKey) return;
        event.preventDefault();
        setDropLane(laneId);
      },
      onDragLeave: () => setDropLane((current) => (current === laneId ? null : current)),
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        const key = event.dataTransfer.getData("text/plain") || dragKey;
        setDropLane(null);
        setDragKey(null);
        if (key) move(key, laneId || null);
      },
    };
  }

  return (
    <section id="ladderpuzzel" className="scroll-mt-20 space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold">Ladderpuzzel</h2>
          {season8 && (
            <div className="inline-flex gap-1" role="group" aria-label="Regels">
              {MODES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={mode === option.id}
                  onClick={() => setMode(option.id)}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full border px-3 text-xs font-medium transition sm:min-h-8",
                    mode === option.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {s8 && canEdit && hasDraft && (
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={resetDraft}>
              Opnieuw van Nu
            </Button>
          )}
        </div>
        {state.teams.length > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
            <span className="inline-flex gap-0.5" aria-hidden="true">
              {state.teams.map((team) => (
                <i
                  key={team.id}
                  className={cn(
                    "size-2.5 rounded-[3px]",
                    levelOf(team.id) === "ok" ? "bg-primary" : "bg-background/30",
                  )}
                />
              ))}
            </span>
            {done
              ? "Compleet"
              : `${fits} van ${state.teams.length} passen${loose.length ? `, ${loose.length} los` : ""}`}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid items-start gap-3 sm:grid-cols-[repeat(auto-fill,minmax(13.5rem,1fr))]">
        {shownTeams.map((team) => {
          const inLane = board.filter((r) => r.teamId === team.id);
          const laneRiders = s8 ? sortByZmap(inLane) : sortPuzzleRiders(inLane);
          const check = checks.get(team.id)!;
          const zCheck = zChecks.get(team.id) ?? null;
          return (
            <section
              key={team.id}
              aria-label={team.name}
              className={cn(
                "grid min-w-0 content-start gap-2.5 rounded-lg border bg-card p-3",
                dropLane === team.id && "outline-2 -outline-offset-4 outline-primary outline-dashed",
              )}
              {...dropProps(team.id)}
            >
              <LaneHead
                team={team}
                check={check}
                zCheck={zCheck}
                count={laneRiders.length}
                riders={laneRiders}
                canEdit={canEdit}
                pending={pending}
                onBand={(band) => run({ type: "band", teamId: team.id, band }, () => setLadderTeamBand(team.id, band))}
              />
              <div className="ladder-stukken">{laneRiders.map((rider) => piece(rider, check, zCheck))}</div>
            </section>
          );
        })}
      </div>

      <section
        aria-label="Losse stukjes"
        className={cn(
          "grid gap-3 rounded-lg border border-dashed bg-muted p-3",
          canEdit && "md:grid-cols-[minmax(0,1fr)_15rem]",
          dropLane === BENCH && "outline-2 -outline-offset-4 outline-primary outline-dashed",
        )}
        style={{ "--ladder-gat": "var(--muted)" } as CSSProperties}
        {...dropProps(BENCH)}
      >
        <div className="min-w-0">
          <LaneHead
            team={null}
            check={null}
            zCheck={null}
            count={loose.length}
            riders={loose}
            canEdit={canEdit}
            pending={pending}
            onBand={() => {}}
          />
          <div className="ladder-stukken sm:grid-cols-[repeat(auto-fill,minmax(13.5rem,1fr))] sm:gap-x-3">
            {(s8 ? sortByZmap(loose) : sortPuzzleRiders(loose)).map((rider) => piece(rider, null))}
          </div>
        </div>
        {canEdit && <AddRider pending={pending} run={run} />}
      </section>

      {canEdit && !s8 && otherTeams.length > 0 && (
        <AddTeam teams={otherTeams} pending={pending} run={run} />
      )}
    </section>
  );
}

function LaneHead({
  team,
  check,
  zCheck,
  count,
  riders,
  canEdit,
  pending,
  onBand,
}: {
  team: LadderPuzzleTeam | null;
  check: LadderTeamCheck | null;
  /** Gezet in de stand Seizoen 8. */
  zCheck: ZmapTeamCheck | null;
  count: number;
  riders: LadderPuzzleRider[];
  canEdit: boolean;
  pending: boolean;
  onBand: (band: LadderBand | null) => void;
}) {
  if (!team || !check) {
    return (
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Losse stukjes</h3>
        <span className="text-sm tabular-nums text-muted-foreground">{count}</span>
      </div>
    );
  }

  const counts = new Map<number, number>();
  for (const rider of riders) if (rider.rank != null) counts.set(rider.rank, (counts.get(rider.rank) ?? 0) + 1);
  const allowed = check.allowed;
  const level = zCheck?.level ?? check.level;

  const head = (
    <div className="flex items-center gap-2">
      <h3 className="min-w-0 truncate font-semibold">{team.name}</h3>
      {team.archived && (
        <span className="shrink-0 rounded border px-1 text-[0.7rem] text-muted-foreground">archief</span>
      )}
      <span className="ml-auto shrink-0 text-sm tabular-nums text-muted-foreground">
        {count}/{LADDER_ROSTER_SIZE}
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide",
          LEVEL_PILL[level],
        )}
      >
        {LEVEL_LABEL[level]}
      </span>
    </div>
  );

  if (zCheck) {
    return (
      <div className="grid gap-2">
        {head}
        <dl className="grid grid-cols-3 gap-1 text-center">
          {[
            { label: "Spreiding", value: zCheck.spread },
            { label: "Mediaan", value: zCheck.median },
          ].map((stat) => (
            <div key={stat.label} className="rounded bg-muted px-1 py-1">
              <dt className="text-[0.7rem] text-muted-foreground">{stat.label}</dt>
              <dd className="text-sm font-semibold tabular-nums">
                {stat.value == null ? "–" : formatWkg(stat.value)}
              </dd>
            </div>
          ))}
          <div className="rounded bg-muted px-1 py-1">
            <dt className="text-[0.7rem] text-muted-foreground">Erbij</dt>
            <dd className="text-sm font-semibold tabular-nums">{zCheck.room ? roomText(zCheck.room) : "–"}</dd>
          </div>
        </dl>
        {zCheck.issues.length > 0 && (
          <ul className="grid gap-1 text-xs">
            {zCheck.issues.map((issue) => (
              <li key={issue.text} className={cn("rounded px-2 py-1", LEVEL_PILL[issue.level])}>
                {issue.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {head}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {canEdit ? (
          <>
            <RankSelect
              value={team.band[0]}
              label={`Hoogste rank ${team.name}`}
              disabled={pending}
              className="min-w-0 flex-1"
              onChange={(rank) => rank != null && onBand([rank, Math.max(rank, team.band[1])])}
            />
            <span>–</span>
            <RankSelect
              value={team.band[1]}
              label={`Laagste rank ${team.name}`}
              disabled={pending}
              className="min-w-0 flex-1"
              onChange={(rank) => rank != null && onBand([Math.min(rank, team.band[0]), rank])}
            />
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              disabled={pending}
              onClick={() => onBand(null)}
              aria-label={`${team.name} uit de puzzel halen`}
              className="max-sm:size-11"
            >
              <X />
            </Button>
          </>
        ) : (
          <span>
            {ladderRankName(team.band[0])}–{ladderRankName(team.band[1])}
          </span>
        )}
      </div>
      <div className="grid grid-cols-10 gap-0.5" role="img" aria-label={`Ranks in ${team.name}`}>
        {LADDER_RANKS.map((rank) => {
          const n = counts.get(rank) ?? 0;
          const inAllowed = allowed != null && rank >= allowed[0] && rank <= allowed[1];
          return (
            <span
              key={rank}
              title={`${ladderRankName(rank)}${n ? `: ${n}` : ""}`}
              className={cn(
                "grid h-6 place-items-center rounded text-[0.7rem] font-bold tabular-nums",
                n ? "text-white" : "bg-muted text-muted-foreground",
              )}
              style={{
                background: n
                  ? inAllowed || allowed == null
                    ? RANK_COLORS[rank]
                    : `repeating-linear-gradient(135deg, ${RANK_COLORS[rank]} 0 4px, var(--destructive) 4px 8px)`
                  : undefined,
                boxShadow: !n && inAllowed ? `inset 0 0 0 2px ${RANK_COLORS[rank]}` : undefined,
              }}
            >
              {n || rank}
            </span>
          );
        })}
      </div>
      {check.issues.length > 0 && (
        <ul className="grid gap-1 text-xs">
          {check.issues.map((issue) => (
            <li key={issue.text} className={cn("rounded px-2 py-1", LEVEL_PILL[issue.level])}>
              {issue.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Piece({
  rider,
  check,
  s8,
  zCheck,
  lanes,
  canEdit,
  pending,
  justPlaced,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
  onRank,
  onRemove,
}: {
  rider: LadderPuzzleRider;
  check: LadderTeamCheck | null;
  s8: boolean;
  zCheck: ZmapTeamCheck | null;
  lanes: Array<{ id: string; team: LadderPuzzleTeam | null }>;
  canEdit: boolean;
  pending: boolean;
  justPlaced: boolean;
  dragging: boolean;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
  onMove: (teamId: string | null) => void;
  onRank: (rank: number | null) => void;
  onRemove: () => void;
}) {
  // Seizoen 8: groen past, geel risico, rood valt buiten; losse stukjes neutraal.
  const tone = s8 && zCheck ? (zCheck.status[rider.key] ?? null) : null;
  const out = s8 ? false : check?.outKeys.includes(rider.key);
  const offBand = s8 ? false : check?.offBandKeys.includes(rider.key);
  const color = s8
    ? rider.zmap && !tone
      ? "var(--primary)"
      : "var(--border)"
    : rider.rank != null
      ? RANK_COLORS[rider.rank]
      : "var(--border)";
  const showRankSelect = canEdit && !!rider.zwiftId && !s8;

  return (
    <div
      draggable={canEdit}
      onDragStart={canEdit ? onDragStart : undefined}
      onDragEnd={canEdit ? onDragEnd : undefined}
      data-net-gelegd={justPlaced || undefined}
      className={cn(
        "ladder-stuk grid grid-cols-[6px_minmax(0,1fr)] gap-x-2 gap-y-1 rounded-md border bg-card py-2 pr-2",
        canEdit && "cursor-grab",
        dragging && "opacity-40",
        out ? "border-destructive" : offBand && "border-amber-500",
        tone && TONE_TILE[tone],
      )}
      title={tone ? TONE_LABEL[tone] : undefined}
    >
      <span
        className={cn("row-span-3 self-stretch rounded-l-md", tone && TONE_BAR[tone])}
        style={tone ? undefined : { background: color }}
      />
      {tone && <span className="sr-only">{TONE_LABEL[tone]}</span>}
      <span className="min-w-0 truncate text-sm font-medium" title={rider.name}>
        {rider.kind === "profile" ? <MemberLink id={rider.id}>{rider.name}</MemberLink> : rider.name}
      </span>
      {canEdit && (
        <span className="flex min-w-0 gap-1">
          {showRankSelect && (
            <RankSelect
              value={rider.rank}
              label={`Rank van ${rider.name}`}
              disabled={pending}
              allowEmpty
              onChange={onRank}
              className="min-w-0 flex-1"
            />
          )}
          <select
            value={rider.teamId ?? BENCH}
            disabled={pending}
            onChange={(event) => onMove(event.target.value || null)}
            aria-label={`Team van ${rider.name}`}
            className={cn(SELECT, "min-w-0 flex-1")}
          >
            {lanes.map((lane) => (
              <option key={lane.id || "bench"} value={lane.id}>
                {lane.team?.name ?? "Losse stukjes"}
              </option>
            ))}
          </select>
        </span>
      )}
      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        {s8 ? (
          rider.zmap ? (
            <span
              className={cn(
                "font-semibold tabular-nums text-foreground",
                // Schuin: niet van de ladder zelf, maar geschat of uit WTRL.
                rider.zmap.source !== "ladder" && "italic",
              )}
              title={zValueSourceLabel(rider.zmap)}
            >
              zMAP {formatWkg(rider.zmap.value)}
              {rider.zmap.value > ZMAP_CAP_HIGH && (
                <span className="font-normal text-muted-foreground"> telt als {formatWkg(ZMAP_CAP_HIGH)}</span>
              )}
              {rider.zmap.value < ZMAP_CAP_LOW && (
                <span className="font-normal text-muted-foreground"> telt als {formatWkg(ZMAP_CAP_LOW)}</span>
              )}
            </span>
          ) : (
            <span className="font-semibold text-muted-foreground">geen zMAP</span>
          )
        ) : (
          !showRankSelect && (
            <span className={cn("font-semibold", rider.rank == null ? "text-destructive" : "text-foreground")}>
              {ladderRankName(rider.rank)}
            </span>
          )
        )}
        {!s8 && rider.velo != null && <span className="tabular-nums">vELO1 {Math.round(rider.velo)}</span>}
        {!rider.zwiftId && <span className="text-destructive">geen Zwift-ID</span>}
        {rider.sex && <span>{rider.sex}</span>}
        {rider.kind === "roster" && <span>geen account</span>}
        {canEdit && !s8 && (
          <button
            type="button"
            disabled={pending}
            onClick={onRemove}
            className="ml-auto min-h-11 underline-offset-2 hover:text-destructive hover:underline sm:min-h-0"
          >
            Weghalen
          </button>
        )}
      </span>
    </div>
  );
}

function RankSelect({
  value,
  label,
  disabled,
  allowEmpty = false,
  onChange,
  className,
}: {
  value: number | null;
  label: string;
  disabled: boolean;
  allowEmpty?: boolean;
  onChange: (rank: number | null) => void;
  className?: string;
}) {
  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => onChange(parseLadderRank(event.target.value))}
      aria-label={label}
      className={cn(SELECT, className)}
    >
      {allowEmpty && <option value="">Geen rank</option>}
      {LADDER_RANKS.map((rank) => (
        <option key={rank} value={rank}>
          {ladderRankName(rank)}
        </option>
      ))}
    </select>
  );
}

function AddRider({
  pending,
  run,
}: {
  pending: boolean;
  run: (change: Change | null, action: () => Promise<Result>) => void;
}) {
  const [formKey, setFormKey] = useState(0);

  function onAdd(fd: FormData) {
    const sex = String(fd.get("sex") ?? "");
    run(null, async () => {
      const res = await addLadderRosterRider({
        name: String(fd.get("name") ?? ""),
        zwiftId: String(fd.get("zwift_id") ?? ""),
        sex: sex === "man" || sex === "vrouw" ? sex : null,
        rank: parseLadderRank(fd.get("rank")),
      });
      if (res.ok) setFormKey((key) => key + 1);
      return res;
    });
  }

  return (
    <form key={formKey} action={onAdd} className="grid content-start gap-1.5 border-t pt-2.5 md:border-t-0 md:border-l md:pt-0 md:pl-3">
      <h4 className="text-sm font-semibold">Renner toevoegen</h4>
      <input name="name" placeholder="Naam" aria-label="Naam" className={FIELD} />
      <input
        name="zwift_id"
        placeholder="Zwift-ID"
        aria-label="Zwift-ID"
        inputMode="numeric"
        required
        pattern="[0-9]+"
        className={FIELD}
      />
      <div className="grid grid-cols-2 gap-1.5">
        <select name="rank" defaultValue="" aria-label="Rank" className={FIELD}>
          <option value="">Geen rank</option>
          {LADDER_RANKS.map((rank) => (
            <option key={rank} value={rank}>
              {ladderRankName(rank)}
            </option>
          ))}
        </select>
        <select name="sex" defaultValue="" aria-label="Geslacht" className={FIELD}>
          <option value="">Geslacht</option>
          <option value="man">Man</option>
          <option value="vrouw">Vrouw</option>
        </select>
      </div>
      <Button type="submit" variant="outline" disabled={pending} className="max-sm:h-11">
        Toevoegen
      </Button>
    </form>
  );
}

function AddTeam({
  teams,
  pending,
  run,
}: {
  teams: Array<{ id: string; name: string }>;
  pending: boolean;
  run: (change: Change | null, action: () => Promise<Result>) => void;
}) {
  function onAdd(fd: FormData) {
    const teamId = String(fd.get("team_id") ?? "");
    if (!teamId) return;
    run(null, () => setLadderTeamBand(teamId, [1, 3]));
  }

  return (
    <form action={onAdd} className="flex flex-wrap items-center gap-2">
      <select name="team_id" defaultValue="" aria-label="Ladderteam" className={cn(FIELD, "w-auto")}>
        <option value="" disabled>
          Team aan de puzzel toevoegen…
        </option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" disabled={pending} className="max-sm:h-11">
        Toevoegen
      </Button>
    </form>
  );
}
