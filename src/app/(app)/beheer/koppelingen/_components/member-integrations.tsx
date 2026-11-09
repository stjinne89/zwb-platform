"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, Check, ChevronDown, CircleAlert, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  IntegrationFact,
  IntegrationKey,
  IntegrationState,
  IntegrationStatus,
} from "@/lib/integrations/member-overview";
import type { NoticeSummary } from "@/lib/integrations/load";
import { isNoticeIntegration, NOTICE_BODY_MAX, noticeTemplate } from "@/lib/integrations/notices";
import { helpVideo, helpVideoDuration } from "@/lib/help-videos";
import type { MemberIntegrationRow } from "../_data";
import { sendIntegrationNotice } from "../_actions";
import { useClubTexts } from "@/components/club-texts-provider";
import { fillClubText } from "@/lib/club-texts";

// Uit member-overview alleen types: die module trekt de ritten-logica mee, en
// die hoort niet in de browserbundel. notices.ts is puur en zonder imports.

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

/** Bij een gekozen koppeling: eerst wat misgaat, dan wat ontbreekt. */
const STATE_RANK: Record<IntegrationState, number> = { problem: 0, attention: 1, off: 2, ok: 3 };

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

function formatDay(value: string) {
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Amsterdam",
  });
}

function factValue(fact: IntegrationFact) {
  return "text" in fact ? fact.text : formatAt(fact.at);
}

function noticeText(notice: NoticeSummary | undefined) {
  if (!notice) return null;
  const sent = `Pop-up ${formatDay(notice.createdAt)}`;
  if (notice.resolvedAt) return `${sent}, daarna gekoppeld`;
  if (notice.seenAt) return `${sent}, gezien ${formatDay(notice.seenAt)}`;
  return `${sent}, nog niet gezien`;
}

