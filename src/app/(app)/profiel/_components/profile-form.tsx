"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "../actions";
import { Button } from "@/components/ui/button";

type Initial = {
  id: string;
  display_name: string;
  region: string;
  zwift_id: string;
  mywhoosh_id: string;
  strava_id: string;
  zrl_category: string;
  zrl_division: string;
  ftp_watts: string;
  weight_kg: string;
  bio: string;
  birth_date: string;
  share_birthday: boolean;
  public_profile_enabled: boolean;
  profile_visibility: Record<string, boolean>;
};

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

const LABEL = "mb-1 block text-sm font-medium";

const VISIBILITY_FIELDS = [
  { key: "avatar", label: "Profielfoto" },
  { key: "region", label: "Regio" },
  { key: "zwift_id", label: "Zwift-ID" },
  { key: "strava_id", label: "Strava-vermelding" },
  { key: "zrl_category", label: "ZRL-categorie" },
  { key: "ftp_watts", label: "FTP" },
  { key: "weight_kg", label: "Gewicht" },
  { key: "bio", label: "Bio" },
  { key: "roles", label: "Communityrollen" },
  { key: "badges", label: "Badges" },
] as const;

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
            <label className={LABEL}>ZRL-divisie</label>
            <select
              name="zrl_division"
              defaultValue={initial.zrl_division}
              className={FIELD}
            >
              <option value="open">Open</option>
              <option value="women">Dames</option>
            </select>
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
          <div>
            <label className={LABEL}>MyWhoosh-ID</label>
            <input
              name="mywhoosh_id"
              placeholder="bv. 1234567"
              defaultValue={initial.mywhoosh_id}
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
        <div className="space-y-3 rounded-lg border bg-background p-3">
          <div>
            <label className={LABEL}>Geboortedatum</label>
            <input
              type="date"
              name="birth_date"
              min="1900-01-01"
              defaultValue={initial.birth_date}
              className={FIELD}
            />
          </div>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="share_birthday"
              defaultChecked={initial.share_birthday}
              className="mt-1 size-4 accent-primary"
            />
            <span>
              <span className="block text-sm font-medium">
                Deel mijn verjaardag met leden
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Zichtbaarheid
          </h2>
        </div>

        <label className="flex items-start gap-3 rounded-lg border bg-background p-3">
          <input
            type="checkbox"
            name="public_profile_enabled"
            defaultChecked={initial.public_profile_enabled}
            className="mt-1 size-4 accent-primary"
          />
          <span>
            <span className="block text-sm font-medium">
              Publieke profielpagina inschakelen
            </span>
          </span>
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          {VISIBILITY_FIELDS.map((field) => (
            <label
              key={field.key}
              className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                name={`visible_${field.key}`}
                defaultChecked={initial.profile_visibility[field.key] ?? true}
                className="size-4 accent-primary"
              />
              <span>{field.label}</span>
            </label>
          ))}
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
