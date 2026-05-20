"use client";

import { useRef, useState, useTransition } from "react";
import {
  addAnnouncement,
  addGroup,
  deleteAnnouncement,
  deleteGroup,
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

export function NewGroupForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await addGroup(fd);
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
      <h3 className="text-sm font-medium">Nieuwe WhatsApp-groep</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Naam</label>
          <input name="name" required className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Categorie</label>
          <select name="category" className={FIELD}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className={LABEL}>Invite-URL (https://chat.whatsapp.com/…)</label>
        <input
          name="invite_url"
          type="url"
          required
          placeholder="https://chat.whatsapp.com/AbCdEf123…"
          className={FIELD}
        />
      </div>
      <div>
        <label className={LABEL}>Korte omschrijving</label>
        <input name="description" className={FIELD} />
      </div>
      <div className="grid grid-cols-2 gap-3">
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
