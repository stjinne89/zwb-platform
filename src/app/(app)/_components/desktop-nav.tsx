"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NAV_GROUPS,
  isActiveGroup,
  isActiveHref,
  type NavNode,
} from "./nav-config";

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "text-foreground font-medium"
          : "text-muted-foreground hover:text-primary"
      }
    >
      {label}
    </Link>
  );
}

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <ul className="hidden flex-1 items-center gap-5 text-sm md:flex">
      {NAV_GROUPS.map((node: NavNode) => {
        if (node.type === "link") {
          return (
            <li key={node.href}>
              <NavLink
                href={node.href}
                label={node.label}
                active={isActiveHref(pathname, node.href)}
              />
            </li>
          );
        }
        const groupActive = isActiveGroup(pathname, node);
        return (
          <li key={node.label}>
            <DropdownMenu>
              <DropdownMenuTrigger
                className={`inline-flex items-center gap-1 outline-none ${
                  groupActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {node.label}
                <ChevronDown className="size-3.5" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {node.items.map((item) => (
                  <DropdownMenuItem
                    key={item.href}
                    render={
                      <Link
                        href={item.href}
                        className={
                          isActiveHref(pathname, item.href)
                            ? "font-medium"
                            : undefined
                        }
                      />
                    }
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        );
      })}
    </ul>
  );
}
