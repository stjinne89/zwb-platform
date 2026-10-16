"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ChevronRight, Search } from "lucide-react";

type ShelfView = {
  slug: string;
  label: string;
  books: { href: string; title: string; summary: string; collection: string }[];
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** De planken van de leeszaal, met zoeken op titel, samenvatting en plank. */
export function ShelfBrowser({
  shelves,
  topicLinks,
}: {
  shelves: ShelfView[];
  topicLinks: Record<string, ReactNode>;
}) {
  const [query, setQuery] = useState("");
  const terms = normalize(query).split(/\s+/).filter(Boolean);

  const index = useMemo(
    () =>
      shelves.map((shelf) => ({
        ...shelf,
        books: shelf.books.map((book) => ({
          ...book,
          haystack: normalize(`${shelf.label} ${book.title} ${book.summary} ${book.collection}`),
        })),
      })),
    [shelves],
  );

  const visible = index
    .map((shelf) => ({
      ...shelf,
      books: shelf.books.filter((book) => terms.every((term) => book.haystack.includes(term))),
    }))
    .filter((shelf) => shelf.books.length > 0);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Zoek in de leeszaal"
          aria-label="Zoek in de leeszaal"
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Niets gevonden.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((shelf) => (
            <section key={shelf.slug} id={shelf.slug} className="scroll-mt-20 rounded-lg border bg-card p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {shelf.label}
              </h2>
              <ul className="mt-2 divide-y">
                {shelf.books.map((book) => (
                  <li key={book.href}>
                    <Link
                      href={book.href}
                      className="flex min-h-[44px] items-center justify-between gap-3 py-2 hover:text-primary"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{book.title}</span>
                        <span className="line-clamp-1 text-xs text-muted-foreground">{book.summary}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <span className="max-sm:hidden">{book.collection}</span>
                        <ChevronRight className="size-4" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {terms.length === 0 && topicLinks[shelf.slug]}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
