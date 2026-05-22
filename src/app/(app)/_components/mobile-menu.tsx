"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  // SSR-safe portal: pas mounten als de DOM beschikbaar is.
  useEffect(() => {
    setMounted(true);
  }, []);

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
              {/* Backdrop — dekt de hele viewport onder de header */}
              <div
                className="fixed inset-x-0 bottom-0 top-14 z-[9998] bg-zwb-petrol-dark/80 dark:bg-black/80"
                onClick={close}
                aria-hidden
              />
              {/* Panel — fully opaque card-bg, scrollable als de lijst lang is */}
              <div className="fixed inset-x-0 top-14 z-[9999] max-h-[calc(100vh-3.5rem)] overflow-y-auto border-b bg-card shadow-2xl">
                <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
                  {items.map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(`${item.href}/`);
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
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
