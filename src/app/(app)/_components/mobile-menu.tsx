"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "./logout-button";
import {
  AVATAR_NAV,
  NAV_GROUPS,
  isActiveHref,
  type AdminNavItem,
  type NavLeaf,
} from "./nav-config";

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
      onClick={close}
      className={`block rounded-md px-3 py-2.5 text-sm transition ${
        active
          ? "bg-primary font-medium text-primary-foreground"
          : "text-foreground hover:bg-muted"
      }`}
    >
      {item.label}
    </Link>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
  );
}

export function MobileMenu({
  displayName,
  adminItems,
}: {
  displayName: string;
  adminItems: AdminNavItem[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  // SSR-safe portal: pas mounten als de DOM beschikbaar is.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Body-scroll lock terwijl het menu open is.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Sluit menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="rounded-md p-2 text-foreground hover:bg-muted md:hidden"
      >
        {open ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden
          >
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        )}
      </button>

      {/* Portal naar document.body om alle stacking contexts (van bv. de
          header met backdrop-blur) te omzeilen. */}
      {mounted && open
        ? createPortal(
            <div className="md:hidden">
              {/* Backdrop */}
              <div
                className="fixed inset-x-0 bottom-0 top-14 z-[9998] bg-zwb-petrol-dark/80 dark:bg-black/80"
                onClick={close}
                aria-hidden
              />
              {/* Panel */}
              <div className="fixed inset-x-0 top-14 z-[9999] max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b bg-card shadow-2xl">
                <nav className="mx-auto flex max-w-6xl flex-col gap-0.5 px-4 py-3">
                  {NAV_GROUPS.map((node) => {
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
                      <div key={node.label} className="flex flex-col gap-0.5">
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

                  <div className="my-2 border-t" />

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
