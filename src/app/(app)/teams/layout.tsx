import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { PowerUnitProvider } from "@/components/power-unit";
import { parsePowerUnit, POWER_UNIT_COOKIE } from "@/lib/training/power-unit";

// Watt of W/kg, dezelfde keuze (cookie) als bij ZWBeter Worden. De teamtabellen
// hebben per renner zowel watt als W/kg, dus geen gewicht nodig in de provider.
export default async function TeamsLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  return (
    <PowerUnitProvider
      initialUnit={parsePowerUnit(cookieStore.get(POWER_UNIT_COOKIE)?.value)}
      weightKg={null}
    >
      {children}
    </PowerUnitProvider>
  );
}
