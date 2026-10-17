"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { helpHrefFor } from "@/lib/help-anchors";

/** Het vraagteken in de balk; opent de uitleg over de pagina waar je bent. */
export function HeaderHelpLink({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  const pathname = usePathname();
  return (
    <Link href={helpHrefFor(pathname)} className={className} aria-label="Hulp bij deze pagina">
      <CircleHelp className={iconClassName} />
    </Link>
  );
}
