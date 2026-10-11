import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HelpLink, PageHeader } from "@/components/app-ui";
import { PowerUnitProvider, PowerUnitToggle } from "@/components/power-unit";
import { parsePowerUnit, POWER_UNIT_COOKIE } from "@/lib/training/power-unit";
import {
  ZWBETER_WORDEN_SECTIONS,
  filterNavForPermissions,
  type NavLeaf,
} from "../_components/nav-config";
import { SectionNav } from "./_components/section-nav";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";

export default async function ZwbeterWordenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [supabase, user, cookieStore] = await Promise.all([
    createClient(),
    getRequestUser(),
    cookies(),
  ]);
  if (!user) redirect("/login");

  // Geslacht bepaalt of het logboek in de tabbalk staat; zie onlyForSex in
  // nav-config.
  // Het gewicht is de basis voor W/kg op alle trainingspagina's, de FTP voor het
  // omrekenen van bloksdoelen tussen watt en % FTP.
  const [access, { data: profile }] = await Promise.all([
    getRequestAccess(),
    supabase.from("profiles").select("sex, weight_kg, ftp_watts").eq("id", user.id).maybeSingle(),
  ]);
  const weightKg = profile?.weight_kg == null ? null : Number(profile.weight_kg);
  const ftpWatts = profile?.ftp_watts == null ? null : Number(profile.ftp_watts);

  const sections = filterNavForPermissions(
    ZWBETER_WORDEN_SECTIONS,
    (permission) => access.has(permission),
    (profile?.sex as string | null) ?? null,
  ) as NavLeaf[];

  return (
    <PowerUnitProvider
      initialUnit={parsePowerUnit(cookieStore.get(POWER_UNIT_COOKIE)?.value)}
      weightKg={weightKg}
      ftpWatts={ftpWatts}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="ZWB Training"
          title="ZWBeter Worden"
          actions={
            <div className="flex items-center gap-3">
              <PowerUnitToggle percent />
              <HelpLink href="/hulp#trainingsruimte" />
            </div>
          }
        />
        <SectionNav items={sections.map(({ href, label }) => ({ href, label }))} />
        {children}
      </div>
    </PowerUnitProvider>
  );
}
