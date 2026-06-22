import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Cake, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { HelpLink } from "@/components/app-ui";
import {
  ageOnBirthday,
  amsterdamDateKey,
  amsterdamWallTimeToIso,
  birthdayOccurrence,
  formatDateKey,
  parseDateKey,
} from "@/lib/birthdays";
import {
  EventLiveTicker,
  type EventLiveSession,
  type EventLivePosition,
} from "@/app/(app)/events/[id]/_components/event-live-ticker";
import { RouteSection } from "@/app/(app)/events/[id]/_components/route-section";
import type { ColLite } from "@/lib/gpx-climbs";
import {
  BirthdayMessages,
  type BirthdayMessage,
} from "./_components/birthday-messages";
import { BirthdayPhotoUploader } from "./_components/birthday-photo-uploader";
import {
  BirthdayPhotoGallery,
  type BirthdayPhoto,
} from "./_components/birthday-photo-gallery";
import {
  BirthdayRideCard,
  type BirthdayRide,
} from "./_components/birthday-ride";
import { BirthdayRsvpPicker } from "./_components/birthday-rsvp-buttons";

// Buiten de component zodat de purity-lint Date.now() niet als impure-in-render
// markeert (zelfde patroon als de event-detailpagina).
function activeCutoffIso() {
  return new Date(Date.now() - 15 * 60 * 1000).toISOString();
}

function relationName(relation: unknown) {
  const profile = Array.isArray(relation) ? relation[0] : relation;
  return (
    (profile as { display_name?: string | null } | null)?.display_name ??
    "ZWB'er"
  );
}

