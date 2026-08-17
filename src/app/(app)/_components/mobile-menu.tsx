"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LogoutButton } from "./logout-button";
import {
  AVATAR_NAV,
  isActiveHref,
  type AdminNavItem,
  type NavLeaf,
  type NavNode,
} from "./nav-config";

// Alle links delen dezelfde linkermarge, ook binnen een groep: 1px rand +
// px-3 zet de tekst op 13px. De kopjes lijnen daarop uit met 2px rand + 11px.
function MobileMenuItem({
  item,
  pathname,
  close,
}: {
  item: NavLeaf;
  pathname: string;
  close: () => void;
}) {
  const active = isActiveHref(pathname, item.href);
  return (
    <Link
      href={item.href}
      target={item.external ? "_blank" : undefined}
      rel={item.external ? "noopener noreferrer" : undefined}
      onClick={close}
      className={`block rounded-md border px-3 py-2.5 text-sm transition ${
        active
          ? "border-primary bg-primary font-medium text-primary-foreground shadow-sm"
          : "border-transparent text-foreground hover:border-border hover:bg-muted"
      }`}
    >
      {item.label}
    </Link>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="pb-1 pt-3">
      <p className="border-l-2 border-primary/50 pl-[11px] pr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function MobileMenu({
  displayName,
  adminItems,
  nodes,
}: {
  displayName: string;
  adminItems: AdminNavItem[];
  nodes: NavNode[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const originalBodyOverflow = useRef<string | null>(null);
  const pathname = usePathname();
  const close = () => setOpen(false);

  // SSR-safe portal: pas mounten als de DOM beschikbaar is.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Sluit het menu bij navigatie, ook als de Link-click state-update niet
  // meer commit voor de routewissel.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  // Body-scroll lock terwijl het menu open is.
  useEffect(() => {
    if (open) {
      if (originalBodyOverflow.current === null) {
        originalBodyOverflow.current = document.body.style.overflow;
      }
      document.body.style.overflow = "hidden";
      return () => {
        if (originalBodyOverflow.current !== null) {
          document.body.style.overflow = originalBodyOverflow.current;
          originalBodyOverflow.current = null;
        }
      };
    }

    if (originalBodyOverflow.current !== null) {
      document.body.style.overflow = originalBodyOverflow.current;
      originalBodyOverflow.current = null;
    }

    return () => {
      if (originalBodyOverflow.current !== null) {
        document.body.style.overflow = originalBodyOverflow.current;
        originalBodyOverflow.current = null;
      }
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Sluit menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="rounded-md border border-transparent p-2 text-foreground hover:border-border hover:bg-muted md:hidden"
      >
        {open ? (
          <X className="size-5" aria-hidden />
        ) : (
          <Menu className="size-5" aria-hidden />
        )}
      </button>

      {/* Portal naar document.body om alle stacking contexts (van bv. de
          header met backdrop-blur) te omzeilen. */}
      {mounted && open
        ? createPortal(
            <div className="md:hidden">
              {/* Backdrop */}
              <div
                className="fixed inset-x-0 bottom-0 top-14 z-[9998] bg-zwb-petrol-dark/55 backdrop-blur-[1px] dark:bg-black/80"
                onClick={close}
                aria-hidden
              />
              {/* Panel */}
              <div className="fixed inset-x-0 top-14 z-[9999] max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b border-border bg-card shadow-2xl ring-1 ring-border/70 dark:ring-white/10">
                <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
                  {nodes.map((node) => {
                    if (node.type === "link") {
                      return (
                        <MobileMenuItem
                          key={node.href}
                          item={node}
                          pathname={pathname}
                          close={close}
                        />
                      );
                    }
                    return (
                      <div key={node.label} className="flex flex-col gap-1 border-t border-border/80 pt-1 first:border-t-0 first:pt-0 dark:border-white/10">
                        <SectionHeader label={node.label} />
                        {node.items.map((item) => (
                          <MobileMenuItem
                            key={item.href}
                            item={item}
                            pathname={pathname}
                            close={close}
                          />
                        ))}
                      </div>
                    );
                  })}

                  <div className="my-2 border-t border-border/80 dark:border-white/10" />

                  <SectionHeader label={displayName} />
                  {AVATAR_NAV.map((item) => (
                    <MobileMenuItem
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      close={close}
                    />
                  ))}

                  {adminItems.length > 0 && (
                    <>
                      <SectionHeader label="Beheer" />
                      {adminItems.map((item) => (
                        <MobileMenuItem
                          key={item.href}
                          pathname={pathname}
                          close={close}
                          item={{
                            type: "link",
                            href: item.href,
                            label: item.label,
                          }}
                        />
                      ))}
                    </>
                  )}

                  <div className="px-3 py-2">
                    <LogoutButton />
                  </div>
                </nav>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
