"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "./logout-button";

type NavItem = { href: string; label: string };

export function MobileMenu({
  items,
  displayName,
}: {
  items: NavItem[];
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

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

      {open && (
        <>
          {/* Backdrop — stevig contrast in beide themes */}
          <div
            className="fixed inset-0 top-14 z-40 bg-zwb-petrol-dark/70 md:hidden dark:bg-black/70"
            onClick={close}
            aria-hidden
          />
          {/* Panel — fully opaque card-bg + sterke schaduw zodat het uit het scherm "tilt" */}
          <div className="absolute inset-x-0 top-full z-50 border-b bg-card shadow-2xl md:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className={`rounded-md px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-primary font-medium text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <div className="my-2 border-t" />
              <Link
                href="/profiel"
                onClick={close}
                className="rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-muted"
              >
                {displayName}
              </Link>
              <div className="px-3 py-2">
                <LogoutButton />
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
