import Link from "next/link";
import { Check, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { tegelsFontVariables } from "@/components/tegels/font";
import { getClub } from "@/lib/club";
import { ClubLogo } from "@/components/tegels/club-logo";
import type { PlaceTone } from "@/components/tegels/link-grid";
import {
  helpVideo,
  helpVideoDuration,
  helpVideoHref,
  type HelpVideoId,
} from "@/lib/help-videos";
import { cn } from "@/lib/utils";
import { clubCommunity } from "@/lib/club-texts";

// De starthelper voor nieuwe leden, in het design "tegels". Elke stap is een
// tegel in de kleur van de soort waar hij heen leidt; de eerstvolgende stap is
// de brede gouden tegel (jij, nu). Een stap die klaar is, of nog niet kan, is
// een paneel zonder kleur en dus geen link (Klikregel in DESIGN.md). Bij elke
// stap hoort waar mogelijk een korte video uit /hulp.
//
// Deze pagina staat buiten de app-schil: ook wie nog niet is goedgekeurd of
// niet is ingelogd komt hier. Daarom een eigen kader met dezelfde tenuebanen,
// zonder de vier tabs (die leiden naar schermen die dan nog dicht zijn).

type StepStatus = "done" | "next" | "open" | "locked";

type Step = {
  title: string;
  /** Korte regel op de gouden tegel, alleen voor de eerstvolgende stap. */
  text: string;
  action: string;
  href: string;
  tone: PlaceTone;
  video?: HelpVideoId;
  done: boolean;
  /** Kan de stap nu al? Zo niet, dan staat er waarom. */
  lockedLabel?: string;
};

function VideoChip({ id, onTile }: { id: HelpVideoId; onTile: boolean }) {
  const video = helpVideo(id);
  const duration = helpVideoDuration(video.seconds);
  return (
    <a
      href={helpVideoHref(id)}
      target="_blank"
      rel="noopener"
      aria-label={`Video: ${video.title} (${duration})`}
      className={cn("tg-video", !onTile && "tg-video-panel")}
    >
      <Play className="size-3.5 fill-current" aria-hidden />
      {duration}
    </a>
  );
}

function StepTile({ step, number, status }: { step: Step; number: number; status: StepStatus }) {
  if (status === "done" || status === "locked") {
    const done = status === "done";
    return (
      <li className="relative">
        <div className="flex h-full min-h-[10.25rem] flex-col bg-[var(--tg-panel)] px-3.5 py-3">
          <span className="tg-tile-small text-muted-foreground">
            {done ? "Klaar" : step.lockedLabel}
          </span>
          <span className={cn("tg-tile-title", !done && "text-muted-foreground")}>
            {step.title}
          </span>
          {done ? (
            <Check className="mt-auto size-11 stroke-[1.25] text-primary" aria-label="klaar" />
          ) : (
            <span className="tg-tile-num text-muted-foreground" aria-hidden>
              {number}
            </span>
          )}
        </div>
        {step.video && (
          <span className="absolute bottom-3 right-3.5">
            <VideoChip id={step.video} onTile={false} />
          </span>
        )}
      </li>
    );
  }

  const next = status === "next";
  return (
    <li className={cn("relative", next && "col-span-2")}>
      <Link
        href={step.href}
        className={cn("tg-tile h-full", next ? "tg-vandaag" : `tg-${step.tone}`)}
      >
        <span className={cn("tg-tile-small", next && step.video && "pr-20")}>
          {next ? `Stap ${number} · nu` : `Stap ${number}`}
        </span>
        <span
          className={
            next
              ? "mt-0.5 pr-20 text-[2rem] font-light leading-[1.05] tracking-tight"
              : "tg-tile-title"
          }
        >
          {step.title}
        </span>
        {next && <span className="mt-1.5 max-w-[34ch] text-[0.9375rem] leading-snug">{step.text}</span>}
        <span className="mt-auto flex items-end justify-between gap-3">
          <span className="tg-tile-num" aria-hidden>
            {number}
          </span>
          {next && (
            <span className="grid min-h-11 place-items-center bg-[var(--tg-paper)] px-5 text-[0.9375rem] font-semibold text-[var(--tg-ink)]">
              {step.action}
            </span>
          )}
        </span>
      </Link>
      {step.video && (
        <span className={cn("absolute right-3.5", next ? "top-3" : "bottom-3")}>
          <VideoChip id={step.video} onTile />
        </span>
      )}
    </li>
  );
}

/** Een video als tegel: de duur is het cijfer onderaan. */
function VideoTile({ id }: { id: HelpVideoId }) {
  const video = helpVideo(id);
  return (
    <li>
      <a
        href={helpVideoHref(id)}
        target="_blank"
        rel="noopener"
        className="tg-tile tg-meer h-full"
      >
        <span className="tg-tile-small flex items-center gap-1.5">
          <Play className="size-3 fill-current" aria-hidden />
          Video
        </span>
        <span className="tg-tile-title">{video.title}</span>
        <span className="tg-tile-num">{helpVideoDuration(video.seconds)}</span>
      </a>
    </li>
  );
}

export default async function WelkomPage() {
  const clubTexts = (await getClub()).texts;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: profile },
    { data: strava },
    { data: intervals },
    { data: pushSubscription },
    { data: trackerToken },
    { data: bike },
    { data: stravaActivity },
    { data: rsvp },
  ] = user
    ? await Promise.all([
        supabase
          .from("profiles")
          .select(
            "display_name, region, bio, avatar_url, zwift_id, zwift_opt_out, zrl_category, is_approved",
          )
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("strava_connections")
          .select("profile_id")
          .eq("profile_id", user.id)
          .maybeSingle(),
        supabase
          .from("intervals_connections")
          .select("profile_id")
          .eq("profile_id", user.id)
          .maybeSingle(),
        supabase
          .from("push_subscriptions")
          .select("id")
          .eq("profile_id", user.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("live_tracker_tokens")
          .select("id")
          .eq("profile_id", user.id)
          .in("provider", ["mail", "wahoo_link"])
          .is("revoked_at", null)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("strava_bikes")
          .select("id")
          .eq("profile_id", user.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("strava_activities")
          .select("id")
          .eq("profile_id", user.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("event_rsvps")
          .select("event_id")
          .eq("profile_id", user.id)
          .in("status", ["yes", "maybe"])
          .limit(1)
          .maybeSingle(),
      ])
    : Array.from({ length: 8 }, () => ({ data: null }));

  const isApproved = Boolean(profile?.is_approved);
  const profileComplete = Boolean(
    profile?.display_name &&
      (profile.region || profile.bio || profile.avatar_url || profile.zrl_category),
  );
  const locked = !user ? "Na je account" : !isApproved ? "Na goedkeuring" : undefined;

  const steps: Step[] = [
    {
      title: "Account aanmaken",
      text: "Registreer en tik op de link in de bevestigingsmail. Geen mail? Kijk in je spam.",
      action: "Registreren",
      href: "/login?mode=register",
      tone: "meer",
      video: "account-aanmaken",
      done: Boolean(user),
    },
    {
      title: "Goedkeuring",
      text: "Een beheerder keurt je account goed. Meestal is dat snel geregeld.",
      action: "Bekijk status",
      href: "/wachten",
      tone: "meer",
      done: isApproved,
      lockedLabel: user ? undefined : "Na je account",
    },
    {
      title: "Profiel invullen",
      text: "Foto, regio, een korte bio en je ZRL-categorie.",
      action: "Profiel aanvullen",
      href: "/profiel?weergave=bewerken",
      tone: "club",
      video: "profiel",
      done: profileComplete,
      lockedLabel: locked,
    },
    {
      title: "Je Zwift-ID",
      text: "Voor races, uitslagen en je powerprofiel. Zwift je niet, dan sla je dit over.",
      action: "Zwift-ID invullen",
      href: "/profiel?weergave=bewerken",
      tone: "kalender",
      video: "zwift-id",
      done: Boolean(profile?.zwift_id || profile?.zwift_opt_out),
      lockedLabel: locked,
    },
    {
      title: "Ritten binnenhalen",
      text: "Koppel Strava, of laat je ritten via intervals.icu binnenkomen.",
      action: "Strava koppelen",
      href: "/profiel?weergave=bewerken#strava",
      tone: "zwbeter",
      video: "strava-koppelen",
      done: Boolean(strava || stravaActivity),
      lockedLabel: locked,
    },
    {
      title: "intervals.icu koppelen",
      text: "Voor je schema, workouts op je fietscomputer en je hersteldata.",
      action: "Koppelen",
      href: "/zwbeter-worden/doelen",
      tone: "zwbeter",
      video: "intervals-koppelen",
      done: Boolean(intervals),
      lockedLabel: locked,
    },
    {
      title: "Je fietsen",
      text: "Laat zien waarop je rijdt en houd de slijtage bij.",
      action: strava ? "Mijn garage" : "Fiets toevoegen",
      href: strava ? "/mijn-garage" : "/profiel?weergave=bewerken#fietsen",
      tone: "meer",
      video: "mijn-garage",
      done: Boolean(bike),
      lockedLabel: locked,
    },
    {
      title: "Meldingen aanzetten",
      text: "Een seintje bij events, live ritten en badges.",
      action: "Aanzetten",
      href: "/profiel?weergave=bewerken#meldingen",
      tone: "meer",
      video: "meldingen",
      done: Boolean(pushSubscription),
      lockedLabel: locked,
    },
    {
      title: "Live met Garmin of Wahoo",
      text: "Bij een buitenrit sta je dan vanzelf op de kaart.",
      action: "Koppelen",
      href: "/live",
      tone: "club",
      video: "live-gps",
      done: Boolean(trackerToken),
      lockedLabel: locked,
    },
    {
      title: "Rij mee",
      text: "Kies een rit in de kalender en meld je aan.",
      action: "Naar de kalender",
      href: "/kalender",
      tone: "kalender",
      video: "aanmelden-event",
      done: Boolean(rsvp),
      lockedLabel: locked,
    },
  ];

  const nextIndex = steps.findIndex((step) => !step.done && !step.lockedLabel);
  const status = (step: Step, index: number): StepStatus =>
    step.done ? "done" : step.lockedLabel ? "locked" : index === nextIndex ? "next" : "open";

  const ordered = steps
    .map((step, index) => ({ step, index }))
    .sort((a, b) => Number(b.index === nextIndex) - Number(a.index === nextIndex));

  const doneCount = steps.filter((step) => step.done).length;
  const allDone = doneCount === steps.length;
  const firstName = (profile?.display_name ?? "").trim().split(/\s+/)[0];

  return (
    <div
      data-design="tegels"
      className={`app-shell flex min-h-dvh flex-col bg-background ${tegelsFontVariables}`}
    >
      <header className="relative">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 pt-3">
          <Link
            href={isApproved ? "/dashboard" : "/"}
            className="tg-logo flex shrink-0 items-center"
            aria-label={clubCommunity(clubTexts)}
          >
            <ClubLogo />
          </Link>
          <Link
            href={!user ? "/login" : isApproved ? "/dashboard" : "/wachten"}
            className={cn(buttonVariants({ variant: "outline" }), "min-h-11 px-4 text-base")}
          >
            {!user ? "Inloggen" : isApproved ? "Naar dashboard" : "Status"}
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-7 px-4 pb-10 pt-5">
        <header className="space-y-3">
          <h1 className="tg-display">{firstName ? `Welkom, ${firstName}` : `Welkom bij ${clubTexts.shortName}`}</h1>
          <div className="max-w-md">
            <p className="text-sm tabular-nums text-muted-foreground">
              {allDone ? "Alles staat klaar." : `${doneCount} van ${steps.length} stappen klaar`}
            </p>
            <div
              className="mt-2 h-1 bg-[var(--tg-panel)]"
              role="progressbar"
              aria-label="Voortgang"
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={doneCount}
            >
              <div
                className="h-full bg-primary"
                style={{ width: `${(doneCount / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </header>

        {/* De eerstvolgende stap staat vooraan en breed, de rest op volgorde
            erachter: zo valt er nooit een gat naast de brede tegel. */}
        <ol aria-label="Stappen" className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {ordered.map(({ step, index }) => (
            <StepTile key={step.title} step={step} number={index + 1} status={status(step, index)} />
          ))}
          {allDone && (
            <li className="col-span-2">
              <Link href="/dashboard" className="tg-tile tg-vandaag h-full">
                <span className="tg-tile-small">Klaar</span>
                <span className="mt-0.5 text-[2rem] font-light leading-[1.05] tracking-tight">
                  Naar dashboard
                </span>
              </Link>
            </li>
          )}
        </ol>

        <section className="space-y-2.5">
          <h2 className="text-[1.625rem] font-light leading-[1.1] tracking-tight">Ook handig</h2>
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <VideoTile id="wegwijs" />
            <VideoTile id="app-op-beginscherm" />
            {isApproved && (
              <>
                <li>
                  <Link href="/hulp/beginnen#videos" className="tg-tile tg-meer h-full">
                    <span className="tg-tile-small">Hulp</span>
                    <span className="tg-tile-title">Alle video&apos;s</span>
                  </Link>
                </li>
                <li>
                  <Link href="/hulp" className="tg-tile tg-meer h-full">
                    <span className="tg-tile-small">Hulp</span>
                    <span className="tg-tile-title">Per onderwerp</span>
                  </Link>
                </li>
              </>
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
