import { WORD_FIELDS } from "@/lib/club-setup";
import { buildClubWords } from "@/lib/club-texts";
import { MODULES, resolveDisabled, type ModuleGroup, type ModuleKey } from "@/lib/modules";
import { loadClubSetupRow, text } from "../_data";
import { updateClubNames } from "../_actions";
import { SettingsForm, type FieldDef } from "../_components/settings-form";
import { LoadError, NoSetupAccess, SetupHeader, canSetUpClub } from "../_components/setup-page";

const GROUP_TITLES: Record<ModuleGroup, string> = {
  algemeen: "Modules",
  zwift: "Zwift en online racen",
};

export default async function InrichtingNamenPage() {
  if (!(await canSetUpClub())) return <NoSetupAccess />;
  const row = await loadClubSetupRow();
  if (!row) {
    return (
      <div className="space-y-6">
        <SetupHeader title="Namen en woorden" />
        <LoadError />
      </div>
    );
  }

  // Alleen modules die aan staan: een uitgezette module laat niemand zijn naam zien.
  const off = resolveDisabled(row.modules.filter((m) => !m.enabled).map((m) => m.key as ModuleKey));
  const labels = new Map(row.modules.map((m) => [m.key, m.label]));
  const moduleFields = (group: ModuleGroup): FieldDef[] =>
    MODULES.filter((m) => m.group === group && !off.has(m.key)).map((m) => ({
      name: `m:${m.key}`,
      label: m.label,
      value: labels.get(m.key) ?? "",
      placeholder: m.label,
      maxLength: 40,
    }));

  // Het neutrale woord als voorinvulling; "<korte naam>-app" volgt de korte naam.
  const neutral = buildClubWords({ shortName: text(row, "short_name") || "Club" });
  const placeholders: Record<(typeof WORD_FIELDS)[number]["key"], string> = {
    appName: neutral.app,
    adviceName: neutral.adviesnaam,
    currencyNoun: neutral.bal,
    currencyNounPlural: neutral.ballen,
    cupNoun: neutral.beker,
    betterWord: neutral.beter,
  };
  const wordFields: FieldDef[] = WORD_FIELDS.map((field) => ({
    name: field.key,
    label: field.label,
    value: text(row, field.column),
    placeholder: placeholders[field.key],
    maxLength: 40,
  }));

  const sections = [
    { title: "Woorden", fields: wordFields },
    ...(["algemeen", "zwift"] as const)
      .map((group) => ({ title: GROUP_TITLES[group], fields: moduleFields(group) }))
      .filter((section) => section.fields.length > 0),
  ];

  return (
    <div className="space-y-6">
      <SetupHeader title="Namen en woorden" />
      <SettingsForm action={updateClubNames} sections={sections} />
    </div>
  );
}
