"use client";

import { useState } from "react";
import { ArrowRight, Images } from "lucide-react";
import { SectionHeader } from "@/components/app-ui";
import { ZWB_INSTAGRAM_URL, ZWB_INSTAGRAM_USERNAME } from "@/lib/instagram";

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
// verdwijnt, en zonder werkende tegels verdwijnt de hele sectie.
export function InstagramStrip({ posts }: { posts: InstagramPost[] }) {
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  const markBroken = (id: string) =>
    setBroken((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  const shown = posts.filter((p) => p.cover_url && !broken.has(p.id));
  if (shown.length === 0) return null;

  return (
    <section>
      <SectionHeader
        icon={Images}
        title="Instagram"
        action={
          <a
            href={ZWB_INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
          >
            @{ZWB_INSTAGRAM_USERNAME}
            <ArrowRight className="size-4" />
          </a>
        }
      />
      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {shown.map((post) => (
          <li key={post.id}>
            <a
              href={post.web_url ?? ZWB_INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block aspect-square overflow-hidden rounded-lg border bg-secondary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.cover_url!}
                alt={post.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                // Een fout vóór de hydratie mist onError; dan vangt de ref hem.
                ref={(img) => {
                  if (img?.complete && img.naturalWidth === 0) markBroken(post.id);
                }}
                onError={() => markBroken(post.id)}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
              {(post.story || post.tagged) && (
                <span className="absolute left-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  {post.story ? "Story" : post.title}
                </span>
              )}
              {!post.tagged && (
                <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/75 to-transparent p-2 pt-6 sm:block">
                  <p className="line-clamp-2 text-xs text-white">{post.title}</p>
                </div>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
