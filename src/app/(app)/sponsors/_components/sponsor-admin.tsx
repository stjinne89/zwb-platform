"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Upload, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createSponsor,
  deleteSponsor,
  updateSponsor,
  uploadSponsorLogo,
} from "../_actions";

const TIER_LABELS: Record<string, string> = {
  hoofd: "Hoofdsponsor",
  sub: "Sub-sponsor",
  team: "Team sponsor",
  web: "Web sponsor",
  vriend: "Vriend van ZWB",
};

export type SponsorAdminRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  description_md: string | null;
  contact_email: string | null;
  tier: "hoofd" | "sub" | "team" | "web" | "vriend";
  display_order: number;
  active: boolean;
};

export function SponsorAdmin({ sponsors }: { sponsors: SponsorAdminRow[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <section className="rounded-lg border bg-card p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sponsors beheren
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? <X className="size-4" /> : <Plus className="size-4" />}
          {adding ? "Annuleer" : "Sponsor toevoegen"}
        </Button>
      </header>

      {adding && (
        <SponsorForm
          mode="create"
          onDone={() => setAdding(false)}
        />
      )}

      <ul className="mt-4 space-y-2">
        {sponsors.map((sponsor) => (
          <li key={sponsor.id} className="rounded-md border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {sponsor.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sponsor.logo_url}
                    alt=""
                    className="h-10 w-10 rounded object-contain"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs font-semibold text-muted-foreground">
                    {sponsor.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join("")}
                  </div>
                )}
                <div>
                  <p className="font-medium">
                    {sponsor.name}
                    {!sponsor.active && (
                      <span className="ml-2 rounded bg-muted px-1.5 text-xs">
                        inactief
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {TIER_LABELS[sponsor.tier]} · sortering {sponsor.display_order}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <LogoUploadButton sponsorId={sponsor.id} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEditing((cur) => (cur === sponsor.id ? null : sponsor.id))
                  }
                  aria-label="Bewerken"
                >
                  <Pencil className="size-4" />
                </Button>
                <DeleteSponsorButton id={sponsor.id} name={sponsor.name} />
              </div>
            </div>
            {editing === sponsor.id && (
              <div className="mt-3">
                <SponsorForm
                  mode="edit"
                  sponsor={sponsor}
                  onDone={() => setEditing(null)}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SponsorForm({
  mode,
  sponsor,
  onDone,
}: {
  mode: "create" | "edit";
  sponsor?: SponsorAdminRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createSponsor(fd)
          : await updateSponsor(sponsor!.id, fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
      onDone();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3 rounded-md border bg-background p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Naam *">
          <input
            name="name"
            required
            defaultValue={sponsor?.name}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </Field>
        <Field label="Tier">
          <select
            name="tier"
            defaultValue={sponsor?.tier ?? "team"}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          >
            {Object.entries(TIER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Website-URL">
          <input
            name="website_url"
            type="url"
            defaultValue={sponsor?.website_url ?? ""}
            placeholder="https://"
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </Field>
        <Field label="Sortering">
          <input
            name="display_order"
            type="number"
            defaultValue={sponsor?.display_order ?? 100}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </Field>
        <Field label="Contact-email (intern)">
          <input
            name="contact_email"
            type="email"
            defaultValue={sponsor?.contact_email ?? ""}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </Field>
        {mode === "create" && (
          <Field label="Slug (optioneel — auto)">
            <input
              name="slug"
              placeholder="auto-gegenereerd uit naam"
              className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            />
          </Field>
        )}
      </div>
      <Field label="Beschrijving">
        <textarea
          name="description_md"
          rows={3}
          defaultValue={sponsor?.description_md ?? ""}
          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
        />
      </Field>
      {mode === "edit" && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={sponsor?.active}
          />
          Actief (zichtbaar op /sponsors)
        </label>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Annuleer
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Opslaan…" : mode === "create" ? "Toevoegen" : "Opslaan"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function LogoUploadButton({ sponsorId }: { sponsorId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPending(true);
    setError(null);
    try {
      const res = await uploadSponsorLogo(sponsorId, file);
      if (!res.ok) setError(res.error);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload faalde.");
    } finally {
      setPending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => fileRef.current?.click()}
        aria-label="Logo uploaden"
        title={error ?? undefined}
      >
        <Upload className="size-4" />
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />
    </>
  );
}

function DeleteSponsorButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (
      !confirm(
        `Sponsor "${name}" verwijderen? Bijbehorende voordelen blijven bestaan zonder sponsor-koppeling.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await deleteSponsor(id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={onDelete}
      aria-label="Verwijderen"
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
