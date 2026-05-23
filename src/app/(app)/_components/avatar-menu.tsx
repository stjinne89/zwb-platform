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
}: {
  displayName: string;
  adminItems: AdminNavItem[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="hidden items-center gap-1 text-sm text-muted-foreground outline-none hover:text-primary md:inline-flex"
        aria-label="Persoonlijk menu"
      >
        {displayName}
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
