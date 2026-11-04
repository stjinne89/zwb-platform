"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Check, ChevronDown, CircleAlert, Search } from "lucide-react";
import type {
  IntegrationFact,
  IntegrationKey,
  IntegrationState,
  IntegrationStatus,
} from "@/lib/integrations/member-overview";
import type { MemberIntegrationRow } from "../_data";

// Alleen type-imports uit lib/integrations: die module trekt de ritten-logica
// mee, en die hoort niet in de browserbundel. Labels en volgorde komen uit de
// rijen zelf.

const STATE_CLASS: Record<IntegrationState, string> = {
  problem: "bg-destructive/10 text-destructive",
  attention: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  off: "bg-muted text-muted-foreground",
};

const STATE_LABEL: Record<IntegrationState, string> = {
  problem: "probleem",
  attention: "aandacht",
  ok: "in orde",
  off: "niet gekoppeld",
};

const STATE_RANK: Record<IntegrationState, number> = { problem: 0, attention: 1, ok: 2, off: 3 };

type Filter = "all" | "issues" | "nothing" | IntegrationKey;

function StateIcon({ state }: { state: IntegrationState }) {
  if (state === "problem") return <AlertTriangle className="size-3.5 shrink-0" aria-hidden />;
  if (state === "attention") return <CircleAlert className="size-3.5 shrink-0" aria-hidden />;
  if (state === "ok") return <Check className="size-3.5 shrink-0" aria-hidden />;
  return null;
}

