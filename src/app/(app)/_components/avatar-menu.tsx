"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoutButton } from "./logout-button";
import { AVATAR_NAV, type NavLeaf } from "./nav-config";

export function AvatarMenu({
  displayName,
  personalItems = AVATAR_NAV,
  avatarUrl,
  beheerPage = false,
}: {
  displayName: string;
  /** De persoonlijke links, zonder die van uitgeschakelde modules. */
  personalItems?: NavLeaf[];
  /** De profielfoto; zonder foto staat de naam er. */
  avatarUrl?: string | null;
  /** Eén link naar /beheer, voor wie daar iets mag. */
  beheerPage?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground outline-none hover:text-primary"
        aria-label={`Persoonlijk menu van ${displayName}`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="size-9 rounded-full object-cover" />
        ) : (
          displayName
        )}
        <ChevronDown className="size-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {/* Hulp staat overal waar dit menu staat al als vraagteken ernaast. */}
        {personalItems.filter((item) => item.href !== "/hulp").map((item) => (
          <DropdownMenuItem
            key={item.href}
            render={<Link href={item.href} />}
          >
            {item.label}
          </DropdownMenuItem>
        ))}

        {beheerPage && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/beheer" />}>Beheer</DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <LogoutButton />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
