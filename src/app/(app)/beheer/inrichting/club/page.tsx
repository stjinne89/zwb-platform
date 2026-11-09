import { NEUTRAL_CLUB_NAME } from "@/lib/club-setup";
import { loadClubSetupRow, text } from "../_data";
import { updateClubIdentity } from "../_actions";
import { SettingsForm } from "../_components/settings-form";
import { LoadError, NoSetupAccess, SetupHeader, canSetUpClub } from "../_components/setup-page";

export default async function InrichtingClubPage() {
  if (!(await canSetUpClub())) return <NoSetupAccess />;
  const row = await loadClubSetupRow();

  // De neutrale naam van een lege installatie is geen ingevulde naam.
  const own = (column: string) => {
    const value = row ? text(row, column) : "";
    return value === NEUTRAL_CLUB_NAME ? "" : value;
  };

  return (
    <div className="space-y-6">
      <SetupHeader title="Club" />
      {!row ? (
        <LoadError />
      ) : (
        <SettingsForm
          action={updateClubIdentity}
          sections={[
            {
              title: "Naam",
              fields: [
                { name: "name", label: "Naam", value: own("name"), required: true, maxLength: 80 },
                { name: "shortName", label: "Korte naam", value: own("short_name"), required: true, maxLength: 20 },
                { name: "memberNoun", label: "Lid", value: text(row, "member_noun"), placeholder: "lid", maxLength: 40 },
                {
                  name: "memberNounPlural",
                  label: "Leden",
                  value: text(row, "member_noun_plural"),
                  placeholder: "leden",
                  maxLength: 40,
                },
              ],
            },
            {
              title: "Contact",
              fields: [
                { name: "contactEmail", label: "E-mailadres", value: text(row, "contact_email"), type: "email" },
                { name: "websiteUrl", label: "Website", value: text(row, "website_url"), placeholder: "https://" },
              ],
            },
          ]}
        />
      )}
    </div>
  );
}