export default async function BirthdayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ jaar?: string | string[] }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = parseDateKey(amsterdamDateKey());
  if (!today) notFound();
  const requestedYear = Array.isArray(query.jaar) ? query.jaar[0] : query.jaar;
  const celebrationYear = requestedYear ? Number(requestedYear) : today.year;
  if (
    !Number.isInteger(celebrationYear) ||
    celebrationYear < 2000 ||
    celebrationYear > 2100
  ) {
    notFound();
  }

  const [{ data: profile }, { data: currentProfile }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, birth_date, share_birthday")
      .eq("id", id)
      .eq("is_approved", true)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single(),
  ]);

  if (
    !profile?.birth_date ||
    (!profile.share_birthday && profile.id !== user.id)
  ) {
    notFound();
  }

  const occurrence = birthdayOccurrence(profile.birth_date, celebrationYear);
  if (!occurrence) notFound();

  const [{ data: messageRows }, { data: photoRows }, { data: rideRow }] =
    await Promise.all([
      supabase
        .from("birthday_messages")
        .select(
          "id, author_profile_id, body, created_at, author:profiles!birthday_messages_author_profile_id_fkey(display_name)",
        )
        .eq("birthday_profile_id", id)
        .eq("celebration_year", celebrationYear)
        .order("created_at"),
      supabase
        .from("birthday_photos")
        .select(
          "id, storage_path, uploader_profile_id, created_at, uploader:profiles!birthday_photos_uploader_profile_id_fkey(display_name)",
        )
        .eq("birthday_profile_id", id)
        .eq("celebration_year", celebrationYear)
        .order("created_at", { ascending: false }),
      supabase
        .from("birthday_rides")
        .select(
          "ride_date, ride_time, location, invitation, gpx_path, distance_km, elevation_m",
        )
        .eq("birthday_profile_id", id)
        .eq("celebration_year", celebrationYear)
        .maybeSingle(),
    ]);

  const messages: BirthdayMessage[] = (messageRows ?? []).map((row) => ({
    id: row.id,
    authorProfileId: row.author_profile_id,
    authorName: relationName(row.author),
    body: row.body,
    createdAt: row.created_at,
  }));

  const photos: BirthdayPhoto[] = [];
  for (const row of photoRows ?? []) {
    const { data } = await supabase.storage
      .from("birthday-photos")
      .createSignedUrl(row.storage_path, 3600);
    if (!data?.signedUrl) continue;
    photos.push({
      id: row.id,
      url: data.signedUrl,
      uploaderProfileId: row.uploader_profile_id,
      uploaderName: relationName(row.uploader),
      createdAt: row.created_at,
    });
  }

  let ride: BirthdayRide | null = rideRow
    ? {
        rideDate: rideRow.ride_date,
        rideTime: rideRow.ride_time,
        location: rideRow.location,
        invitation: rideRow.invitation,
        gpxPath: rideRow.gpx_path,
        gpxUrl: null,
        distanceKm:
          rideRow.distance_km === null ? null : Number(rideRow.distance_km),
        elevationM: rideRow.elevation_m,
      }
    : null;
  if (ride?.gpxPath) {
    const { data } = await supabase.storage
      .from("birthday-gpx")
      .createSignedUrl(ride.gpxPath, 3600);
    ride = { ...ride, gpxUrl: data?.signedUrl ?? null };
  }

  // Cols voor de klim-naam-matching op het hoogteprofiel/de kaart — alleen
  // ophalen als er een route is.
  let cols: ColLite[] = [];
  if (ride?.gpxUrl) {
    const { data: colRows } = await supabase
      .from("cols")
      .select("slug, name, summit_lat, summit_lon, detection_radius_m")
      .not("summit_lat", "is", null)
      .not("summit_lon", "is", null);
    cols = ((colRows ?? []) as Array<{
      slug: string;
      name: string;
      summit_lat: number | string;
      summit_lon: number | string;
      detection_radius_m: number | null;
    }>).map((c) => ({
      slug: c.slug,
      name: c.name,
      summit_lat: Number(c.summit_lat),
      summit_lon: Number(c.summit_lon),
      detection_radius_m: c.detection_radius_m,
    }));
  }

  const age = ageOnBirthday(profile.birth_date, celebrationYear);
  const isToday = occurrence.dateKey === amsterdamDateKey();

  // RSVP voor het verjaardagsrondje (zelfde model als events): alleen
  // aangemelde renners verschijnen op de live-kaart. RSVPs bestaan alleen
  // als er een rondje is.
  type BirthdayRsvpStatus = "yes" | "maybe" | "no";
  type RsvpEntry = { profileId: string; name: string };
  const rsvpGroups: Record<BirthdayRsvpStatus, RsvpEntry[]> = {
    yes: [],
    maybe: [],
    no: [],
  };
  let myRsvp: BirthdayRsvpStatus | null = null;
  if (ride) {
    const { data: rsvpRows } = await supabase
      .from("birthday_ride_rsvps")
      .select("profile_id, status, profiles(display_name)")
      .eq("birthday_profile_id", id)
      .eq("celebration_year", celebrationYear);
    for (const row of rsvpRows ?? []) {
      const status = row.status as BirthdayRsvpStatus;
      if (!rsvpGroups[status]) continue;
      rsvpGroups[status].push({
        profileId: row.profile_id,
        name: relationName(row.profiles),
      });
      if (row.profile_id === user.id) myRsvp = status;
    }
  }
  const ridingParticipantIds = [
    ...rsvpGroups.yes.map((e) => e.profileId),
    ...rsvpGroups.maybe.map((e) => e.profileId),
  ];

  // Liveticker voor het verjaardagsrondje: op de dag van het rondje zelf tonen
  // we kaart + hoogteprofiel met de aangemelde renners (yes/maybe) die nu
  // outdoor delen op Samen fietsen, net als bij events. Op andere dagen blijft
  // de route via kaart + hoogteprofiel zichtbaar.
  const rideStartAt =
    ride !== null
      ? amsterdamWallTimeToIso(ride.rideDate, ride.rideTime)
      : null;
  const rideIsToday = ride !== null && ride.rideDate === amsterdamDateKey();

  let rideLiveSessions: EventLiveSession[] = [];
  let rideLivePositions: EventLivePosition[] = [];
  if (ride?.gpxUrl && rideIsToday && ridingParticipantIds.length > 0) {
    const cutoff = activeCutoffIso();
    const { data: sessionRows } = await supabase
      .from("live_sessions")
      .select(
        "id, profile_id, source, started_at, last_seen_at, profiles(display_name)",
      )
      .in("profile_id", ridingParticipantIds)
      .eq("mode", "outdoor")
      .is("ended_at", null)
      .gte("last_seen_at", cutoff)
      .order("started_at", { ascending: false });

    rideLiveSessions = (sessionRows ?? []).map((s) => ({
      id: s.id,
      profileId: s.profile_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profileName: ((s.profiles as any)?.display_name as string) ?? "ZWB'er",
      source: (s.source ?? "manual") as EventLiveSession["source"],
      startedAt: s.started_at,
      lastSeenAt: s.last_seen_at,
    }));

    const sessionIds = rideLiveSessions.map((s) => s.id);
    if (sessionIds.length > 0) {
      const { data: positionRows } = await supabase
        .from("live_positions")
        .select(
          "session_id, profile_id, lat, lng, altitude, speed_kmh, recorded_at",
        )
        .in("session_id", sessionIds)
        .order("recorded_at", { ascending: false })
        .limit(Math.max(500, sessionIds.length * 80));
      rideLivePositions = (positionRows ?? []) as unknown as EventLivePosition[];
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/kalender"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="size-4" />
        Terug naar kalender
      </Link>

      <header className="relative overflow-hidden rounded-2xl border border-zwb-gold/50 bg-card shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-zwb-gold before:content-['']">
        <div className="bg-gradient-to-br from-zwb-gold/25 via-card to-zwb-gold/5 p-6 pl-7 sm:p-8 sm:pl-9">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="size-20 rounded-full object-cover shadow-sm ring-4 ring-zwb-gold/45 ring-offset-2 ring-offset-background"
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-full bg-zwb-gold/15 text-zwb-gold ring-4 ring-zwb-gold/45 ring-offset-2 ring-offset-background">
                <Cake className="size-9" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                {isToday ? "Vandaag jarig" : "Verjaardag"}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                {profile.display_name}
              </h1>
              <p className="mt-1">
                {formatDateKey(occurrence.dateKey, { dateStyle: "full" })}
                {age !== null ? ` · ${age} jaar` : ""}
              </p>
            </div>
          </div>
        </div>
      </header>

      {profile.share_birthday ? (
        <>
          <BirthdayRideCard
            birthdayProfileId={profile.id}
            celebrationYear={celebrationYear}
            birthdayName={profile.display_name}
            defaultDate={occurrence.dateKey}
            isOwner={profile.id === user.id}
            ride={ride}
          />

          {ride && (
            <section className="space-y-4 rounded-lg border border-zwb-gold/25 bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Rijd je mee?
                </h2>
                <HelpLink href="/hulp#verjaardagsrondje" />
              </div>
              <BirthdayRsvpPicker
                birthdayProfileId={profile.id}
                celebrationYear={celebrationYear}
                current={myRsvp}
                groups={rsvpGroups}
              />
            </section>
          )}

          {ride?.gpxUrl &&
            (rideIsToday && rideStartAt ? (
              <EventLiveTicker
                gpxUrl={ride.gpxUrl}
                eventStartAt={rideStartAt}
                sessions={rideLiveSessions}
                initialPositions={rideLivePositions}
                cols={cols}
                heading="Live tijdens het verjaardagsrondje"
                description="Aangemelde renners worden op de route en het hoogteprofiel gevolgd."
                emptyText="Nog geen live deelnemers. Zodra een aangemelde renner vandaag outdoor deelt op Samen fietsen, verschijnt die hier."
              />
            ) : (
              <RouteSection gpxUrl={ride.gpxUrl} cols={cols} />
            ))}

          <BirthdayMessages
            birthdayProfileId={profile.id}
            celebrationYear={celebrationYear}
            birthdayName={profile.display_name}
            currentUserId={user.id}
            isAdmin={currentProfile?.is_admin ?? false}
            messages={messages}
          />

          <section className="space-y-4 rounded-lg border border-zwb-gold/25 bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Foto&apos;s ({photos.length})
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Stuur een leuke foto mee voor {profile.display_name}.
                </p>
              </div>
              <BirthdayPhotoUploader
                birthdayProfileId={profile.id}
                celebrationYear={celebrationYear}
              />
            </div>
            <BirthdayPhotoGallery
              birthdayProfileId={profile.id}
              celebrationYear={celebrationYear}
              currentUserId={user.id}
              isAdmin={currentProfile?.is_admin ?? false}
              photos={photos}
            />
          </section>
        </>
      ) : (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Je deelt je verjaardag momenteel niet met andere leden. Je kunt dit
          aanpassen in je profiel.
        </p>
      )}
    </div>
  );
}
