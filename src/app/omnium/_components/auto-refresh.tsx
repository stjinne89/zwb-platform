"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Ververst de pagina tijdens de uitzending. Bewust geen realtime-verbinding:
 * de stand verandert vier keer per uitzending, namelijk als een onderdeel is
 * afgerond. Een poll van twintig seconden bovenop een servercache van vijftien
 * is ruim genoeg en kost één databasequery per cachevenster, hoeveel kijkers er
 * ook zijn.
 */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);

  return null;
}
