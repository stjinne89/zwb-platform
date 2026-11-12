import { describe, expect, it } from "vitest";
import { parseEventPage, penOf } from "@/lib/zwiftracing/event-page";

// Opbouw zoals de eventpagina van zwiftracing.app hem op 2026-11-12 gaf
// (TanStack Start, ingekort; verzonnen renners en waarden).
const ID = 5550001;
const page = (loader: string, matchId = `\\0events\\0events\\0 ${ID}`) =>
  `<html><body><script>$_TSR.router=($R=>$R[0]={matches:$R[1]=[$R[2]={i:"${matchId}",l:$R[3]=${loader}}]})($R["tsr"]);</script></body></html>`;

const power = `power:$R[20]={wkg15:12.3456,wkg60:7.1,wkg120:6,wkg300:4.95,wkg1200:4.123}`;

const SIGNUPS = page(
  `{eventId:${ID},mode:"signups",resultsFinalized:!1,pens:$R[4]=[` +
    `$R[5]={id:"p1",name:"A",riders:$R[6]=[` +
    `$R[7]={riderId:101,eventRating:1820.46,expectedPosition:1,${power},phenotype:$R[8]={label:"sprinter"}},` +
    // Het rennerdocument een laag dieper, zoals bij een deel van de aanmeldingen.
    `$R[9]={riderId:"102",eventRating:1700,expectedPosition:2,points:$R[10]={$__parent:$R[11]={${power},phenotype:$R[12]={label:"climber"}}}},` +
    `$R[13]={name:"geen id"}]},` +
    `$R[14]={id:"p2",name:"B",riders:$R[15]=[$R[16]={riderId:201,eventRating:1400,expectedPosition:1}]}]}`,
);

describe("parseEventPage", () => {
  it("leest per pen de aanmeldingen met rating, verwachte plek, vermogen en type", () => {
    const event = parseEventPage(SIGNUPS, ID)!;
    expect(event.mode).toBe("signups");
    expect(event.finalized).toBe(false);
    expect(event.pens.map((p) => [p.label, p.riders.length])).toEqual([
      ["A", 2],
      ["B", 1],
    ]);
    expect(event.pens[0].riders[0]).toEqual({
      zwiftId: 101,
      eventRating: 1820.5,
      expectedPosition: 1,
      position: null,
      power: { s15: 12.35, m1: 7.1, m2: 6, m5: 4.95, m20: 4.12 },
      phenotype: "sprinter",
    });
    expect(event.pens[0].riders[1]).toMatchObject({ zwiftId: 102, phenotype: "climber", power: { m5: 4.95 } });
  });

  it("leest na de race alleen de plekken, niet de rating (andere schaal)", () => {
    const html = page(
      `{eventId:${ID},mode:"results",resultsFinalized:!0,pens:$R[4]=[$R[5]={id:"p1",name:"A",riders:$R[6]=[` +
        `$R[7]={riderId:101,eventRating:2280,expectedPosition:2,position:1},` +
        `$R[8]={riderId:102,eventRating:2300,expectedPosition:1,position:null}]}]}`,
    );
    const event = parseEventPage(html, ID)!;
    expect(event.finalized).toBe(true);
    expect(event.pens[0].riders.map((r) => [r.eventRating, r.expectedPosition, r.position])).toEqual([
      [null, 2, 1],
      [null, 1, null],
    ]);
    // Na de race telt de pen alleen wie finishte.
    expect(penOf(event, 101)?.size).toBe(1);
  });

  it("geeft null op de pagina van een ander event of een andere opbouw", () => {
    expect(parseEventPage(SIGNUPS, 5550002)).toBeNull();
    expect(parseEventPage(page(`{eventId:5550002,mode:"signups",pens:[]}`, `events ${ID}`), ID)).toBeNull();
    expect(parseEventPage("<html></html>", ID)).toBeNull();
  });

  it("noemt een pen zonder bruikbare naam niet", () => {
    const event = parseEventPage(page(`{eventId:${ID},mode:"signups",pens:[{id:7,name:"",riders:[]}]}`), ID)!;
    expect(event.pens).toEqual([{ id: "7", label: null, riders: [] }]);
  });
});

describe("penOf", () => {
  it("geeft de pen en het aantal aanmeldingen van een renner, of null", () => {
    const event = parseEventPage(SIGNUPS, ID)!;
    expect(penOf(event, 201)).toMatchObject({ pen: { label: "B" }, size: 1 });
    expect(penOf(event, 102)?.size).toBe(2);
    expect(penOf(event, 999)).toBeNull();
  });
});
