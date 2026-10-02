import { redirect } from "next/navigation";
import { BackLink } from "@/components/app-ui";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { NewPostForm } from "./_form";

export default async function NewPostPage() {
  const access = await getCurrentUserAccess(await createClient());
  if (!access.has("content.create_posts")) redirect("/materiaal");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink href="/materiaal" label="Vraag en Aanbod" />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Nieuw bericht plaatsen</h1>
        <p className="mt-1 text-muted-foreground">
          Bied iets aan, zoek materiaal, stel een vraag of deel een tip met de
          ZWB-community.
        </p>
      </header>
      <NewPostForm />
    </div>
  );
}
