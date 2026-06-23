import Link from "next/link";
import {
  Bell,
  Bike,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MailCheck,
  MapPinned,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/app-ui";
import { buttonVariants } from "@/components/ui/button";
import { ZwbLogo } from "@/components/zwb-logo";
import { cn } from "@/lib/utils";

type StepStatus = "done" | "current" | "upcoming";

type Step = {
  title: string;
  text: string;
  href: string;
  action: string;
  status: StepStatus;
  icon: typeof MailCheck;
};

function statusLabel(status: StepStatus) {
  if (status === "done") return "Klaar";
  if (status === "current") return "Nu doen";
  return "Straks";
}

function StepCard({ step, index }: { step: Step; index: number }) {
  const Icon = step.icon;
  const done = step.status === "done";

  return (
    <li
      className={cn(
        "rounded-lg border bg-card/90 p-4",
        step.status === "current" && "border-primary/50",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold",
            done
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {done ? <CheckCircle2 className="size-4" /> : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{step.title}</h2>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                done
                  ? "bg-primary/10 text-primary"
                  : step.status === "current"
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                    : "bg-secondary text-secondary-foreground",
              )}
            >
              {statusLabel(step.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
        </div>
        <Icon className="mt-1 size-5 shrink-0 text-primary" />
      </div>
      <Link
        href={step.href}
        className={cn(
          buttonVariants({
            variant: step.status === "current" ? "default" : "outline",
            size: "sm",
          }),
          "mt-4",
        )}
      >
        {step.action}
      </Link>
    </li>
  );
}

export default async function WelkomPage() {
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
  ] = user
    ? await Promise.all([
        supabase
          .from("profiles")
          .select(
            "display_name, region, bio, avatar_url, zwift_id, zrl_category, is_approved",
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
          .eq("provider", "owntracks")
          .is("revoked_at", null)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("strava_bikes")
          .select("id")
          .eq("profile_id", user.id)
          .limit(1)
          .maybeSingle(),
      ])
    : [
        { data: null },
        { data: null },
        { data: null },
        { data: null },
        { data: null },
        { data: null },
      ];

  const isApproved = Boolean(profile?.is_approved);
  const profileComplete = Boolean(
    profile?.display_name &&
      (profile.region ||
        profile.bio ||
        profile.avatar_url ||
        profile.zwift_id ||
        profile.zrl_category),
  );
  const canUseIntegrations = Boolean(user && isApproved);

  const steps: Step[] = [
    {
      title: "Account aanmaken",
      text: user
        ? "Je bent ingelogd. De e-mailbevestiging is dus gelukt."
        : "Registreer met je naam, e-mailadres, wachtwoord en akkoord op de privacyverklaring.",
      href: user ? "/dashboard" : "/login?mode=register",
      action: user ? "Naar dashboard" : "Registreren",
      status: user ? "done" : "current",
      icon: UserRound,
    },
    {
      title: "E-mail bevestigen",
      text: "De bevestigingsmail kan vanuit Supabase komen. Check ook ongewenste mail/spam en markeer de afzender als vertrouwd.",
      href: user ? "/dashboard" : "/login",
      action: user ? "Bevestigd" : "Naar inloggen",
      status: user ? "done" : "upcoming",
      icon: MailCheck,
    },
    {
      title: "Goedkeuring door beheerder",
      text: isApproved
        ? "Je account is goedgekeurd en heeft toegang tot het ledenplatform."
        : "Na bevestigen wacht je account op goedkeuring. Tot die tijd zie je de wachtpagina en deze helper.",
      href: isApproved ? "/dashboard" : "/wachten",
      action: isApproved ? "Open platform" : "Bekijk status",
      status: isApproved ? "done" : user ? "current" : "upcoming",
      icon: ShieldCheck,
    },
    {
      title: "Profiel invullen",
      text: "Vul regio, Zwift/ZRL-info, bio, foto en zichtbaarheid in. Dit maakt ledenlijst, teams en profielkaarten duidelijker.",
      href: "/profiel",
      action: profileComplete ? "Profiel bekijken" : "Profiel aanvullen",
      status: profileComplete ? "done" : canUseIntegrations ? "current" : "upcoming",
      icon: UserRound,
    },
    {
      title: "Strava koppelen en syncen",
      text: "Strava voedt clubritten, badges, cols, je fietsen en trainingscontext. Na koppelen kun je op Achievements een sync starten.",
      href: "/profiel#strava",
      action: strava ? "Strava bekijken" : "Strava koppelen",
      status: strava ? "done" : canUseIntegrations ? "current" : "upcoming",
      icon: Bike,
    },
    {
      title: "Je fietsen en onderhoud",
      text: "Na een Strava-sync verschijnen je fietsen. Toon ze op je profiel met een foto, en houd op Onderhoud de slijtage van onderdelen bij.",
      href: "/onderhoud",
      action: bike ? "Onderhoud openen" : "Bekijk Onderhoud",
      status: bike ? "done" : strava ? "current" : "upcoming",
      icon: Wrench,
    },
    {
      title: "intervals.icu koppelen",
      text: "Voor trainingsdashboard, geplande workouts, Wahoo/Garmin-export en optionele hersteldata.",
      href: "/training",
      action: intervals ? "Training openen" : "intervals koppelen",
      status: intervals ? "done" : canUseIntegrations ? "current" : "upcoming",
      icon: Sparkles,
    },
    {
      title: "Meldingen activeren",
      text: "Zet pushmeldingen aan voor events, live ritten, badges, trainingsschema's, onderhoud en bestuurupdates.",
      href: "/profiel#meldingen",
      action: pushSubscription ? "Meldingen bekijken" : "Meldingen instellen",
      status: pushSubscription ? "done" : canUseIntegrations ? "current" : "upcoming",
      icon: Bell,
    },
    {
      title: "Live GPS voorbereiden",
      text: "Maak een OwnTracks-koppellink voor buitenritten. Per rit kies je zelf of je live zichtbaar bent.",
      href: "/live",
      action: trackerToken ? "Live openen" : "OwnTracks koppelen",
      status: trackerToken ? "done" : canUseIntegrations ? "current" : "upcoming",
      icon: MapPinned,
    },
  ];

  const doneCount = steps.filter((step) => step.status === "done").length;
  const firstName = (profile?.display_name ?? user?.email ?? "")
    .trim()
    .split(/\s+/)[0];

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="ZWB Cycling Community">
            <ZwbLogo className="h-12 w-auto text-foreground" />
          </Link>
          <Link
            href={user ? "/dashboard" : "/login"}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {user ? "Dashboard" : "Inloggen"}
          </Link>
        </div>

        <PageHeader
          eyebrow={firstName ? `Welkom ${firstName}` : "Welkom bij ZWB"}
          title="Starthelper voor nieuwe leden"
          description="Van registratie tot goedkeuring, profiel, Strava, training, meldingen en live GPS: dit is de route die je stap voor stap doorloopt."
        />

        <section className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <div className="rounded-lg border bg-card/90 p-5">
            <div className="flex items-start gap-3">
              <MailCheck className="mt-1 size-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-semibold">Over de Supabase-mail</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ja, dat kan kloppen: de bevestigingslink wordt door Supabase
                  Auth verstuurd. Kijk na registratie ook in ongewenste mail of
                  spam. Markeer de mail als vertrouwd, klik op de link en kom
                  daarna terug op deze helper.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card/90 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Voortgang
                </p>
                <p className="text-2xl font-semibold">
                  {doneCount}/{steps.length}
                </p>
              </div>
              <Clock3 className="size-8 text-primary" />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(doneCount / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </section>

        <ol className="grid gap-3 lg:grid-cols-2">
          {steps.map((step, index) => (
            <StepCard key={step.title} step={step} index={index} />
          ))}
        </ol>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-lg border bg-card/90 p-4">
            <h2 className="font-semibold">Wat gebeurt automatisch?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Je profiel wordt bij registratie aangemaakt. Strava-, badge-,
              cols-, fiets-, team- en trainingsdata verschijnen daarna via de
              bestaande syncs zodra je koppelingen actief zijn.
            </p>
          </article>
          <article className="rounded-lg border bg-card/90 p-4">
            <h2 className="font-semibold">Wat kies je zelf?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Profielzichtbaarheid, pushmeldingen, hersteldata delen en live GPS
              zijn expliciete keuzes. Je kunt ze later weer aanpassen.
            </p>
          </article>
          <article className="rounded-lg border bg-card/90 p-4">
            <h2 className="font-semibold">Meer uitleg</h2>
            <Link
              href="/hulp"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Open de ledenhulp
              <ExternalLink className="size-3.5" />
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}
