import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";
import { TegelsAgenda, type AgendaRow } from "@/components/tegels/agenda";
import { Button } from "@/components/ui/button";
import {
  EVENT_KINDS,
  EVENT_TYPES,
  eventLabel,
  eventTypeColor,
  eventTypeInk,
} from "@/lib/event-types";
import {
  BIRTHDAY_FILTER,
  birthdaysMatchFilter,
  calendarHref,
  eventMatchesFilter,
  OWN_TRAINING_FILTER,
  ownTrainingsMatchFilter,
  parseProgramFilter,
  parseTypeFilter,
  splitTypeFilter,
} from "@/lib/events/type-filter";
import { programsByEvent, programsForGroup } from "@/lib/events/programs";
import { LabelFilter, type LabelGroup, type LabelOption } from "./_components/label-filter";
import { CYCLING_SPORTS } from "@/lib/strava/sports";
import { groupRouteFigures, groupSubEvents, subEventLabel } from "@/lib/events/sub-events";
import { eventRouteSize } from "@/lib/events/route-size";
import {
  eventGroupFitsMember,
  fitIsInformative,
  resolveMemberFit,
  FIT_REASON_LABELS,
  MIN_RIDES_FOR_CEILING,
  type FitReason,
} from "@/lib/events/fit";
import {
  amsterdamDateKey,
  nextBirthdayOccurrence,
} from "@/lib/birthdays";
import { getClub } from "@/lib/club";
import { fillClubText } from "@/lib/club-texts";

const HISTORY_DAYS = 365;
// De kalender toont alleen vandaag en later; voorbije events worden alleen
// geteld. Ophalen vanaf 30 dagen terug, zodat een meerdaagse tour waarvan het
// hoofdevent al begonnen is (FRR, migr. 0196) nog met zijn etappes meekomt. Wat
// ouder is, telt via een losse telling mee in "Ouder".
const PAST_WINDOW_DAYS = 30;
type RsvpStatus = "yes" | "maybe" | "no";
type SearchParams = Promise<{
  voor?: string;
  type?: string | string[];
  programma?: string | string[];
  zonder?: string | string[];
  "zonder-programma"?: string | string[];
}>;

