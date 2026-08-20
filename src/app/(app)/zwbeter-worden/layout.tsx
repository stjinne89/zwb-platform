import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { HelpLink, PageHeader } from "@/components/app-ui";
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("sex")
    .eq("id", access.user.id)
    .maybeSingle();

  const sections = filterNavForPermissions(
    ZWBETER_WORDEN_SECTIONS,
    (permission) => access.has(permission),
    (profile?.sex as string | null) ?? null,
  ) as NavLeaf[];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ZWB Training"
        title="ZWBeter Worden"
        actions={<HelpLink href="/hulp#trainingsruimte" />}
      />
      <SectionNav items={sections.map(({ href, label }) => ({ href, label }))} />
      {children}
    </div>
  );
}
