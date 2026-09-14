import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { HelpLink, PageHeader } from "@/components/app-ui";
import { PowerUnitProvider, PowerUnitToggle } from "@/components/power-unit";
import { parsePowerUnit, POWER_UNIT_COOKIE } from "@/lib/training/power-unit";
import {
  ZWBETER_WORDEN_SECTIONS,
  filterNavForPermissions,
  type NavLeaf,
} from "../_components/nav-config";
import { SectionNav } from "./_components/section-nav";

export default async function ZwbeterWordenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) redirect("/login");

  // Geslacht bepaalt of het logboek in de tabbalk staat; zie onlyForSex in
  // nav-config.
  // Het gewicht is de basis voor W/kg op alle trainingspagina's.
  const [{ data: profile }, cookieStore] = await Promise.all([
    supabase.from("profiles").select("sex, weight_kg").eq("id", access.user.id).maybeSingle(),
    cookies(),
  ]);
  const weightKg = profile?.weight_kg == null ? null : Number(profile.weight_kg);

  const sections = filterNavForPermissions(
    ZWBETER_WORDEN_SECTIONS,
    (permission) => access.has(permission),
    (profile?.sex as string | null) ?? null,
  ) as NavLeaf[];

  return (
    <PowerUnitProvider
      initialUnit={parsePowerUnit(cookieStore.get(POWER_UNIT_COOKIE)?.value)}
      weightKg={weightKg}
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="ZWB Training"
          title="ZWBeter Worden"
          actions={
            <div className="flex items-center gap-3">
              <PowerUnitToggle />
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