function formatAt(value: string | null) {
  if (!value) return "nooit";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

function factValue(fact: IntegrationFact) {
  return "text" in fact ? fact.text : formatAt(fact.at);
}

const RIDE_SOURCE_LABEL = {
  strava: "Strava",
  intervals: "intervals.icu",
  none: "geen",
} as const;

function lowerFirst(text: string) {
  return text.charAt(0).toLocaleLowerCase("nl") + text.slice(1);
}

function isIssue(state: IntegrationState) {
  return state === "problem" || state === "attention";
}

export function MemberIntegrations({
  members,
  canSyncStrava,
}: {
  members: MemberIntegrationRow[];
  canSyncStrava: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  // Per koppeling: hoeveel leden hem hebben en hoeveel daarvan aandacht vragen.
  const perIntegration = (members[0]?.integrations ?? []).map((sample) => {
    let linked = 0;
    let issues = 0;
    for (const member of members) {
      const item = member.integrations.find((i) => i.key === sample.key);
      if (!item || item.state === "off") continue;
      linked += 1;
      if (isIssue(item.state)) issues += 1;
    }
    return { key: sample.key, label: sample.label, linked, issues };
  });

  const issueCount = members.filter((m) => isIssue(m.state)).length;
  const nothingCount = members.filter((m) => m.state === "off").length;

  const needle = query.trim().toLocaleLowerCase("nl");
  const visible = members.filter((member) => {
    if (needle && !member.name.toLocaleLowerCase("nl").includes(needle)) return false;
    if (filter === "all") return true;
    if (filter === "issues") return isIssue(member.state);
    if (filter === "nothing") return member.state === "off";
    const item = member.integrations.find((i) => i.key === filter);
    return Boolean(item && item.state !== "off");
  });

  // Met een koppeling gekozen staan de leden met een probleem dáárin bovenaan.
  const byIntegration = filter !== "all" && filter !== "issues" && filter !== "nothing";
  const stateOf = (member: MemberIntegrationRow) =>
    member.integrations.find((i) => i.key === filter)?.state ?? "off";
  const sorted = byIntegration
    ? [...visible].sort(
        (a, b) => STATE_RANK[stateOf(a)] - STATE_RANK[stateOf(b)] || a.name.localeCompare(b.name, "nl"),
      )
    : visible;

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const chip = (value: Filter, label: string, count: number, highlight = 0) => (
    <button
      key={value}
      type="button"
      onClick={() => setFilter((current) => (current === value && value !== "all" ? "all" : value))}
      aria-pressed={filter === value}
      className={`tg-link tg-kalender tg-chip inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1 text-sm ${
        filter === value ? "tg-here border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums opacity-80">{count}</span>
      {highlight > 0 ? (
        <span className="rounded-full bg-amber-500/20 px-1.5 text-xs font-semibold tabular-nums text-amber-800 dark:text-amber-300">
          {highlight}
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {chip("all", "Alle leden", members.length)}
          {chip("issues", "Aandacht nodig", issueCount)}
          {chip("nothing", "Niets gekoppeld", nothingCount)}
        </div>
        <div className="flex flex-wrap gap-2">
          {perIntegration.map((item) => chip(item.key, item.label, item.linked, item.issues))}
        </div>
        <label className="relative block">
          <span className="sr-only">Zoek een lid</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek een lid"
            className="h-11 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </section>

      {sorted.length === 0 ? (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Geen leden.</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {sorted.map((member) => {
            const expanded = open.has(member.profileId);
            const linked = member.integrations.filter((i) => i.state !== "off");
            const panelId = `koppelingen-${member.profileId}`;
            return (
              <li key={member.profileId}>
                <button
                  type="button"
                  onClick={() => toggle(member.profileId)}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  className="flex min-h-11 w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-left hover:bg-accent/50"
                >
                  <span className="flex min-w-[10rem] flex-1 items-center gap-2 font-medium">
                    <ChevronDown
                      className={`size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${
                        expanded ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                    <span className="truncate">{member.name}</span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {linked.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Niets gekoppeld</span>
                    ) : (
                      linked.map((item) => <StatusChip key={item.key} item={item} />)
                    )}
                  </span>
                </button>
                {expanded ? (
                  <MemberDetail id={panelId} member={member} canSyncStrava={canSyncStrava} />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusChip({ item }: { item: IntegrationStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATE_CLASS[item.state]}`}
      title={item.summary}
    >
      <StateIcon state={item.state} />
      {item.label}
      <span className="sr-only">: {STATE_LABEL[item.state]}</span>
    </span>
  );
}

function MemberDetail({
  id,
  member,
  canSyncStrava,
}: {
  id: string;
  member: MemberIntegrationRow;
  canSyncStrava: boolean;
}) {
  const linked = member.integrations.filter((i) => i.state !== "off");
  const off = member.integrations.filter((i) => i.state === "off");
  const hasStrava = linked.some((i) => i.key === "strava");
  return (
    <div id={id} className="space-y-3 border-t bg-muted/30 px-4 py-3 text-sm">
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Laatst in de app</dt>
          <dd className="tabular-nums">{formatAt(member.lastSeen)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Laatste rit</dt>
          <dd className="tabular-nums">{member.lastRideAt ? formatAt(member.lastRideAt) : "geen recente"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Ritten via</dt>
          <dd>{RIDE_SOURCE_LABEL[member.rideSource]}</dd>
        </div>
      </dl>

      {linked.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {linked.map((item) => (
            <li key={item.key} className="rounded-md border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{item.label}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATE_CLASS[item.state]}`}
                >
                  <StateIcon state={item.state} />
                  {item.summary}
                </span>
              </div>
              {item.facts.length > 0 ? (
                <dl className="mt-2 space-y-0.5 text-xs">
                  {item.facts.map((fact, index) => (
                    <div key={`${fact.label}-${index}`} className="flex gap-2">
                      <dt className="shrink-0 text-muted-foreground">{fact.label}</dt>
                      <dd className="min-w-0 break-words tabular-nums">{factValue(fact)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {off.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {off.map((item) => `${item.label}: ${lowerFirst(item.summary)}`).join(" · ")}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/leden/${member.profileId}`}
          className="inline-flex min-h-11 items-center rounded-md border bg-card px-3 text-sm font-medium hover:bg-accent"
        >
          Profiel
        </Link>
        {hasStrava && canSyncStrava ? (
          <Link
            href="/beheer/strava"
            className="inline-flex min-h-11 items-center rounded-md border bg-card px-3 text-sm font-medium hover:bg-accent"
          >
            Strava-sync
          </Link>
        ) : null}
      </div>
    </div>
  );
}
