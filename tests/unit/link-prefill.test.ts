import { describe, expect, it } from "vitest";
import {
  cleanDescription,
  guessEventType,
  parseEventDate,
  parseMyWhooshEventUrl,
  prefillFromHtml,
  prefillFromMyWhoosh,
  prefillFromZwift,
} from "@/lib/events/link-prefill";
import { mapZwiftEvent } from "@/lib/events/zwift-route";

const PAGE = "https://www.wtcvoorbeeld.nl/toertocht-2027";

describe("prefillFromHtml", () => {
  it("leest een schema.org-Event uit JSON-LD, ook binnen @graph", () => {
    const html = `<html><head>
      <title>Voorjaarstoertocht | WTC Voorbeeld</title>
      <meta property="og:image" content="/img/og.jpg">
      <script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebSite", name: "WTC Voorbeeld" },
          {
            "@type": "SportsEvent",
            name: "Voorjaarstoertocht 2027",
            description: "<p>Routes van 60, 110 en 160&nbsp;km.</p><p>Start bij het clubhuis.</p>",
            startDate: "2027-03-21T08:00:00+01:00",
            endDate: "2027-03-21T16:00",
            image: [{ "@type": "ImageObject", url: "https://cdn.example.com/banner.jpg" }],
            location: {
              "@type": "Place",
              name: "Clubhuis De Spaak",
              address: { streetAddress: "Dorpsstraat 1", addressLocality: "Goirle" },
            },
          },
        ],
      })}</script>
    </head><body></body></html>`;

    const prefill = prefillFromHtml(html, PAGE);
    expect(prefill.title).toBe("Voorjaarstoertocht 2027");
    expect(prefill.description).toBe("Routes van 60, 110 en 160 km.\n\nStart bij het clubhuis.");
    expect(prefill.start_at).toBe("2027-03-21T07:00:00.000Z");
    // Zonder tijdzone: Nederlandse tijd (maart = wintertijd, UTC+1).
    expect(prefill.end_at).toBe("2027-03-21T15:00:00.000Z");
    expect(prefill.location).toBe("Clubhuis De Spaak, Dorpsstraat 1, Goirle");
    expect(prefill.image_url).toBe("https://cdn.example.com/banner.jpg");
    expect(prefill.type).toBe("toertocht");
    expect(prefill.external_url).toBe(PAGE);
  });

  it("valt terug op Open Graph en haalt de sitenaam van de titel", () => {
    const html = `<head>
      <meta property="og:site_name" content="Granfondo Limburg">
      <meta property="og:title" content="Inschrijven 2027 &amp; routes | Granfondo Limburg">
      <meta name="description" content="Drie afstanden door het Heuvelland.">
      <meta property="og:image" content="/media/cover.png">
      <script type="application/ld+json">{ kapot</script>
    </head>`;

    const prefill = prefillFromHtml(html, PAGE);
    expect(prefill.title).toBe("Inschrijven 2027 & routes");
    expect(prefill.description).toBe("Drie afstanden door het Heuvelland.");
    expect(prefill.image_url).toBe("https://www.wtcvoorbeeld.nl/media/cover.png");
    expect(prefill.start_at).toBeNull();
    expect(prefill.type).toBeNull();
  });

  it("geeft een online event geen locatie", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@type": "Event",
      name: "Clubrit",
      startDate: "2027-01-10",
      location: { "@type": "VirtualLocation", url: "https://zwift.com" },
    })}</script>`;
    const prefill = prefillFromHtml(html, PAGE);
    expect(prefill.location).toBeNull();
    // Alleen een datum: middernacht Nederlandse tijd.
    expect(prefill.start_at).toBe("2027-01-09T23:00:00.000Z");
  });
});

describe("parseEventDate", () => {
  it("accepteert Zwift-achtige offsets zonder dubbele punt", () => {
    expect(parseEventDate("2026-10-18T11:00:00.000+0000")).toBe("2026-10-18T11:00:00.000Z");
  });

  it("neemt zomertijd mee voor een tijd zonder zone", () => {
    expect(parseEventDate("2027-06-01T09:30")).toBe("2027-06-01T07:30:00.000Z");
  });

  it("weigert wat geen datum is", () => {
    expect(parseEventDate("zondag 21 maart")).toBeNull();
    expect(parseEventDate(undefined)).toBeNull();
  });
});

describe("cleanDescription", () => {
  it("maakt van MyWhoosh-HTML leesbare tekst", () => {
    expect(cleanDescription("<p>Register&nbsp;for&nbsp;the&nbsp;race.</p><ul><li>Cat 1</li><li>Cat 2</li></ul>"))
      .toBe("Register for the race.\n\n- Cat 1\n\n- Cat 2");
  });

  it("kort een lange omschrijving in op een zinsgrens", () => {
    const long = "Een zin die lang genoeg is. ".repeat(200);
    const cleaned = cleanDescription(long)!;
    expect(cleaned.length).toBeLessThanOrEqual(2001);
    expect(cleaned.endsWith(".…")).toBe(true);
  });
});

describe("guessEventType", () => {
  it("herkent ZRL, FRR en ladders op Zwift", () => {
    expect(guessEventType("zwift", "Zwift Racing League: Round 2 - Open EMEAE", null)).toBe("zrl");
    expect(guessEventType("zwift", "FRR Tour Ignite - Stage 1", null)).toBe("flamme_rouge");
    expect(guessEventType("zwift", "Club Ladder race", null)).toBe("ladder");
    expect(guessEventType("zwift", "ZWB Social Ride", null)).toBe("zwift");
  });

  it("zet de Sunday Race Club apart van MyWhoosh", () => {
    expect(guessEventType("mywhoosh", "Sunday Race Club - Men Qualifier Race 3", null)).toBe("src");
    expect(guessEventType("mywhoosh", "UAE Tour Stage 1", null)).toBe("mywhoosh");
  });

  it("raadt op andere sites alleen bij een duidelijk woord", () => {
    expect(guessEventType("web", "Gran Fondo Nijmegen", null)).toBe("gran_fondo");
    expect(guessEventType("web", "Gravel Challenge Brabant", null)).toBe("gravel_race");
    expect(guessEventType("web", "Ronde van Goirle", "Wedstrijd voor amateurs")).toBeNull();
  });
});

describe("prefillFromMyWhoosh", () => {
  it("zet de detail-API om", () => {
    expect(parseMyWhooshEventUrl("https://event.mywhoosh.com/event/detail/6acb75e3a73fd99ee1062c81"))
      .toBe("6acb75e3a73fd99ee1062c81");

    const prefill = prefillFromMyWhoosh(
      {
        name: "Sunday Race Club - Men Qualifier Race 3",
        starting: 1792316700,
        distance: "49.8 km",
        elevation: "553 m",
        image: null,
        map: "https://service23.mywhoosh.com/event_files/kaart.png",
        details: "<p>Register&nbsp;now.</p>",
      },
      "6acb75e3a73fd99ee1062c81",
    );
    expect(prefill).toMatchObject({
      source: "mywhoosh",
      type: "src",
      start_at: new Date(1792316700 * 1000).toISOString(),
      distance_km: 49.8,
      elevation_m: 553,
      description: "Register now.",
      image_url: "https://service23.mywhoosh.com/event_files/kaart.png",
      external_url: "https://event.mywhoosh.com/event/detail/6acb75e3a73fd99ee1062c81",
    });
  });
});

describe("prefillFromZwift", () => {
  it("neemt titel, omschrijving, banner en duur over", () => {
    const event = mapZwiftEvent({
      id: 5683801,
      name: "ZWB Recovery Workout",
      description: "Rustig aan.\n\nZone 2.",
      imageUrl: "https://cdn.zwift.com/static/events_headers/cycling/workout.png",
      eventStart: "2026-10-20T18:00:00.000+0000",
      durationInSeconds: 3600,
      eventType: "GROUP_WORKOUT",
    })!;
    // Zwifts eigen datumvorm, met +0000 zonder dubbele punt.
    const prefill = prefillFromZwift(event, "2026-10-20T18:00:00.000+0000");
    expect(prefill).toMatchObject({
      source: "zwift",
      title: "ZWB Recovery Workout",
      description: "Rustig aan.\n\nZone 2.",
      image_url: "https://cdn.zwift.com/static/events_headers/cycling/workout.png",
      start_at: "2026-10-20T18:00:00.000Z",
      end_at: "2026-10-20T19:00:00.000Z",
      type: "zwift",
      kind: "training",
      external_url: "https://www.zwift.com/events/view/5683801",
    });
  });
});
