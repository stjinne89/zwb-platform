import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ZwbMark } from "@/components/zwb-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "./_components/logout-button";

const NAV = [
  { href: "/kalender", label: "Kalender" },
  { href: "/teams", label: "Teams" },
  { href: "/achievements", label: "Achievements" },
  { href: "/leden", label: "Leden" },
  { href: "/training", label: "Training" },
  { href: "/materiaal", label: "Materiaal" },
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card/40 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link
            href="/dashboard"
            className="flex items-center"
            aria-label="ZWB Cycling Community"
          >
            <ZwbMark className="h-7 w-auto" />
          </Link>
          <ul className="flex flex-1 gap-4 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/profiel"
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
          >
            {profile?.display_name ?? user.email}
          </Link>
          <ThemeToggle />
          <LogoutButton />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
