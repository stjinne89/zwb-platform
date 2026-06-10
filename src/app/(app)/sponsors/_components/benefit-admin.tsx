"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createBenefit,
  deleteBenefit,
  updateBenefit,
} from "../_actions";

export type BenefitAdminRow = {
  id: string;
  sponsor_id: string | null;
  title: string;
  description_md: string | null;
  discount_code: string | null;
  redeem_url: string | null;
  valid_from: string | null;
  valid_until: string | null;
  display_order: number;
  active: boolean;
};

export type SponsorOption = {
  id: string;
  name: string;
};

export function BenefitAdmin({
  benefits,
  sponsors,
}: {
  benefits: BenefitAdminRow[];
  sponsors: SponsorOption[];
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <section className="rounded-lg border bg-card p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Ledenvoordeel beheren
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? <X className="size-4" /> : <Plus className="size-4" />}
          {adding ? "Annuleer" : "Voordeel toevoegen"}
        </Button>
      </header>

      {adding && (
        <BenefitForm
          mode="create"
          sponsors={sponsors}
          onDone={() => setAdding(false)}
        />
      )}

      <ul className="mt-4 space-y-2">
        {benefits.length === 0 && (
          <li className="text-sm text-muted-foreground">
            Nog geen voordelen toegevoegd.
          </li>
        )}
        {benefits.map((benefit) => {
          const sponsorName = benefit.sponsor_id
            ? sponsors.find((s) => s.id === benefit.sponsor_id)?.name
            : null;
          return (
            <li key={benefit.id} className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {benefit.title}
                    {!benefit.active && (
                      <span className="ml-2 rounded bg-muted px-1.5 text-xs">
                        inactief
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sponsorName ? `via ${sponsorName}` : "los voordeel"}
                    {benefit.discount_code && ` · code: ${benefit.discount_code}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setEditing((cur) =>
                        cur === benefit.id ? null : benefit.id,
                      )
                    }
                    aria-label="Bewerken"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <DeleteBenefitButton id={benefit.id} title={benefit.title} />
                </div>
              </div>
              {editing === benefit.id && (
                <div className="mt-3">
                  <BenefitForm
                    mode="edit"
                    benefit={benefit}
                    sponsors={sponsors}
                    onDone={() => setEditing(null)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BenefitForm({
  mode,
  benefit,
  sponsors,
  onDone,
}: {
  mode: "create" | "edit";
  benefit?: BenefitAdminRow;
  sponsors: SponsorOption[];
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
          ? await createBenefit(fd)
          : await updateBenefit(benefit!.id, fd);
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
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Titel *
          </span>
          <input
            name="title"
            required
            defaultValue={benefit?.title}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Sponsor (optioneel)
          </span>
          <select
            name="sponsor_id"
            defaultValue={benefit?.sponsor_id ?? ""}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="">— losse aanbieding —</option>
            {sponsors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Sortering
          </span>
          <input
            name="display_order"
            type="number"
            defaultValue={benefit?.display_order ?? 100}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Kortingscode
          </span>
          <input
            name="discount_code"
            defaultValue={benefit?.discount_code ?? ""}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm font-mono"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Verzilver-URL
          </span>
          <input
            name="redeem_url"
            type="url"
            defaultValue={benefit?.redeem_url ?? ""}
            placeholder="https://"
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Geldig vanaf
          </span>
          <input
            name="valid_from"
            type="date"
            defaultValue={benefit?.valid_from ?? ""}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Geldig t/m
          </span>
          <input
            name="valid_until"
            type="date"
            defaultValue={benefit?.valid_until ?? ""}
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          Beschrijving
        </span>
        <textarea
          name="description_md"
          rows={3}
          defaultValue={benefit?.description_md ?? ""}
          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
        />
      </label>
      {mode === "edit" && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={benefit?.active}
          />
          Actief
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

function DeleteBenefitButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm(`Voordeel "${title}" verwijderen?`)) return;
    startTransition(async () => {
      const res = await deleteBenefit(id);
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
