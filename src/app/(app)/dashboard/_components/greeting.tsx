"use client";

// De begroeting moet van de klok van het lid komen, en die kent de server niet.
// Daarom rendert de server eerst de Nederlandse tijd — goed voor verreweg de
// meeste leden en identiek aan wat de client bij hydratie verwacht — en zet de
// browser hem daarna om naar de eigen tijdzone. Zonder die volgorde krijg je
// ofwel een hydratiewaarschuwing, ofwel een dashboard dat een tel lang leeg is.

import { useEffect, useState } from "react";
import { greetingWithName } from "@/lib/greeting";

export function Greeting({
  name,
  /** Uur in Nederland, door de server berekend; de start- en terugvalwaarde. */
  serverHour,
}: {
  name: string | null;
  serverHour: number;
}) {
  const [hour, setHour] = useState(serverHour);

  useEffect(() => {
    const apply = () => setHour(new Date().getHours());
    apply();
    // Wie het dashboard open laat staan, ziet de groet meeschuiven zodra het uur
    // wisselt. Elke minuut kijken is genoeg en kost niets.
    const timer = window.setInterval(apply, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return <>{greetingWithName(hour, name)}</>;
}
