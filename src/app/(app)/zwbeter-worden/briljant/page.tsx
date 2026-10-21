import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/app-ui";
import { BriljantView } from "@/components/briljant/briljant-view";
import { getRequestUser } from "@/lib/auth/request";
import { FACET_LABELS } from "@/lib/briljant/score";
import { collectBriljant, loadHistory, rememberVisit } from "@/lib/briljant/server";
import { briljantView } from "@/lib/briljant/view";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "ZWBriljant" };

export default async function BriljantPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const [collected, history] = await Promise.all([collectBriljant(admin, user.id), loadHistory(admin, user.id)]);
  const view = briljantView({ seed: user.id, input: collected.input, consistency: collected.consistency, history });

  if (view.score == null) {
    return (
      <EmptyState>
        <p>Nog te weinig gegevens voor je steen.</p>
        <p className="mt-2 text-sm">
          Ontbreekt: {view.missing.map((facet) => FACET_LABELS[facet]).join(", ")}.{" "}
          <Link href="/hulp/training#zwbriljant" className="underline underline-offset-2">
            Wat is er nodig?
          </Link>
        </p>
      </EmptyState>
    );
  }

  await rememberVisit(admin, user.id, collected);
  return <BriljantView view={view} />;
}
