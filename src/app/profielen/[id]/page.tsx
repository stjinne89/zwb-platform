import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/app-ui";
import { PublicProfile } from "./_components/public-profile";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PublicProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  // Leden komen hier vanaf het ledenprofiel; een externe bezoeker heeft geen terugweg nodig.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-4">
        {user && <BackLink href={`/leden/${id}`} label="Leden" />}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          ZWB Cycling profiel
        </p>
        <PublicProfile profileId={id} />
      </div>
    </main>
  );
}
