"use client";

import { useRef, useState, useTransition } from "react";
import {
  addAnnouncement,
  addGroup,
  bulkAddGroups,
  deleteAnnouncement,
  deleteGroup,
  fetchInvitePreview,
  togglePin,
} from "../_actions";
import { Button } from "@/components/ui/button";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

const CATEGORIES = [
  { value: "", label: "—" },
  { value: "algemeen", label: "Algemeen" },
  { value: "bestuur", label: "Bestuur" },
  { value: "zrl", label: "ZRL" },
  { value: "ladder", label: "Ladder" },
  { value: "outdoor", label: "Outdoor" },
  { value: "klassiekers", label: "Klassiekers" },
  { value: "social", label: "Social" },
  { value: "training", label: "Training" },
  { value: "overig", label: "Overig" },
];

type TeamOption = { id: string; name: string; type: string; division: string | null };
type EventOption = { id: string; title: string; start_at: string; type: string };

export function NewGroupForm({
  teams,
  events,
}: {
  teams: TeamOption[];
  events: EventOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [fetching, startFetch] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function fetchPreview() {
    setError(null);
    if (!inviteUrl.trim()) {
      setError("Plak eerst een invite-URL.");
      return;
    }
    startFetch(async () => {
      const res = await fetchInvitePreview(inviteUrl);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setName(res.name);
      if (res.description) setDescription(res.description);
      setIconUrl(res.iconUrl);
    });
  }

  function submit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await addGroup(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      formRef.current?.reset();
      setInviteUrl("");
      setName("");
      setDescription("");
      setIconUrl(null);
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="space-y-3 rounded-2xl border border-dashed border-foreground/20 bg-card/40 p-4"
    >
      <h3 className="text-sm font-medium">Nieuwe WhatsApp-groep</h3>

      <div>
        <label className={LABEL}>Invite-URL</label>
        <div className="flex gap-2">
          <input
            name="invite_url"
            type="url"
            required
            placeholder="https://chat.whatsapp.com/AbCdEf123…"
            value={inviteUrl}
            onChange={(e) => setInviteUrl(e.target.value)}
            className={FIELD}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={fetching || !inviteUrl.trim()}
            onClick={fetchPreview}
          >
            {fetching ? "Ophalen…" : "Ophalen"}
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Plak de invite-link en klik &quot;Ophalen&quot; om naam + omschrijving
          automatisch in te vullen.
        </p>
      </div>

      {iconUrl && (
        <div className="flex items-center gap-3 rounded-md border bg-card p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={iconUrl}
            alt=""
            className="h-10 w-10 rounded-full border"
            referrerPolicy="no-referrer"
          />
          <span className="text-xs text-muted-foreground">Groep-icoon</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Naam</label>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL}>Categorie</label>
          <select name="category" className={FIELD} defaultValue="algemeen">
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={LABEL}>Korte omschrijving</label>
        <input
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={FIELD}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Koppel aan team / event (optioneel)</label>
          <ScopeSelect teams={teams} events={events} />
        </div>
        <div>
          <label className={LABEL}>Volgorde (lager = eerder)</label>
          <input
            type="number"
            name="display_order"
            defaultValue={0}
            className={FIELD}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Toevoegen…" : "Groep toevoegen"}
      </Button>
    </form>
  );
}

function ScopeSelect({
  teams,
  events,
}: {
  teams: TeamOption[];
  events: EventOption[];
}) {
  return (
    <select name="scope" defaultValue="none" className={FIELD}>
      <option value="none">— geen koppeling —</option>
      {teams.length > 0 && (
        <optgroup label="Teams">
          {teams.map((t) => (
            <option key={t.id} value={`team:${t.id}`}>
              {t.name}
              {t.division ? ` (${t.division})` : ""}
            </option>
          ))}
        </optgroup>
      )}
      {events.length > 0 && (
        <optgroup label="Events">
          {events.map((e) => (
            <option key={e.id} value={`event:${e.id}`}>
              {new Date(e.start_at).toLocaleDateString("nl-NL", {
                day: "2-digit",
                month: "2-digit",
                timeZone: "Europe/Amsterdam",
              })}{" "}
              — {e.title}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

export function BulkGroupForm({
  teams,
  events,
}: {
  teams: TeamOption[];
  events: EventOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(fd: FormData) {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await bulkAddGroups(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const parts = [`${res.added} toegevoegd`];
      if (res.skippedDuplicate > 0) parts.push(`${res.skippedDuplicate} dubbel`);
      if (res.skippedInvalid > 0) parts.push(`${res.skippedInvalid} ongeldig`);
      setResult(parts.join(" · "));
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="space-y-3 rounded-2xl border border-dashed border-foreground/20 bg-card/40 p-4"
    >
      <h3 className="text-sm font-medium">Bulk toevoegen</h3>
      <p className="text-xs text-muted-foreground">
        Plak meerdere invite-links, één per regel. Namen worden automatisch
        opgehaald. Dubbele links worden overgeslagen.
      </p>

      <div>
        <label className={LABEL}>Invite-URL&apos;s (één per regel)</label>
        <textarea
          name="urls"
          required
          rows={6}
          placeholder={
            "https://chat.whatsapp.com/AbCdEf123…\nhttps://chat.whatsapp.com/GhIjKl456…"
          }
          className={`${FIELD} font-mono text-xs`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Categorie (voor allemaal)</label>
          <select name="category" className={FIELD} defaultValue="">
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Koppel aan team / event</label>
          <ScopeSelect teams={teams} events={events} />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && <p className="text-sm text-primary">{result}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Importeren…" : "Importeer groepen"}
      </Button>
    </form>
  );
}

export function DeleteGroupButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (!confirm("Groep uit de lijst verwijderen?")) return;
        startTransition(async () => void deleteGroup(id));
      }}
    >
      ✕
    </Button>
  );
}

export function NewAnnouncementForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await addAnnouncement(fd);
      if (!res.ok) setError(res.error);
      else formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="space-y-3 rounded-2xl border border-dashed border-foreground/20 bg-card/40 p-4"
    >
      <h3 className="text-sm font-medium">Nieuwe mededeling</h3>
      <div>
        <label className={LABEL}>Titel</label>
        <input name="title" required className={FIELD} />
      </div>
      <div>
        <label className={LABEL}>Bericht (markdown)</label>
        <textarea name="body_md" required rows={4} className={`${FIELD} font-mono`} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="pinned" /> Vastpinnen bovenaan
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Plaatsen…" : "Plaatsen"}
      </Button>
    </form>
  );
}

export function AnnouncementAdminActions({
  id,
  pinned,
}: {
  id: string;
  pinned: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => startTransition(async () => void togglePin(id, !pinned))}
      >
        {pinned ? "Loskoppelen" : "Pin"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (!confirm("Mededeling verwijderen?")) return;
          startTransition(async () => void deleteAnnouncement(id));
        }}
      >
        ✕
      </Button>
    </div>
  );
}
