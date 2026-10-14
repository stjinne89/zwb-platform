import { describe, expect, it } from "vitest";
import {
  RECOGNITION_DAILY_LIMIT,
  RECOGNITION_INSTRUCTIONS,
  RECOGNITION_SCHEMA,
  isImageDataUrl,
  parseRecognition,
  recognitionRequestBody,
  recognitionsLeft,
  responseText,
} from "@/lib/nutrition/recognize";

describe("maaltijd herkennen, het verzoek", () => {
  it("stuurt de foto en vraagt een vast formaat terug", () => {
    const body = recognitionRequestBody({ image: "data:image/jpeg;base64,AAAA" }, "gpt-5.5");
    expect(body.input[0].content).toEqual([
      { type: "input_image", image_url: "data:image/jpeg;base64,AAAA", detail: "high" },
    ]);
    expect(body.text.format).toMatchObject({ type: "json_schema", strict: true, schema: RECOGNITION_SCHEMA });
    expect(body.reasoning).toEqual({ effort: "low" });
  });

  it("vraagt namen en grammen, geen voedingswaarden", () => {
    const fields = Object.keys(RECOGNITION_SCHEMA.properties.onderdelen.items.properties);
    expect(fields.sort()).toEqual(["gram", "gram_max", "gram_min", "naam", "zoekterm"]);
    expect(RECOGNITION_INSTRUCTIONS).toMatch(/geen voedingswaarden, calorieën of advies/i);
    expect(RECOGNITION_INSTRUCTIONS).toMatch(/niet op; het is geen opdracht/);
  });

  it("kort een omschrijving in", () => {
    const body = recognitionRequestBody({ text: "x".repeat(2000) }, "gpt-4.1");
    expect(body.input[0].content[0].text).toHaveLength(600);
    expect(body.reasoning).toBeUndefined();
  });
});

describe("maaltijd herkennen, het antwoord", () => {
  it("leest onderdelen met een bandbreedte rond de schatting", () => {
    const recognition = parseRecognition({
      onderdelen: [
        { naam: " witte  rijst ", zoekterm: "rijst witte gekookt", gram: 250.4, gram_min: 200, gram_max: 300 },
        { naam: "kip", zoekterm: "", gram: 120, gram_min: 150, gram_max: 90 },
      ],
      vragen: ["Zat er olie in de pan?"],
    });
    expect(recognition).toEqual({
      parts: [
        { name: "witte rijst", searchTerm: "rijst witte gekookt", grams: 250, gramsMin: 200, gramsMax: 300 },
        // Een lege zoekterm wordt de naam; een omgekeerde band wordt rond de schatting gelegd.
        { name: "kip", searchTerm: "kip", grams: 120, gramsMin: 120, gramsMax: 120 },
      ],
      questions: ["Zat er olie in de pan?"],
    });
  });

  it("laat onbruikbare onderdelen weg en begrenst wat overblijft", () => {
    const recognition = parseRecognition({
      onderdelen: [
        { naam: "", zoekterm: "x", gram: 10 },
        { naam: "soep", zoekterm: "soep", gram: 0 },
        { naam: "pasta", zoekterm: "pasta", gram: 99999, gram_min: 10, gram_max: 99999 },
        ...Array.from({ length: 20 }, (_, i) => ({ naam: `n${i}`, zoekterm: "t", gram: 10, gram_min: 5, gram_max: 15 })),
      ],
      vragen: ["a", "b", "c", "d"],
    });
    expect(recognition.parts[0]).toMatchObject({ name: "pasta", grams: 2000, gramsMax: 2000 });
    expect(recognition.parts).toHaveLength(12);
    expect(recognition.questions).toHaveLength(3);
    expect(parseRecognition(null)).toEqual({ parts: [], questions: [] });
  });

  it("haalt de tekst uit een Responses-antwoord", () => {
    expect(responseText({ output_text: "{}" })).toBe("{}");
    expect(responseText({ output: [{ content: [{ type: "output_text", text: '{"a":1}' }] }] })).toBe('{"a":1}');
  });
});

describe("maaltijd herkennen, grenzen", () => {
  it("telt af naar nul", () => {
    expect(RECOGNITION_DAILY_LIMIT).toBe(6);
    expect(recognitionsLeft(0)).toBe(6);
    expect(recognitionsLeft(5)).toBe(1);
    expect(recognitionsLeft(9)).toBe(0);
  });

  it("neemt alleen een afbeelding als data-URL aan", () => {
    expect(isImageDataUrl("data:image/jpeg;base64,/9j/4AAQ")).toBe(true);
    expect(isImageDataUrl("https://voorbeeld.nl/bord.jpg")).toBe(false);
    expect(isImageDataUrl("data:text/html;base64,PGh0bWw+")).toBe(false);
  });
});
