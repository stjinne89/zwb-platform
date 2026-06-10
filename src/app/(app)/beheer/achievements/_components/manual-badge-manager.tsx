"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Award, Trash2 } from "lucide-react";
import { AchievementBadge } from "@/components/achievement-badge";
import { Button } from "@/components/ui/button";
import {
  awardMilestoneBadge,
  revokeMilestoneBadge,
} from "../_actions";

type ProfileOption = {
  id: string;
  display_name: string;
};

type BadgeOption = {
  id: string;
  title: string;
  description: string | null;
  achievement_code: string | null;
  tier: "bronze" | "silver" | "gold" | "platinum" | null;
  icon: string | null;
  color: string | null;
  trigger_source: "auto" | "manual" | "future";
};

type AwardRow = {
  badge_id: string;
  awarded_at: string;
};

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

function labelFor(badge: BadgeOption) {
  const code = badge.achievement_code ? `${badge.achievement_code} - ` : "";
  const tier = badge.tier ? ` (${badge.tier})` : "";
  return `${code}${badge.title}${tier}`;
}

export function ManualBadgeManager({
  profiles,
  badges,
  awards,
  selectedProfileId,
}: {
  profiles: ProfileOption[];
  badges: BadgeOption[];
  awards: AwardRow[];
  selectedProfileId: string;
}) {
  const router = useRouter();
  const [badgeId, setBadgeId] = useState("");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saved"; msg: string }
    | { kind: "error"; msg: string }
  >({ kind: "idle" });

  const earnedIds = useMemo(
    () => new Set(awards.map((award) => award.badge_id)),
    [awards],
  );
  const availableBadges = badges.filter((badge) => !earnedIds.has(badge.id));
  const earnedBadges = badges.filter((badge) => earnedIds.has(badge.id));
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  function selectProfile(profileId: string) {
    setStatus({ kind: "idle" });
    setBadgeId("");
    router.push(`/beheer/achievements?profile=${encodeURIComponent(profileId)}`);
  }

  function award() {
    if (!badgeId) {
      setStatus({ kind: "error", msg: "Kies eerst een badge." });
      return;
    }

    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await awardMilestoneBadge({
        profileId: selectedProfileId,
        badgeId,
      });
      if (!res.ok) {
        setStatus({ kind: "error", msg: res.error });
        return;
      }
      setBadgeId("");
      setStatus({ kind: "saved", msg: "Badge toegekend." });
      router.refresh();
    });
  }

  function revoke(badge: BadgeOption) {
    if (!confirm(`${badge.title} intrekken bij ${selectedProfile?.display_name ?? "dit lid"}?`)) {
      return;
    }

    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await revokeMilestoneBadge({
        profileId: selectedProfileId,
        badgeId: badge.id,
      });
      if (!res.ok) {
        setStatus({ kind: "error", msg: res.error });
        return;
      }
      setStatus({ kind: "saved", msg: "Badge ingetrokken." });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] lg:items-end">
          <div>
            <label className="mb-1 block text-sm font-medium">Lid</label>
            <select
              value={selectedProfileId}
              className={FIELD}
              onChange={(event) => selectProfile(event.currentTarget.value)}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.display_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Badge</label>
            <select
              value={badgeId}
              className={FIELD}
              onChange={(event) => {
                setStatus({ kind: "idle" });
                setBadgeId(event.currentTarget.value);
              }}
            >
              <option value="">Kies een nog niet behaalde badge</option>
              {availableBadges.map((badge) => (
                <option key={badge.id} value={badge.id}>
                  {labelFor(badge)}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" disabled={pending || !badgeId} onClick={award}>
            <Award data-icon="inline-start" />
            Toekennen
          </Button>
        </div>
        {status.kind === "saved" && (
          <p className="mt-3 text-sm text-green-600 dark:text-green-400">
            {status.msg}
          </p>
        )}
        {status.kind === "error" && (
          <p className="mt-3 text-sm text-destructive">{status.msg}</p>
        )}
      </section>

      <section className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">
            Badges van {selectedProfile?.display_name ?? "dit lid"}
          </h2>
        </div>
        {earnedBadges.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Nog geen milestonebadges.
          </p>
        ) : (
          <ul className="divide-y">
            {earnedBadges.map((badge) => (
              <li
                key={badge.id}
                className="grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center"
              >
                <AchievementBadge
                  title={badge.title}
                  icon={badge.icon}
                  color={badge.tier ?? badge.color}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{badge.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {badge.description ?? "Handmatig toegekende badge."}
                    {badge.trigger_source !== "manual" && (
                      <span> Bron: {badge.trigger_source}</span>
                    )}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => revoke(badge)}
                >
                  <Trash2 data-icon="inline-start" />
                  Intrekken
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
