import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ZwbMark } from "@/components/zwb-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "./_components/logout-button";
import { MobileMenu } from "./_components/mobile-menu";

const NAV = [
  { href: "/kalender", label: "Kalender" },
  { href: "/teams", label: "Teams" },
  { href: "/achievements", label: "Achievements" },
  { href: "/leden", label: "Leden" },
  { href: "/training", label: "Training" },
  { href: "/materiaal", label: "Vraag en Aanbod" },
  { href: "/media", label: "Media" },
  { href: "/community", label: "Community" },
];

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, is_admin")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name ?? user.email ?? "";

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <header className="relative border-b-2 border-accent/80 bg-card/85 shadow-sm shadow-primary/5 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:gap-6">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center"
            aria-label="ZWB Cycling Community"
          >
            <ZwbMark className="h-7 w-auto" />
          </Link>

          {/* Desktop navigation */}
          <ul className="hidden flex-1 gap-4 text-sm md:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Spacer for mobile (pushes right items to the right) */}
          <div className="flex-1 md:hidden" />

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Link
              href="/profiel"
              className="hidden text-sm text-muted-foreground hover:text-primary md:inline"
            >
              {displayName}
            </Link>
            <ThemeToggle />
            <div className="hidden md:block">
              <LogoutButton />
            </div>
            <MobileMenu items={NAV} displayName={displayName} />
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
