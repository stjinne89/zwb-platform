import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { AutoRefresh } from "@/app/omnium/_components/auto-refresh";
import { BackLink, PageHeader } from "@/components/app-ui";
import { buttonVariants } from "@/components/ui/button";
import { getRequestUser } from "@/lib/auth/request";
import { loadDsView } from "@/lib/ds/snapshot";
import { DsSections } from "./_components/ds-sections";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "ZWB DS" };

export default async function DsPage({ params, searchParams }: PageProps) {
  const { eventId } = await params;
  const query = (await searchParams) ?? {};
  const user = await getRequestUser();
  let viewerZwiftId: string | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("zwift_id").eq("id", user.id).maybeSingle();
    viewerZwiftId = (data?.zwift_id as string | null) ?? null;
  }
  const outcome = await loadDsView(eventId, {
    subgroupId: typeof query.groep === "string" ? query.groep : undefined,
    viewerZwiftId,
  });
  if (outcome.status === "not-found" || outcome.status === "no-zwift-event") notFound();

  if (outcome.status !== "ok") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <BackLink href={`/events/${eventId}`} label="Event" />
        <PageHeader eyebrow="ZWB DS" title="Raceoverzicht" />
        <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          {outcome.status === "not-configured" ? "ZWB DS staat nog niet aan." : "Zwift is nu niet bereikbaar."}
        </p>
      </div>
    );
  }

  const { view } = outcome;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {view.live && <AutoRefresh seconds={15} />}
      <BackLink href={`/events/${view.event.id}`} label="Event" />
      <PageHeader
        eyebrow="ZWB DS"
        title={view.event.title}
        actions={
          view.event.zrlLiveHref ? (
            <Link href={view.event.zrlLiveHref} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              <Trophy className="size-3.5" />
              Live stand
            </Link>
          ) : undefined
        }
      />
      <DsSections view={view} />
    </div>
  );
}
