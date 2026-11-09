"use client";

import { useState } from "react";
import { ZWB_INSTAGRAM_URL } from "@/lib/instagram";

export type InstagramPost = {
  id: string;
  title: string;
  web_url: string | null;
  cover_url: string | null;
  story: boolean;
  /** Post van een ander account waarin de club is getagd; de titel is dan @naam. */
  tagged: boolean;
};

// Live stories en de laatste posts van @zwb_cycling, plus posts van anderen
// waarin de club is getagd, uit de Instagram-sync. Instagram-CDN-URL's
// verlopen na verloop van tijd; een tegel waarvan de afbeelding niet meer laadt
// verdwijnt, en zonder werkende tegels verdwijnt de hele sectie. Elke post is
// een tegel, de foto vult hem helemaal.
export function InstagramStrip({ posts }: { posts: InstagramPost[] }) {
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  const markBroken = (id: string) =>
    setBroken((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  const shown = posts.filter((p) => p.cover_url && !broken.has(p.id));
  if (shown.length === 0) return null;

  return (
    <ul className="contents" aria-label="Instagram">
      {shown.map((post) => (
        <li key={post.id} className="flex">
          <a
            href={post.web_url ?? ZWB_INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="tg-tile tg-meer group w-full !p-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover_url!}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              ref={(img) => {
                if (img?.complete && img.naturalWidth === 0) markBroken(post.id);
              }}
              onError={() => markBroken(post.id)}
              className="!absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
            <span className="!absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3.5 pb-3 pt-10 text-white">
              <span className="tg-tile-small block">
                Instagram{post.story ? " · story" : post.tagged ? " · getagd" : ""}
              </span>
              <span className="line-clamp-2 text-base font-medium leading-tight">{post.title}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
