"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { helpHrefForAnchor } from "@/lib/help-categories";

/** Een oude link /hulp#<anker> (bladwijzer, gedeelde link) gaat naar de
 * categorie waar dat onderwerp nu staat. Het anker komt niet bij de server,
 * dus dit gebeurt in de browser. */
export function HelpHashRedirect() {
  const router = useRouter();
  useEffect(() => {
    const follow = () => {
      const anchor = decodeURIComponent(window.location.hash.slice(1));
      const href = anchor ? helpHrefForAnchor(anchor) : null;
      if (href) router.replace(href);
    };
    follow();
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, [router]);
  return null;
}
