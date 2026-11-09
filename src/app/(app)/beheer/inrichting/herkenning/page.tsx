import { CheckCircle2, CircleDashed, CircleAlert } from "lucide-react";
import { envStatus, type EnvState } from "@/lib/club-setup";
import { resolveDisabled, type ModuleKey } from "@/lib/modules";
import { loadClubSetupRow, text } from "../_data";
import { updateClubRecognition } from "../_actions";
import { SettingsForm } from "../_components/settings-form";
import { LoadError, NoSetupAccess, SetupHeader, canSetUpClub } from "../_components/setup-page";

const STATE_ICON: Record<EnvState, { icon: typeof CheckCircle2; className: string }> = {
  ingesteld: { icon: CheckCircle2, className: "text-green-600 dark:text-green-400" },
  deels: { icon: CircleAlert, className: "text-amber-600 dark:text-amber-400" },
  "niet ingesteld": { icon: CircleDashed, className: "text-muted-foreground" },
};

export default async function InrichtingHerkenningPage() {
  if (!(await canSetUpClub())) return <NoSetupAccess />;
  const row = await loadClubSetupRow();
  if (!row) {
    return (
      <div className="space-y-6">
        <SetupHeader title="Herkenning en koppelingen" />
        <LoadError />
      </div>
    );
  }

  const shortName = text(row, "short_name") || "Club";
  const markers = Array.isArray(row.settings.event_markers) ? (row.settings.event_markers as string[]) : [];
  // De env gaat voor de kolom (lib/club-recognition.ts).
  const envMarkers = process.env.ZWB_EVENT_MARKERS?.trim();
  const off = resolveDisabled(row.modules.filter((m) => !m.enabled).map((m) => m.key as ModuleKey));
  const env = envStatus(process.env, (key) => !off.has(key));

  return (
    <div className="space-y-6">
      <SetupHeader title="Herkenning en koppelingen" />
      <SettingsForm
        action={updateClubRecognition}
        sections={[
          {
            title: "Herkenning",
            fields: [
              {
                name: "eventMarkers",
                label: envMarkers ? "Eventmarkers (env ZWB_EVENT_MARKERS gaat voor)" : "Eventmarkers",
                value: markers.join(", "),
                placeholder: shortName,
              },
              { name: "teamTag", label: "Teamtag", value: text(row, "team_tag"), placeholder: shortName, maxLength: 20 },
            ],
          },
          {
            title: "Social",
            fields: [
              { name: "instagramHandle", label: "Instagram", value: text(row, "instagram_handle"), placeholder: "@" },
              { name: "youtubeHandle", label: "YouTube", value: text(row, "youtube_handle"), placeholder: "@" },
            ],
          },
        ]}
      />

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 font-semibold">Env-variabelen</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {env.map((group) => {
            const { icon: Icon, className } = STATE_ICON[group.state];
            return (
              <li key={group.label} className="flex gap-2 rounded-md border bg-background/60 p-2 text-sm">
                <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} />
                <span className="min-w-0">
                  <span className="block font-medium">{group.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {group.state === "ingesteld" ? "Ingesteld" : group.missing.join(", ")}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
