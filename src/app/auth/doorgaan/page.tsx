import { redirect } from "next/navigation";
import { TegelsAuthFrame } from "@/components/tegels/auth-frame";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Doorgaan",
  // De URL draagt een eenmalig token; niet indexeren, niet doorgeven.
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Tussenstap voor e-maillinks (zie src/app/auth/confirm/route.ts): een
 * mailscanner opent deze pagina wel, maar drukt niet op de knop. Pas de knop
 * verzilvert het eenmalige token.
 */
export default async function AuthContinuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tokenHash = first(params.token_hash);
  if (!tokenHash) redirect("/login?error=auth-link-missing");

  const type = first(params.type) ?? "email";
  const next = first(params.next) ?? "/dashboard";

  const isRecovery = type === "recovery" || next === "/wachtwoord-resetten";
  const isSignup = next === "/welkom";
  const title = isRecovery ? "Nieuw wachtwoord" : isSignup ? "Account bevestigen" : "Inloggen";
  const label = isRecovery ? "Wachtwoord instellen" : isSignup ? "Bevestigen" : "Inloggen";

  return (
    <TegelsAuthFrame>
      <h1 className="tg-display">{title}</h1>
      <form method="post" action="/auth/confirm">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next} />
        <Button type="submit" className="tg-link tg-vandaag min-h-11 w-full text-base">
          {label}
        </Button>
      </form>
    </TegelsAuthFrame>
  );
}
