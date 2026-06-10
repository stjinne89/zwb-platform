"use client";

import { useEffect, useMemo, useState } from "react";

type ScheduleRow = {
  id: string;
  moment: string;
  idea: string;
  open: string;
};

type RouteCard = {
  id: string;
  title: string;
  description: string;
  distance: string;
  elevation: string;
  level: string;
  stravaUrl: string;
};

const initialSchedule: ScheduleRow[] = [
  {
    id: "friday-morning",
    moment: "Vrijdag ochtend",
    idea: "Optionele reisvoorbereiding, carpool verzamelen, laatste materiaalcheck",
    open: "vertrekpunten / carpool",
  },
  {
    id: "friday-afternoon",
    moment: "Vrijdag middag",
    idea: "Aankomst, inchecken, fietsen klaarzetten",
    open: "tijd / huisjes",
  },
  {
    id: "friday-evening",
    moment: "Vrijdag avond",
    idea: "Welkom, gezamenlijke maaltijd, weekenddoelen",
    open: "locatie / eten",
  },
  {
    id: "saturday-morning",
    moment: "Zaterdag ochtend",
    idea: "Duur-/klimtraining in niveaugroepen",
    open: "routes / captains",
  },
  {
    id: "saturday-afternoon",
    moment: "Zaterdag middag",
    idea: "Techniek: materiaal, houding, indoor/outdoor setup",
    open: "workshopgever",
  },
  {
    id: "saturday-evening",
    moment: "Zaterdag avond",
    idea: "Diner, sponsorblok, quiz of ZWB-verhalen",
    open: "sponsoractivatie / locatie",
  },
  {
    id: "sunday-morning",
    moment: "Zondag ochtend",
    idea: "ZRL-racecraft: positionering, lead-outs, TTT, communicatie",
    open: "teams / formats",
  },
  {
    id: "sunday-afternoon",
    moment: "Zondag middag",
    idea: "Trainingsleer: belasting, herstel, taper richting het ZRL-seizoen",
    open: "sessie-eigenaar",
  },
  {
    id: "sunday-evening",
    moment: "Zondag avond",
    idea: "Vrij programma, Saarburg, gezamenlijke borrel of afsluitend diner",
    open: "optioneel programma",
  },
  {
    id: "monday-morning",
    moment: "Maandag ochtend",
    idea: "Optionele herstelrit, koffie, vertrek",
    open: "check-out",
  },
];

const initialRoutes: RouteCard[] = [
  {
    id: "saar",
    title: "Duur langs de Saar",
    description: "Rustiger blok voor gemengde groep. Voeg later de echte Strava-route toe.",
    distance: "",
    elevation: "",
    level: "",
    stravaUrl: "",
  },
  {
    id: "climb",
    title: "Klim-/tempo blok",
    description: "Heuvelachtig, groepen op niveau, goed voor racevoorbereiding en communicatie.",
    distance: "",
    elevation: "",
    level: "",
    stravaUrl: "",
  },
  {
    id: "recovery",
    title: "Herstelrit + koffie",
    description: "Korte lus, benen los, partners kunnen aansluiten bij koffie of Saarburg-moment.",
    distance: "",
    elevation: "",
    level: "",
    stravaUrl: "",
  },
];

const sponsorLogos = [
  { src: "/brochure/assets/sponsor-hage.png", alt: "Hage Rubbers" },
  { src: "/brochure/assets/sponsor-rsc.png", alt: "RSC Corp Recruiters" },
  { src: "/brochure/assets/sponsor-spotr.png", alt: "SPOTR" },
  { src: "/brochure/assets/sponsor-jeka.jpg", alt: "JeKa Technisch Projectmanagement" },
  { src: "/brochure/assets/sponsor-kalas.jpg", alt: "Kalas" },
  { src: "/brochure/assets/sponsor-kpdesign.png", alt: "KP Design" },
  { src: "/brochure/assets/zwb-community.png", alt: "ZWB Cycling Community" },
];

function stravaRouteId(url: string) {
  return url.match(/strava\.com\/routes\/(\d+)/i)?.[1] ?? "";
}

function textInputClass(extra = "") {
  return `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#9fc77a] focus:ring-2 focus:ring-[#9fc77a]/40 ${extra}`;
}

