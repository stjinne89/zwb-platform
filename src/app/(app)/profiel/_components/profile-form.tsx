"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "../actions";
import { Button } from "@/components/ui/button";

type Initial = {
  display_name: string;
  region: string;
  zwift_id: string;
  strava_id: string;
  zrl_category: string;
  ftp_watts: string;
  weight_kg: string;
  bio: string;
};

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

const LABEL = "mb-1 block text-sm font-medium";

export function ProfileForm({ email, initial }: { email: string; initial: Initial }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saved" }
    | { kind: "error"; msg: string }
  >({ kind: "idle" });

  function submit(formData: FormData) {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await updateProfile(formData);
      setStatus(
        res.ok
          ? { kind: "saved" }
          : { kind: "error", msg: res.error ?? "Onbekende fout." },
      );
    });
  }

  return (
    <form action={submit} className="space-y-6 rounded-2xl border bg-card p-6">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Basis
        </h2>
        <div>
          <label className={LABEL}>E-mail</label>
          <input
            value={email}
            readOnly
            className={`${FIELD} cursor-not-allowed opacity-60`}
          />
        </div>
        <div>
          <label className={LABEL}>Weergavenaam</label>
          <input
            name="display_name"
            required
            defaultValue={initial.display_name}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL}>Regio</label>
          <input
            name="region"
            placeholder="Bv. Tilburg, Antwerpen, Eindhoven"
            defaultValue={initial.region}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL}>Bio</label>
          <textarea
            name="bio"
            rows={3}
            placeholder="Korte intro, doelen, favoriete koers..."
            defaultValue={initial.bio}
            className={FIELD}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Racen
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>ZRL-categorie</label>
            <select
              name="zrl_category"
              defaultValue={initial.zrl_category}
              className={FIELD}
            >
              <option value="">-</option>
              {["A", "B", "C", "D", "E"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Zwift-ID</label>
            <input
              name="zwift_id"
              placeholder="bv. 1234567"
              defaultValue={initial.zwift_id}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Strava-ID</label>
            <input
              name="strava_id"
              placeholder="bv. atletennaam"
              defaultValue={initial.strava_id}
              className={FIELD}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Fysiek
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>FTP (watt)</label>
            <input
              type="number"
              name="ftp_watts"
              min={50}
              max={700}
              defaultValue={initial.ftp_watts}
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Gewicht (kg)</label>
            <input
              type="number"
              name="weight_kg"
              step="0.1"
              min={30}
              max={200}
              defaultValue={initial.weight_kg}
              className={FIELD}
            />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Opslaan..." : "Opslaan"}
        </Button>
        {status.kind === "saved" && (
          <span className="text-sm text-green-600 dark:text-green-400">
            Opgeslagen
          </span>
        )}
        {status.kind === "error" && (
          <span className="text-sm text-destructive">{status.msg}</span>
        )}
      </div>
    </form>
  );
}
