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
  type NavLeaf,
  type NavNode,
} from "./nav-config";

function linkTarget(item: NavLeaf) {
  return item.external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};
}

function NavLink({ item, active }: { item: NavLeaf; active: boolean }) {
  return (
    <Link
      href={item.href}
      {...linkTarget(item)}
      className={
        active
          ? "text-foreground font-medium"
          : "text-muted-foreground hover:text-primary"
      }
    >
      {item.label}
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
                item={node}
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
                        {...linkTarget(item)}
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