function noticeIsOpen(notice: NoticeSummary | undefined) {
  return Boolean(notice && !notice.seenAt && !notice.resolvedAt);
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

function needsHelp(item: IntegrationStatus | undefined) {
  return Boolean(item && (isIssue(item.state) || item.missing));
}

export function MemberIntegrations({
  members,
  canSyncStrava,
  stravaCapFull,
}: {
  members: MemberIntegrationRow[];
  canSyncStrava: boolean;
  stravaCapFull: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [composing, setComposing] = useState(false);

  // Per koppeling: wie hem mist en bij wie hij misgaat.
  const perIntegration = (members[0]?.integrations ?? []).map((sample) => {
    let missing = 0;
    let issues = 0;
    for (const member of members) {
      const item = member.integrations.find((i) => i.key === sample.key);
      if (!item) continue;
      if (item.missing) missing += 1;
      else if (isIssue(item.state)) issues += 1;
    }
    return { key: sample.key, label: sample.label, missing, issues };
  });

  const issueCount = members.filter((m) => isIssue(m.state)).length;
  const nothingCount = members.filter((m) => m.state === "off").length;

  const byIntegration = filter !== "all" && filter !== "issues" && filter !== "nothing";
  const itemOf = (member: MemberIntegrationRow) =>
    byIntegration ? member.integrations.find((i) => i.key === filter) : undefined;

  const needle = query.trim().toLocaleLowerCase("nl");
  const visible = members.filter((member) => {
    if (needle && !member.name.toLocaleLowerCase("nl").includes(needle)) return false;
    if (filter === "all") return true;
    if (filter === "issues") return isIssue(member.state);
    if (filter === "nothing") return member.state === "off";
    return needsHelp(itemOf(member));
  });

  const sorted = byIntegration
    ? [...visible].sort(
        (a, b) =>
          STATE_RANK[itemOf(a)?.state ?? "ok"] - STATE_RANK[itemOf(b)?.state ?? "ok"] ||
          a.name.localeCompare(b.name, "nl"),
      )
    : visible;

  // Pop-up: alleen wie de gekozen koppeling mist en er nog geen open heeft staan.
  const canNotify = byIntegration && isNoticeIntegration(filter);
  const recipients = canNotify
    ? visible.filter((member) => itemOf(member)?.missing && !noticeIsOpen(member.notices[filter]))
    : [];
  const missingVisible = byIntegration ? visible.filter((member) => itemOf(member)?.missing).length : 0;
  const selected = byIntegration ? perIntegration.find((item) => item.key === filter) : undefined;

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const chip = (value: Filter, label: string, count: number, highlight = 0, title?: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setFilter((current) => (current === value && value !== "all" ? "all" : value))}
      aria-pressed={filter === value}
      title={title}
      className={`tg-link tg-kalender tg-chip inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-1 text-sm ${
        filter === value ? "tg-here border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums opacity-80">{count}</span>
      {highlight > 0 ? (
        <span
          className={`rounded-full px-1.5 text-xs font-semibold tabular-nums ${
            filter === value
              ? "bg-primary-foreground text-primary"
              : "bg-amber-500/20 text-amber-800 dark:text-amber-300"
          }`}
        >
          {highlight}
        </span>
      ) : null}
      {title ? <span className="sr-only">{title}</span> : null}
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
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mist of misgaat
          </h2>
          <div className="flex flex-wrap gap-2">
            {perIntegration.map((item) =>
              chip(
                item.key,
                item.label,
                item.missing,
                item.issues,
                `${item.missing} niet gekoppeld, ${item.issues} met een probleem`,
              ),
            )}
          </div>
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

      {byIntegration && selected ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
          <p className="text-sm">
            <span className="font-semibold tabular-nums">{missingVisible}</span> zonder {selected.label}
            {visible.length > missingVisible ? (
              <span className="text-muted-foreground">
                {" "}
                · <span className="tabular-nums">{visible.length - missingVisible}</span> met een probleem
              </span>
            ) : null}
          </p>
          {canNotify ? (
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              disabled={recipients.length === 0}
              onClick={() => setComposing(true)}
            >
              <Send className="size-4" aria-hidden />
              Pop-up naar {recipients.length}
            </Button>
          ) : filter === "zwift" ? (
            <p className="text-xs text-muted-foreground">Krijgt al elke sessie de vraag om een Zwift-ID.</p>
          ) : null}
        </section>
      ) : null}

      {sorted.length === 0 ? (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Geen leden.</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {sorted.map((member) => {
            const expanded = open.has(member.profileId);
            const focus = itemOf(member);
            const linked = member.integrations.filter((i) => i.state !== "off");
            const panelId = `koppelingen-${member.profileId}`;
            const notice = focus ? noticeText(member.notices[focus.key]) : null;
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
                  <span className="flex flex-wrap items-center gap-1.5">
                    {focus ? (
                      <>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATE_CLASS[focus.state]}`}
                        >
                          <StateIcon state={focus.state} />
                          {focus.summary}
                        </span>
                        {notice ? <span className="text-xs text-muted-foreground">{notice}</span> : null}
                      </>
                    ) : linked.length === 0 ? (
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

      {composing && canNotify && isNoticeIntegration(filter) ? (
        <NoticeComposer
          integration={filter}
          recipients={recipients}
          alreadyOpen={visible.filter((m) => itemOf(m)?.missing && noticeIsOpen(m.notices[filter])).length}
          stravaCapFull={stravaCapFull}
          onClose={() => setComposing(false)}
        />
      ) : null}
    </div>
  );
}

function NoticeComposer({
  integration,
  recipients,
  alreadyOpen,
  stravaCapFull,
  onClose,
}: {
  integration: Parameters<typeof noticeTemplate>[0];
  recipients: MemberIntegrationRow[];
  alreadyOpen: number;
  stravaCapFull: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const clubTexts = useClubTexts();
  const template = noticeTemplate(integration, { stravaCapFull });
  const [body, setBody] = useState(() => fillClubText(template.body, clubTexts));
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const names = recipients.map((member) => member.name);
  const shown = names.slice(0, 6).join(", ") + (names.length > 6 ? ` en ${names.length - 6} anderen` : "");

  function send() {
    setError(null);
    startTransition(async () => {
      const result = await sendIntegrationNotice({
        integration,
        profileIds: recipients.map((member) => member.profileId),
        body,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(result.sent === 1 ? "Verstuurd naar 1 lid." : `Verstuurd naar ${result.sent} leden.`);
      router.refresh();
    });
  }

  const tooLong = body.trim().length > NOTICE_BODY_MAX;

  return (
    <Dialog open onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{template.title}</DialogTitle>
          <DialogDescription>
            Naar {recipients.length === 1 ? "1 lid" : `${recipients.length} leden`}: {shown}
            {alreadyOpen === 1 ? ". 1 lid heeft er al een openstaan." : alreadyOpen > 1 ? `. ${alreadyOpen} leden hebben er al een openstaan.` : "."}
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <p className="text-sm">{done}</p>
        ) : (
          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium">Tekst</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={6}
                maxLength={NOTICE_BODY_MAX + 50}
                className="w-full rounded-md border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <p className={`text-xs tabular-nums ${tooLong ? "text-destructive" : "text-muted-foreground"}`}>
              {body.trim().length} / {NOTICE_BODY_MAX} · knop: {template.linkLabel} · uitleg
              {template.video ? ` · video ${helpVideoDuration(helpVideo(template.video).seconds)}` : ""}
            </p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={onClose}>
            {done ? "Sluiten" : "Annuleren"}
          </Button>
          {done ? null : (
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              disabled={pending || tooLong || !body.trim() || recipients.length === 0}
              onClick={send}
            >
              {pending ? "Versturen…" : "Versturen"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {off.map((item) => {
            const notice = noticeText(member.notices[item.key]);
            return (
              <li key={item.key}>
                {item.label}: {lowerFirst(item.summary)}
                {notice ? ` · ${lowerFirst(notice)}` : ""}
              </li>
            );
          })}
        </ul>
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
