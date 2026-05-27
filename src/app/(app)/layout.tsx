import { redirect } from "next/navigation";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { ZwbMark } from "@/components/zwb-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { DesktopNav } from "./_components/desktop-nav";
import { AvatarMenu } from "./_components/avatar-menu";
import { MobileMenu } from "./_components/mobile-menu";
import { ADMIN_NAV } from "./_components/nav-config";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, access] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    getCurrentUserAccess(supabase),
  ]);

  const displayName = profile?.display_name ?? user.email ?? "";
  const adminItems = ADMIN_NAV.filter((item) => access.has(item.permission));

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <header className="relative border-b border-border/80 bg-background/88 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2.5 md:gap-6">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center"
            aria-label="ZWB Cycling Community"
          >
            <ZwbMark className="h-7 w-auto" />
          </Link>

          {/* Desktop nav (5 top-level slots, sommige met dropdown) */}
          <DesktopNav />

          {/* Spacer voor mobiel zodat right-side rechts uitlijnt */}
          <div className="flex-1 md:hidden" />

          {/* Right side: avatar-dropdown + theme + mobile-hamburger */}
          <div className="flex items-center gap-2">
            <Link
              href="/hulp"
              className="hidden rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-primary md:inline-flex"
              aria-label="Hulp"
            >
              <CircleHelp className="size-4" />
            </Link>
            <AvatarMenu displayName={displayName} adminItems={adminItems} />
            <ThemeToggle />
            <MobileMenu displayName={displayName} adminItems={adminItems} />
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