export function BrochureExperience() {
  const [title, setTitle] = useState("ZWB Trainingsweekend Warsberg");
  const [lead, setLead] = useState(
    "Een lang weekend waarin buiten trainen, Zwift-racecraft, technische kennis, voedingsleer, trainingsleer en gezelligheid samenkomen.",
  );
  const [details, setDetails] = useState({
    date: "",
    riders: "",
    partners: "",
    contact: "",
    notes: "",
  });
  const [schedule, setSchedule] = useState<ScheduleRow[]>(initialSchedule);
  const [routes, setRoutes] = useState<RouteCard[]>(initialRoutes);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("zwb-brochure-state");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        title?: string;
        lead?: string;
        details?: typeof details;
        schedule?: ScheduleRow[];
        routes?: RouteCard[];
      };
      if (parsed.title) setTitle(parsed.title);
      if (parsed.lead) setLead(parsed.lead);
      if (parsed.details) setDetails(parsed.details);
      if (parsed.schedule?.length) setSchedule(parsed.schedule);
      if (parsed.routes?.length) setRoutes(parsed.routes);
    } catch {
      // Ignore invalid local state; the page remains usable with defaults.
    }
  }, []);

  const routeEmbeds = useMemo(
    () =>
      Object.fromEntries(
        routes.map((route) => [route.id, stravaRouteId(route.stravaUrl)]),
      ) as Record<string, string>,
    [routes],
  );

  function save() {
    window.localStorage.setItem(
      "zwb-brochure-state",
      JSON.stringify({ title, lead, details, schedule, routes }),
    );
    setSavedMessage("Opgeslagen in deze browser.");
    window.setTimeout(() => setSavedMessage(""), 2500);
  }

  function reset() {
    if (!window.confirm("Alle lokaal opgeslagen brochure-invoer wissen?")) return;
    window.localStorage.removeItem("zwb-brochure-state");
    setTitle("ZWB Trainingsweekend Warsberg");
    setLead(
      "Een lang weekend waarin buiten trainen, Zwift-racecraft, technische kennis, voedingsleer, trainingsleer en gezelligheid samenkomen.",
    );
    setDetails({ date: "", riders: "", partners: "", contact: "", notes: "" });
    setSchedule(initialSchedule);
    setRoutes(initialRoutes);
  }

  function addScheduleRow() {
    setSchedule((rows) => [
      ...rows,
      {
        id: `row-${Date.now()}`,
        moment: "Nieuw moment",
        idea: "Voorlopig idee invullen",
        open: "nog in te vullen",
      },
    ]);
  }

  function addRoute() {
    setRoutes((cards) => [
      ...cards,
      {
        id: `route-${Date.now()}`,
        title: "Nieuwe route",
        description: "Omschrijving invullen.",
        distance: "",
        elevation: "",
        level: "",
        stravaUrl: "",
      },
    ]);
  }

  return (
    <main className="min-h-screen bg-[#dce5e8] text-[#142126]">
      <div className="sticky top-0 z-50 border-b border-slate-200/80 bg-[#f6f8f7]/92 px-4 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <img
            src="/brochure/assets/zwb-logo.png"
            alt="ZWB Cycling"
            className="h-9 w-auto"
          />
          <div className="flex flex-wrap gap-2">
            <button className="rounded-full bg-[#1d4652] px-4 py-2 text-sm font-bold text-white" onClick={save}>
              Opslaan in browser
            </button>
            <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#1d4652]" onClick={addScheduleRow}>
              Tijdschema-rij toevoegen
            </button>
            <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#1d4652]" onClick={addRoute}>
              Routekaart toevoegen
            </button>
            <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#1d4652]" onClick={() => window.print()}>
              Print / PDF
            </button>
            <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#1d4652]" onClick={reset}>
              Reset invoer
            </button>
          </div>
        </div>
        {savedMessage ? (
          <p className="mx-auto mt-1 max-w-7xl text-xs font-semibold text-[#1d4652]">
            {savedMessage}
          </p>
        ) : null}
      </div>

      <div className="mx-auto max-w-7xl bg-[#f6f8f7]">
        <section
          className="relative min-h-[680px] overflow-hidden px-6 py-16 sm:px-12 lg:px-20"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(246,248,247,.98) 0%, rgba(246,248,247,.84) 36%, rgba(246,248,247,.12) 70%), url('/brochure/assets/landal-warsberg-hero.jpg')",
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          <img
            src="/brochure/assets/zwb-logo.png"
            alt="ZWB Cycling"
            className="mb-14 h-auto w-44"
          />
          <div className="inline-flex items-center gap-2 rounded-full bg-[#e6f1ed] px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#1d4652]">
            <span className="h-2 w-2 rounded-full bg-[#9fc77a]" />
            Klaar voor het ZRL-seizoen
          </div>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-6 block w-full max-w-3xl bg-transparent text-5xl font-black leading-[1.02] tracking-[-0.04em] outline-none sm:text-6xl lg:text-7xl"
            aria-label="Brochuretitel"
          />
          <textarea
            value={lead}
            onChange={(event) => setLead(event.target.value)}
            className="mt-6 block min-h-28 w-full max-w-2xl resize-none bg-transparent text-xl leading-relaxed text-[#27424a] outline-none"
            aria-label="Introductietekst"
          />
          <div className="mt-5 flex flex-wrap gap-3">
            {["Eind september", "Landal Warsberg", "Saarburg", "Leden + partners"].map(
              (chip) => (
                <span key={chip} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-[#1d4652] shadow-sm">
                  {chip}
                </span>
              ),
            )}
          </div>
        </section>

        <section className="border-t border-slate-200 px-6 py-14 sm:px-12 lg:px-20">
          <div className="mb-8">
            <h2 className="text-4xl font-black tracking-[-0.03em] sm:text-5xl">
              Eigen invulling
            </h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
            <div className="grid gap-3 md:grid-cols-4">
              <label className="text-sm font-bold text-slate-600">
                Definitieve datum
                <input className={textInputClass("mt-2")} value={details.date} onChange={(event) => setDetails({ ...details, date: event.target.value })} placeholder="bijv. vrij 25 t/m ma 28 september" />
              </label>
              <label className="text-sm font-bold text-slate-600">
                Aantal renners
                <input className={textInputClass("mt-2")} value={details.riders} onChange={(event) => setDetails({ ...details, riders: event.target.value })} placeholder="bijv. 24" />
              </label>
              <label className="text-sm font-bold text-slate-600">
                Aantal partners
                <input className={textInputClass("mt-2")} value={details.partners} onChange={(event) => setDetails({ ...details, partners: event.target.value })} placeholder="bijv. 8" />
              </label>
              <label className="text-sm font-bold text-slate-600">
                Contactpersoon
                <input className={textInputClass("mt-2")} value={details.contact} onChange={(event) => setDetails({ ...details, contact: event.target.value })} placeholder="naam + mail/telefoon" />
              </label>
            </div>
            <label className="mt-4 block text-sm font-bold text-slate-600">
              Vrije toelichting / jouw input
              <textarea className={textInputClass("mt-2 min-h-28 resize-y")} value={details.notes} onChange={(event) => setDetails({ ...details, notes: event.target.value })} placeholder="Aandachtspunten, wensen, planning, sponsorbijdrage, routes..." />
            </label>
          </div>
        </section>

        <section className="border-t border-slate-200 px-6 py-14 sm:px-12 lg:px-20">
          <div className="mb-8">
            <h2 className="text-4xl font-black tracking-[-0.03em] sm:text-5xl">
              Landal Warsberg
            </h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1.35fr_.8fr]">
            <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
              <img
                src="/brochure/assets/landal-warsberg-hero.jpg"
                alt="Panorama van Landal Warsberg en de omgeving"
                className="h-full min-h-[340px] w-full object-cover"
              />
              <figcaption className="px-5 py-3 text-sm text-slate-600">
                Landal Warsberg: hooggelegen tussen heuvels, bos en de omgeving van Saarburg.
              </figcaption>
            </figure>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
              <img
                src="/brochure/assets/landal-warsberg-bungalow.jpg"
                alt="Bungalowbeeld Landal Warsberg"
                className="mb-5 aspect-[4/3] w-full rounded-xl object-cover"
              />
              <h3 className="text-xl font-black text-[#1d4652]">Locatie-informatie</h3>
              <p className="mt-2 text-slate-700">
                Hoog boven Saarburg, met 4- en 6-persoonsaccommodaties, routes langs Saar/Moezel, stoeltjeslift, rodelbaan en opties voor partners.
              </p>
              <a
                className="mt-4 inline-flex rounded-full bg-[#1d4652] px-4 py-2 text-sm font-bold text-white"
                href="/brochure/assets/landal-warsberg-plattegrond.pdf"
                target="_blank"
              >
                Open parkplattegrond
              </a>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 px-6 py-14 sm:px-12 lg:px-20">
          <div className="mb-8">
            <h2 className="text-4xl font-black tracking-[-0.03em] sm:text-5xl">
              Routes uit Strava
            </h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {routes.map((route, index) => {
              const embedId = routeEmbeds[route.id];
              return (
                <article key={route.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
                  <input
                    className="w-full bg-transparent text-xl font-black text-[#1d4652] outline-none"
                    value={route.title}
                    onChange={(event) =>
                      setRoutes((cards) =>
                        cards.map((card, cardIndex) =>
                          cardIndex === index ? { ...card, title: event.target.value } : card,
                        ),
                      )
                    }
                  />
                  <textarea
                    className="mt-2 min-h-20 w-full resize-y bg-transparent text-sm text-slate-700 outline-none"
                    value={route.description}
                    onChange={(event) =>
                      setRoutes((cards) =>
                        cards.map((card, cardIndex) =>
                          cardIndex === index ? { ...card, description: event.target.value } : card,
                        ),
                      )
                    }
                  />
                  <div className="my-3 grid grid-cols-3 gap-2">
                    {(["distance", "elevation", "level"] as const).map((field) => (
                      <input
                        key={field}
                        className={textInputClass()}
                        value={route[field]}
                        onChange={(event) =>
                          setRoutes((cards) =>
                            cards.map((card, cardIndex) =>
                              cardIndex === index ? { ...card, [field]: event.target.value } : card,
                            ),
                          )
                        }
                        placeholder={field === "distance" ? "afstand" : field === "elevation" ? "hm" : "niveau"}
                      />
                    ))}
                  </div>
                  <input
                    className={textInputClass()}
                    value={route.stravaUrl}
                    onChange={(event) =>
                      setRoutes((cards) =>
                        cards.map((card, cardIndex) =>
                          cardIndex === index ? { ...card, stravaUrl: event.target.value } : card,
                        ),
                      )
                    }
                    placeholder="https://www.strava.com/routes/..."
                  />
                  {embedId ? (
                    <iframe
                      className="mt-4 h-80 w-full rounded-xl border-0 bg-slate-100"
                      title={`Strava route ${route.title}`}
                      src={`https://www.strava.com/routes/${embedId}/embed?style=standard`}
                    />
                  ) : (
                    <div className="mt-4 rounded-xl bg-[#edf4f2] p-4 text-sm text-slate-600">
                      Nog geen publieke Strava-route gekoppeld.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-t border-slate-200 px-6 py-14 sm:px-12 lg:px-20">
          <div className="mb-8">
            <h2 className="text-4xl font-black tracking-[-0.03em] sm:text-5xl">
              Grof tijdschema
            </h2>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#1d4652] text-xs uppercase tracking-[0.08em] text-white">
                <tr>
                  <th className="p-4">Moment</th>
                  <th className="p-4">Voorlopig idee</th>
                  <th className="p-4">Nog in te vullen</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, index) => (
                  <tr key={row.id} className="border-t border-slate-200 odd:bg-white even:bg-[#f7faf9]">
                    {(["moment", "idea", "open"] as const).map((field) => (
                      <td key={field} className="p-2 align-top">
                        <textarea
                          className="min-h-12 w-full resize-y rounded-lg bg-transparent px-2 py-1 outline-none focus:bg-white focus:ring-2 focus:ring-[#9fc77a]/40"
                          value={row[field]}
                          onChange={(event) =>
                            setSchedule((rows) =>
                              rows.map((item, rowIndex) =>
                                rowIndex === index ? { ...item, [field]: event.target.value } : item,
                              ),
                            )
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t border-slate-200 px-6 py-14 sm:px-12 lg:px-20">
          <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
            <h2 className="text-4xl font-black tracking-[-0.03em] sm:text-5xl">
              Kostenindicatie
            </h2>
            <p className="text-slate-600">
              Richtprijs blijft indicatief: definitief afhankelijk van datum, bezetting, beschikbaarheid en sponsorbijdrage.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#1d4652] text-xs uppercase tracking-[0.08em] text-white">
                <tr>
                  <th className="p-4">Post</th>
                  <th className="p-4 text-right">Indicatie p.p.</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Verblijf Landal, inclusief verplichte toeslagen", "EUR 110 - 190"],
                  ["Gezamenlijke maaltijden, ontbijt/lunch/diner", "EUR 85 - 140"],
                  ["Sportvoeding, koffie, snacks, drank", "EUR 15 - 35"],
                  ["Programma, workshopmateriaal, zaal/ruimte", "EUR 0 - 40"],
                  ["Vervoer bij carpoolen", "EUR 40 - 90"],
                  ["Richtprijs totaal", "EUR 270 - 520 p.p."],
                ].map(([item, price]) => (
                  <tr key={item} className="border-t border-slate-200 odd:bg-white even:bg-[#f7faf9]">
                    <td className="p-4 font-medium">{item}</td>
                    <td className="p-4 text-right font-black text-[#1d4652]">{price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t border-slate-200 px-6 py-14 sm:px-12 lg:px-20">
          <div className="mb-8">
            <h2 className="text-4xl font-black tracking-[-0.03em] sm:text-5xl">
              Sponsoren
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sponsorLogos.map((logo) => (
              <div key={logo.src} className="grid min-h-28 place-items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5">
                <img src={logo.src} alt={logo.alt} className="max-h-16 object-contain" />
              </div>
            ))}
            <div className="grid min-h-28 place-items-center rounded-2xl border border-slate-200 bg-white p-4 text-center font-black text-[#1d4652] shadow-lg shadow-slate-900/5">
              Nex Reply
              <span className="block text-sm font-semibold text-slate-500">logo aanleveren</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
