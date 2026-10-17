import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/app-ui";
import { MemberProfile } from "./_components/member-profile";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LidProfielPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/leden" label="Leden" />
      <MemberProfile profileId={id} viewerId={user.id} />
    </div>
  );
}