function pastWindowStartIso() {
  return new Date(Date.now() - PAST_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * De langste rit en de zwaarste klimdag van het afgelopen jaar. Twee
 * top-1-queries plus een telling; de vijf rijen van de eerste query zijn er
 * alleen om te weten óf er genoeg ritten zijn (zie MIN_RIDES_FOR_CEILING).
 */
async function loadRideHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
) {
  const sinceIso = new Date(
    Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const base = () =>
    supabase
      .from("strava_activities")
      .select("distance_m, total_elevation_gain_m")
      .eq("profile_id", profileId)
      .eq("commute", false)
      .in("sport_type", CYCLING_SPORTS)
      .gte("start_date", sinceIso);

  const [{ data: longest }, { data: steepest }] = await Promise.all([
    base().order("distance_m", { ascending: false }).limit(MIN_RIDES_FOR_CEILING),
    base().order("total_elevation_gain_m", { ascending: false }).limit(1),
  ]);

  const rides = longest ?? [];
  if (rides.length === 0) return null;
  return {
    rideCount: rides.length,
    longestKm: Number(rides[0].distance_m) / 1000,
    biggestClimbM: steepest?.[0]
      ? Number(steepest[0].total_elevation_gain_m)
      : null,
  };
}

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const clubTexts = (await getClub()).texts;
  const params = await searchParams;
  const onlyForMe = params.voor === "mij";
  const excludedTypes = parseTypeFilter(params.zonder);
  const excludedPrograms = parseProgramFilter(params["zonder-programma"]);
  // Aan en uit tegelijk kan alleen via een met de hand gemaakte URL; uit wint.
  const selectedTypes = parseTypeFilter(params.type).filter(
    (value) => !excludedTypes.includes(value),
  );
  const selectedPrograms = parseProgramFilter(params.programma).filter(
    (slug) => !excludedPrograms.includes(slug),
  );

  const [supabase, user] = await Promise.all([createClient(), getRequestUser()]);
  const canCreateEvents = (await getRequestAccess()).has("events.create");
  const windowStartIso = pastWindowStartIso();

  const [
    { data: allEvents },
    { count: olderTopLevelCount },
    { data: birthdayProfiles },
    { data: me },
    { data: myTeams },
    { data: myRsvps },
    { data: myTeamAvailability },
    { data: myLineups },
    { data: programRows },
    { data: programLinks },
  ] = await Promise.all([
      supabase
        .from("events")
        .select(
          "id, title, description, type, kind, start_at, location, distance_km, elevation_m, gpx_path, zwift_route_id, laps, duration_minutes, cover_image_path, team_id, parent_event_id",
        )
        .gte("start_at", windowStartIso)
        .order("start_at", { ascending: true }),
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .is("parent_event_id", null)
        .lt("start_at", windowStartIso),
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url, birth_date")
        .eq("is_approved", true)
        .eq("share_birthday", true)
        .not("birth_date", "is", null),
      user
        ? supabase
            .from("profiles")
            .select("event_type_interests, fit_max_distance_km, fit_max_elevation_m")
            .eq("id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user
        ? supabase.from("team_members").select("team_id").eq("profile_id", user.id)
        : Promise.resolve({ data: null }),
      // Je eigen "ja" en "nee". De nee stond hier eerst niet, waardoor Voor mij
      // events bleef tonen waar je je al voor had afgemeld; de ja ontbrak tot
      // 13 september, waardoor een afgeleide grens of interesse een rit
      // verborg waar je je zelf voor had aangemeld.
      user
        ? supabase
            .from("event_rsvps")
            .select("event_id, status")
            .eq("profile_id", user.id)
            .in("status", ["yes", "no"] satisfies RsvpStatus[])
        : Promise.resolve({ data: null }),
      // Teamritten meld je niet via de RSVP aan, maar op de teampagina.
      user
        ? supabase
            .from("team_event_availability")
            .select("event_id")
            .eq("profile_id", user.id)
            .eq("status", "available")
        : Promise.resolve({ data: null }),
      user
        ? supabase.from("team_event_lineups").select("event_id").eq("profile_id", user.id)
        : Promise.resolve({ data: null }),
      supabase
        .from("event_programs")
        .select("id, slug, name, archived_at")
        .order("name"),
      // Alleen de koppelingen van events in het venster; voorbije events van
      // een programma staan op de programmapagina.
      supabase
        .from("event_program_links")
        .select("program_id, event_id, events!inner(start_at)")
        .gte("events.start_at", windowStartIso),
    ]);

  // Ritgeschiedenis alleen ophalen als het lid minstens één as leeg liet; wie
  // beide grenzen zelf invulde heeft de afleiding niet nodig. Twee kleine
  // top-1-queries in plaats van een jaar aan ritten in het geheugen.
  const needsHistory =
    Boolean(user) &&
    (me?.fit_max_distance_km == null || me?.fit_max_elevation_m == null);
  const rideHistory =
    needsHistory && user ? await loadRideHistory(supabase, user.id) : null;

  // Wie in een hoofdteam zit, rijdt voor een van zijn subteams: die races
  // tellen als eigen team (migr. 0179).
  const directTeamIds = (myTeams ?? []).map((row) => row.team_id as string);
  const { data: mySubteams } =
    directTeamIds.length > 0
      ? await supabase.from("teams").select("id").in("parent_team_id", directTeamIds)
      : { data: [] };
  const member = resolveMemberFit({
    interests: me?.event_type_interests ?? null,
    teamIds: [...directTeamIds, ...(mySubteams ?? []).map((row) => row.id as string)],
    declinedEventIds: (myRsvps ?? [])
      .filter((row) => row.status === "no")
      .map((row) => row.event_id),
    committedEventIds: [
      ...(myRsvps ?? []).filter((row) => row.status === "yes").map((row) => row.event_id),
      ...(myTeamAvailability ?? []).map((row) => row.event_id),
      ...(myLineups ?? []).map((row) => row.event_id),
    ],
    maxDistanceKm: me?.fit_max_distance_km ?? null,
    maxElevationM: me?.fit_max_elevation_m ?? null,
    history: rideHistory,
  });

  const todayKey = amsterdamDateKey(new Date());
  // Alleen vandaag + toekomstige events op de kalender — voorbije events
  // verhuizen naar /ritverslagen. Zo staat het event van vandaag (of het
  // eerstvolgende) bovenaan.
  // Teamevents staan onder hun hoofdevent (migr. 0178), niet als eigen regel.
  // Bij een rondekoers is de GPX één ronde: kaart en Voor mij-filter kijken naar
  // het totaal, en bij rijden op tijd ligt de afstand niet vast.
  const sizedEvents = (allEvents ?? []).map((event) => {
    const size = eventRouteSize(event);
    return { ...event, distance_km: size.distanceKm, elevation_m: size.elevationM };
  });
  const { topLevel, childrenByParent } = groupSubEvents(sizedEvents);
  // Een FRR-tour (migr. 0196) heeft een laag extra: tour → etappe → tijdslot.
  // Het laatste event eronder bepaalt tot wanneer de regel blijft staan.
  const lastDayOf = (event: { id: string; start_at: string }) => {
    let last = amsterdamDateKey(new Date(event.start_at));
    for (const child of childrenByParent.get(event.id) ?? []) {
      const day = amsterdamDateKey(new Date(child.start_at));
      if (day > last) last = day;
    }
    return last;
  };
  const upcoming = topLevel.filter((event) => lastDayOf(event) >= todayKey);

  // Wat past er niet, en waarom? Ook zonder actief filter berekend, zodat de
  // knop meteen zijn aantal kan tonen.
  const hiddenByReason = new Map<FitReason, number>();
  const forMe = upcoming.filter((event) => {
    const verdict = eventGroupFitsMember(
      event,
      childrenByParent.get(event.id) ?? [],
      member,
    );
    if (verdict.fits) return true;
    hiddenByReason.set(verdict.reason, (hiddenByReason.get(verdict.reason) ?? 0) + 1);
    return false;
  });
  const hiddenCount = upcoming.length - forMe.length;
  // Het labelfilter versmalt Alles of Voor mij; de aantallen op de knoppen
  // tellen dus binnen die keuze.
  const scoped = onlyForMe ? forMe : upcoming;
  const linkedPrograms = programsByEvent(programRows ?? [], programLinks ?? []);
  const programsOf = (event: { id: string }) =>
    programsForGroup(event, childrenByParent, linkedPrograms);
  const typeCounts = new Map<string, number>();
  const kindCounts = new Map<string, number>();
  const programCounts = new Map<string, number>();
  for (const event of scoped) {
    typeCounts.set(event.type, (typeCounts.get(event.type) ?? 0) + 1);
    if (event.kind) kindCounts.set(event.kind, (kindCounts.get(event.kind) ?? 0) + 1);
    for (const program of programsOf(event)) {
      programCounts.set(program.slug, (programCounts.get(program.slug) ?? 0) + 1);
    }
  }
  const filter = splitTypeFilter(selectedTypes, selectedPrograms, {
    types: excludedTypes,
    programs: excludedPrograms,
  });
  const events = scoped.filter((event) =>
    eventMatchesFilter(
      event,
      filter,
      programsOf(event).map((program) => program.slug),
    ),
  );
  const allBirthdays = (birthdayProfiles ?? []).flatMap((profile) => {
    if (!profile.birth_date) return [];
    const occurrence = nextBirthdayOccurrence(profile.birth_date, todayKey);
    if (!occurrence) return [];
    return [
      {
        kind: "birthday" as const,
        id: profile.id,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        birthDate: profile.birth_date,
        dateKey: occurrence.dateKey,
        year: occurrence.year,
      },
    ];
  });
  const birthdays = birthdaysMatchFilter(filter) ? allBirthdays : [];
  // De eigen trainingen staan tussen de events in de lijst.
  const { data: workoutRows } =
    user
      ? await supabase
          .from("training_workouts")
          .select("id, title, scheduled_at, duration_minutes, event_id")
          .is("superseded_at", null)
          .eq("profile_id", user.id)
          .gte("scheduled_at", `${todayKey}T00:00:00`)
          .order("scheduled_at", { ascending: true })
          .limit(21)
      : { data: null };
  // Een gekozen of uitgezet label blijft staan als er (onder Voor mij) niets
  // meer van over is, anders kun je het niet meer terugzetten.
  const present = (option: LabelOption) =>
    option.count > 0 ||
    selectedTypes.includes(option.value) ||
    excludedTypes.includes(option.value);
  const labelGroups: LabelGroup[] = [
    {
      title: "Programma",
      axis: "program" as const,
      options: (programRows ?? [])
        // Een gearchiveerd programma is niet meer te kiezen, tenzij het al aanstaat.
        .filter(
          (program) =>
            selectedPrograms.includes(program.slug) ||
            excludedPrograms.includes(program.slug) ||
            (!program.archived_at && (programCounts.get(program.slug) ?? 0) > 0),
        )
        .map((program) => ({
          value: program.slug as string,
          label: program.name as string,
          count: programCounts.get(program.slug) ?? 0,
          dot: null,
        })),
    },
    {
      title: "Categorie",
      axis: "type" as const,
      options: EVENT_TYPES.map((entry) => ({
        value: entry.value,
        label: fillClubText(entry.label, clubTexts),
        count: typeCounts.get(entry.value) ?? 0,
        dot: eventTypeColor(entry.value),
      })).filter(present),
    },
    {
      title: "Type",
      axis: "type" as const,
      options: EVENT_KINDS.map((entry) => ({
        value: entry.value,
        label: entry.label,
        count: kindCounts.get(entry.value) ?? 0,
        dot: null,
      })).filter(present),
    },
    {
      title: null,
      axis: "type" as const,
      options: [
        {
          value: BIRTHDAY_FILTER,
          label: "Verjaardagen",
          count: allBirthdays.length,
          dot: "var(--zwb-gold)",
        },
        ...(user
          ? [
              {
                value: OWN_TRAINING_FILTER,
                label: "Mijn trainingen",
                count: workoutRows?.length ?? 0,
                dot: "var(--tg-zwbeter)",
              },
            ]
          : []),
      ].filter(present),
    },
  ].filter((group) => group.options.length > 0);
  const labelCount = labelGroups.reduce((sum, group) => sum + group.options.length, 0);
  const calendarItems = [
    ...events.map((event) => ({
      kind: "event" as const,
      sortKey:
        `${amsterdamDateKey(new Date(event.start_at))}|` +
        `${event.start_at}|event|${event.id}`,
      event,
    })),
    ...birthdays.map((birthday) => ({
      kind: "birthday" as const,
      sortKey:
        `${birthday.dateKey}|${birthday.dateKey}T09:00:00|` +
        `birthday|${birthday.id}`,
      birthday,
    })),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  // Renners die "ja" hebben gezegd, met avatar + naam onder de eventtitel.
  type YesRider = { id: string; name: string; avatarUrl: string | null };
  const yesRidersByEvent = new Map<string, YesRider[]>();
  // Een "ja" op een teamevent telt mee op het hoofdevent.
  const rsvpTarget = new Map<string, string>();
  for (const event of events) {
    rsvpTarget.set(event.id, event.id);
    for (const child of childrenByParent.get(event.id) ?? []) {
      rsvpTarget.set(child.id, event.id);
      for (const grandchild of childrenByParent.get(child.id) ?? []) {
        rsvpTarget.set(grandchild.id, event.id);
      }
    }
  }
  const upcomingEventIds = [...rsvpTarget.keys()];
  if (upcomingEventIds.length > 0) {
    const { data: yesRsvps } = await supabase
      .from("event_rsvps")
      .select("event_id, profiles(id, display_name, avatar_url)")
      .in("event_id", upcomingEventIds)
      .eq("status", "yes" satisfies RsvpStatus);

    for (const rsvp of yesRsvps ?? []) {
      const profile = Array.isArray(rsvp.profiles)
        ? rsvp.profiles[0]
        : rsvp.profiles;
      if (!profile) continue;
      const target = rsvpTarget.get(rsvp.event_id) ?? rsvp.event_id;
      const current = yesRidersByEvent.get(target) ?? [];
      if (current.some((rider) => rider.id === profile.id)) continue;
      current.push({
        id: profile.id,
        name: profile.display_name,
        avatarUrl: profile.avatar_url,
      });
      yesRidersByEvent.set(target, current);
    }
  }

  const filterNav = (
      <nav className="flex flex-wrap items-center gap-2" aria-label="Kalenderfilter">
        {user && (
          <>
          <Link
            href={calendarHref({
              onlyForMe: false,
              types: selectedTypes,
              programs: selectedPrograms,
              excluded: excludedTypes,
              excludedPrograms,
            })}
            aria-current={onlyForMe ? undefined : "page"}
            className={`tg-link tg-kalender tg-chip rounded-full border px-3 py-1 text-xs ${
              onlyForMe ? "hover:bg-secondary" : "bg-foreground text-background"
            }`}
          >
            Alles ({upcoming.length})
          </Link>
          <Link
            href={calendarHref({
              onlyForMe: true,
              types: selectedTypes,
              programs: selectedPrograms,
              excluded: excludedTypes,
              excludedPrograms,
            })}
            aria-current={onlyForMe ? "page" : undefined}
            className={`tg-link tg-kalender tg-chip rounded-full border px-3 py-1 text-xs ${
              onlyForMe ? "bg-foreground text-background" : "hover:bg-secondary"
            }`}
          >
            Voor mij ({forMe.length})
          </Link>
          </>
        )}
        {labelCount > 1 && (
          <LabelFilter
            groups={labelGroups}
            selected={selectedTypes}
            selectedPrograms={selectedPrograms}
            excluded={excludedTypes}
            excludedPrograms={excludedPrograms}
            onlyForMe={onlyForMe}
          />
        )}
        {user && (
          <>
          {onlyForMe && hiddenCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {hiddenCount} verborgen ·{" "}
              {[...hiddenByReason.entries()]
                .map(([reason, count]) => `${FIT_REASON_LABELS[reason]} (${count})`)
                .join(" · ")}
            </span>
          )}
          {onlyForMe && hiddenCount === 0 && !fitIsInformative(member) && (
            <Link href="/profiel?weergave=bewerken#interesses" className="text-xs underline">
              Stel je interesses in
            </Link>
          )}
          </>
        )}
      </nav>
  );

  // Events en de eigen trainingen in één lijst, met wat geweest is erboven.
  // Ritverslagen vervalt als los onderdeel; een voorbij event open je vanuit
  // deze lijst.
  const zone = { timeZone: "Europe/Amsterdam" } as const;
  const dayOf = (date: Date, timeZone: string = zone.timeZone) => ({
    day: date.toLocaleDateString("nl-NL", { weekday: "short", timeZone }).slice(0, 2),
    dayNumber: date.toLocaleDateString("nl-NL", { day: "numeric", timeZone }),
  });
  const timeOf = (iso: string) =>
    new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", ...zone });

  // Een training die bij een event hoort (training_workouts.event_id, migr.
  // 0116) staat niet als eigen regel: het event staat er al. De duur komt dan
  // bij dat event te staan. Een teamevent telt mee via zijn hoofdevent.
  // Losse trainingen volgen het label Mijn trainingen.
  const shownEventIds = new Set(events.map((event) => event.id));
  const showOwnTrainings = ownTrainingsMatchFilter(filter);
  const workoutByEvent = new Map<string, { duration_minutes: number | null }>();
  const looseWorkouts = (workoutRows ?? []).filter((workout) => {
    const target = workout.event_id
      ? (rsvpTarget.get(workout.event_id as string) ?? (workout.event_id as string))
      : null;
    if (!target || !shownEventIds.has(target)) return showOwnTrainings;
    workoutByEvent.set(target, { duration_minutes: workout.duration_minutes });
    return false;
  });
  const eventColor = (type: string) => ({ bg: eventTypeColor(type), ink: eventTypeInk(type) });

  const pastRows: AgendaRow[] = topLevel
    .filter((event) => lastDayOf(event) < todayKey)
    .slice(-5)
    .map((event) => ({
      key: `past-${event.id}`,
      href: `/events/${event.id}`,
      dateKey: amsterdamDateKey(new Date(event.start_at)),
      color: eventColor(event.type),
      ...dayOf(new Date(event.start_at)),
      title: event.title,
      sub: ["geweest", fillClubText(eventLabel(event.type, event.kind), clubTexts), event.location]
        .filter(Boolean)
        .join(" · "),
    }));

  const upcomingRows: Array<AgendaRow & { sortKey: string }> = [
    ...calendarItems.map((item) => {
      if (item.kind === "birthday") {
        const birthday = item.birthday;
        return {
          sortKey: item.sortKey,
          key: `birthday-${birthday.id}-${birthday.year}`,
          href: `/verjaardagen/${birthday.id}?jaar=${birthday.year}`,
          dateKey: birthday.dateKey,
          color: { bg: "var(--tg-vandaag)", ink: "var(--tg-ink)" },
          image: birthday.avatarUrl,
          ...dayOf(new Date(`${birthday.dateKey}T12:00:00Z`), "UTC"),
          title: `Verjaardag van ${birthday.displayName}`,
        };
      }
      const event = item.event;
      const riders = yesRidersByEvent.get(event.id) ?? [];
      const subEvents = childrenByParent.get(event.id) ?? [];
      const figures = groupRouteFigures(event, subEvents);
      return {
        sortKey: item.sortKey,
        key: `event-${event.id}`,
        href: `/events/${event.id}`,
        dateKey: amsterdamDateKey(new Date(event.start_at)),
        color: eventColor(event.type),
        ...dayOf(new Date(event.start_at)),
        title: event.title,
        sub: [
          fillClubText(eventLabel(event.type, event.kind), clubTexts),
          workoutByEvent.has(event.id)
            ? `jouw training${
                workoutByEvent.get(event.id)?.duration_minutes
                  ? ` ${workoutByEvent.get(event.id)?.duration_minutes} min`
                  : ""
              }`
            : null,
          event.location,
          figures.distanceKm ? `${figures.distanceKm} km` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        time: timeOf(event.start_at),
        riders,
        extra:
          subEvents.length > 0
            ? subEvents.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/events/${sub.id}`}
                  className="inline-flex min-h-9 items-center border bg-card px-3 text-xs font-medium hover:bg-muted"
                >
                  {subEventLabel(sub.title, event.title)}
                </Link>
              ))
            : undefined,
      };
    }),
    ...looseWorkouts.map((workout) => ({
      sortKey:
        `${amsterdamDateKey(new Date(workout.scheduled_at))}|` +
        `${workout.scheduled_at}|training|${workout.id}`,
      key: `training-${workout.id}`,
      href: "/zwbeter-worden/schema",
      dateKey: amsterdamDateKey(new Date(workout.scheduled_at)),
      color: { bg: "var(--tg-zwbeter)", ink: "var(--tg-paper)" },
      ...dayOf(new Date(workout.scheduled_at)),
      title: workout.title as string,
      sub: ["training", workout.duration_minutes ? `${workout.duration_minutes} min` : null]
        .filter(Boolean)
        .join(" · "),
    })),
  ].sort((x, y) => x.sortKey.localeCompare(y.sortKey));

  return (
    <div className="space-y-4">
      <header className="tg-repeats-nav flex items-end justify-end gap-3">
        <h1 className="tg-display">Kalender</h1>
        {canCreateEvents && (
          <Link href="/kalender/nieuw">
            <Button>Nieuw event</Button>
          </Link>
        )}
      </header>
      {filterNav}
      {(olderTopLevelCount ?? 0) > 0 && (
        <p className="text-sm">
          <Link href="/ritverslagen" className="font-medium text-muted-foreground hover:text-primary">
            Ouder ({olderTopLevelCount})
          </Link>
        </p>
      )}
      <TegelsAgenda
        past={pastRows}
        upcoming={upcomingRows}
        todayKey={todayKey}
        empty="Geen aankomende events of trainingen."
      />
    </div>
  );
}
