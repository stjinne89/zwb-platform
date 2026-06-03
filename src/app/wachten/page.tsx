import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ZwbLogo } from "@/components/zwb-logo";
import { LogoutButton } from "@/app/(app)/_components/logout-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function WachtenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, is_approved, created_at")
    .eq("id", user.id)
    .single();

  if (profile?.is_approved) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
        <ZwbLogo className="h-16 w-auto text-foreground" />

        <div className="space-y-3">
          <h1 className="text-xl font-semibold tracking-tight">
            Welkom bij ZWB Cycling, {profile?.display_name ?? user.email}!
          </h1>
          <p className="text-sm text-muted-foreground">
            Je registratie is ontvangen en wacht op goedkeuring door een
            beheerder. Zodra dat gebeurd is krijg je toegang tot het platform.
          </p>
          <p className="text-sm text-muted-foreground">
            Vragen? Neem contact op met het ZWB-bestuur.
          </p>
          <Link
            href="/welkom"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Open de starthelper
          </Link>
        </div>

        <div className="flex items-center justify-between border-t pt-4 text-sm">
          <span className="text-muted-foreground">
            Ingelogd als {user.email}
          </span>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
