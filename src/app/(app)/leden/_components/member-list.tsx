"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { AchievementBadge } from "@/components/achievement-badge";
import { CommunityRoleBadges } from "@/components/community-role-badges";
import { Button } from "@/components/ui/button";
import { RoleEditor } from "./role-editor";

export type MemberAwardBadge = {
  id: string;
  title: string;
  icon: string | null;
  color: string | null;
};

export type MemberZwb = {
  level: number;
  ring: string;
  title: string;
};

export type MemberListProfile = {
  id: string;
  display_name: string;
  region: string | null;
  zwift_id: string | null;
  zrl_category: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  community_roles: string[] | null;
  zwb: MemberZwb | null;
  awards: MemberAwardBadge[];
};

const ZRL_CATEGORIES = ["A", "B", "C", "D", "E"];

function initials(name: string): string {
  const parts = name
    .replace(/\([^)]*\)|\[[^\]]*\]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function MemberList({
  profiles,
  regions,
  canManageRoles,
}: {
  profiles: MemberListProfile[];
  regions: string[];
  canManageRoles: boolean;
}) {
  const [region, setRegion] = useState<string>("");
  const [zrlSet, setZrlSet] = useState<Set<string>>(() => new Set());

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      if (region && p.region !== region) return false;
      if (zrlSet.size > 0 && (!p.zrl_category || !zrlSet.has(p.zrl_category))) {
        return false;
      }
      return true;
    });
  }, [profiles, region, zrlSet]);

  function toggleZrl(cat: string) {
    setZrlSet((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const filterActive = Boolean(region) || zrlSet.size > 0;

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Geregistreerd ({filtered.length}
          {filtered.length !== profiles.length && ` van ${profiles.length}`})
        </h2>
        {filterActive && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setRegion("");
              setZrlSet(new Set());
            }}
          >
            <X className="size-4" />
            Filters wissen
          </Button>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-background p-2 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Regio:</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-md border bg-background px-2 py-1 text-sm"
          >
            <option value="">— alle —</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs text-muted-foreground">ZRL:</span>
          {ZRL_CATEGORIES.map((cat) => {
            const active = zrlSet.has(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleZrl(cat)}
                className={`rounded-full border px-2 py-0.5 text-xs transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
                aria-pressed={active}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Geen leden gevonden met deze filters.
        </p>
      ) : (
        <ul className="divide-y">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="flex items-start justify-between gap-3 py-2 text-sm"
            >
              <div className="flex min-w-0 gap-3">
                <Link
                  href={`/leden/${p.id}`}
                  className={`mt-0.5 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zwb-petrol text-xs font-semibold text-white ${
                    p.zwb
                      ? `ring-2 ring-offset-2 ring-offset-card ${p.zwb.ring}`
                      : ""
                  }`}
                  aria-label={
                    p.zwb
                      ? `Bekijk profiel van ${p.display_name} — ZWBeterWorden: ${p.zwb.title}`
                      : `Bekijk profiel van ${p.display_name}`
                  }
                  title={p.zwb ? `ZWBeterWorden: ${p.zwb.title}` : undefined}
                >
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.avatar_url}
                      alt=""
                      width={40}
                      height={40}
                      className="size-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    initials(p.display_name)
                  )}
                </Link>
                <div className="min-w-0">
                  <p>
                    <Link
                      href={`/leden/${p.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {p.display_name}
                    </Link>
                    {p.zrl_category && (
                      <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                        {p.zrl_category}
                      </span>
                    )}
                    {p.region && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {p.region}
                      </span>
                    )}
                  </p>
                  <div className="mt-1">
                    <CommunityRoleBadges
                      roles={p.community_roles}
                      isAdmin={p.is_admin}
                      compact
                    />
                  </div>
                  {p.awards.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.awards.map((badge) => (
                        <AchievementBadge
                          key={badge.id}
                          title={badge.title}
                          icon={badge.icon}
                          color={badge.color}
                          compact
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {p.zwift_id && (
                  <span className="text-xs text-muted-foreground">
                    Zwift {p.zwift_id}
                  </span>
                )}
                {canManageRoles && (
                  <RoleEditor profileId={p.id} roles={p.community_roles} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
