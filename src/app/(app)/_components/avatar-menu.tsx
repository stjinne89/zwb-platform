"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoutButton } from "./logout-button";
import { AVATAR_NAV, type AdminNavItem } from "./nav-config";

export function AvatarMenu({
  displayName,
  adminItems,
  avatarUrl,
  showOnMobile = false,
}: {
  displayName: string;
  adminItems: AdminNavItem[];
  /** Design "tegels": toon de profielfoto in plaats van de naam. */
  avatarUrl?: string | null;
  /** Design "tegels": het menu staat ook op de telefoon in de balk. */
  showOnMobile?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`${
          showOnMobile ? "inline-flex min-h-11" : "hidden md:inline-flex"
        } items-center gap-1 text-sm text-muted-foreground outline-none hover:text-primary`}
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
        {AVATAR_NAV.map((item) => (
          <DropdownMenuItem
            key={item.href}
            render={<Link href={item.href} />}
          >
            {item.label}
          </DropdownMenuItem>
        ))}

        {adminItems.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
              Beheer
            </DropdownMenuLabel>
            {adminItems.map((item) => (
              <DropdownMenuItem
                key={item.href}
                render={<Link href={item.href} />}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
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
