import { afterEach, describe, expect, it, vi } from "vitest";
import { claudeSchema, isClaudeJobId, todayLine } from "@/lib/ai/claude";
import { aiConfigured, aiProvider, claudeSettings, trainingKind } from "@/lib/ai/settings";
import { planSchema } from "@/lib/training/ai";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("aiProvider", () => {
  it("is OpenAI tot AI_PROVIDER op anthropic staat", () => {
    vi.stubEnv("AI_PROVIDER", "");
    expect(aiProvider()).toBe("openai");
    vi.stubEnv("AI_PROVIDER", " Anthropic ");
    expect(aiProvider()).toBe("anthropic");
  });

  it("kijkt naar de sleutel van de gekozen aanbieder", () => {
    vi.stubEnv("AI_PROVIDER", "anthropic");
    vi.stubEnv("OPENAI_API_KEY", "x");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(aiConfigured()).toBe(false);
    vi.stubEnv("ANTHROPIC_API_KEY", "y");
    expect(aiConfigured()).toBe(true);
  });
});

describe("claudeSettings", () => {
  it("geeft Opus 5.5 met bijwerkingen op low", () => {
    vi.stubEnv("ANTHROPIC_MODEL", "");
    vi.stubEnv("ANTHROPIC_MODEL_PLAN_UPDATE", "");
    vi.stubEnv("ANTHROPIC_EFFORT_PLAN_UPDATE", "");
    expect(claudeSettings("plan_update")).toEqual({ model: "claude-opus-5-5", effort: "low" });
    expect(claudeSettings("nieuw_schema")).toEqual({ model: "claude-opus-5-5", effort: "medium" });
  });

  it("laat model en effort per soort overschrijven", () => {
    vi.stubEnv("ANTHROPIC_MODEL", "claude-opus-5-5");
    vi.stubEnv("ANTHROPIC_MODEL_PLAN_UPDATE", "claude-sonnet-5-5");
    vi.stubEnv("ANTHROPIC_EFFORT_PLAN_UPDATE", "medium");
    expect(claudeSettings("plan_update")).toEqual({ model: "claude-sonnet-5-5", effort: "medium" });
    expect(claudeSettings("daily").model).toBe("claude-opus-5-5");
  });

  it("negeert een onbekende effort", () => {
    vi.stubEnv("ANTHROPIC_EFFORT_COACH", "max");
    expect(claudeSettings("coach").effort).toBe("low");
  });
});

describe("trainingKind", () => {
  it("leidt de soort af uit adaptation_kind", () => {
    expect(trainingKind(null)).toBe("nieuw_schema");
    expect(trainingKind("daily")).toBe("daily");
    expect(trainingKind("day")).toBe("day");
    expect(trainingKind("bijwerking")).toBe("plan_update");
  });
});

describe("isClaudeJobId", () => {
  it("herkent een Claude-opdracht aan het voorvoegsel", () => {
    expect(isClaudeJobId("aij_6f1d2c3a-0000-4000-8000-000000000000")).toBe(true);
    expect(isClaudeJobId("resp_abc")).toBe(false);
    expect(isClaudeJobId(null)).toBe(false);
  });
});

describe("todayLine", () => {
  it("noemt weekdag en datum in Nederlandse tijd", () => {
    // 23:30 UTC op 1 november is in Nederland al 2 november.
    expect(todayLine(new Date("2026-11-01T23:30:00Z"))).toBe("Vandaag is maandag 2026-11-02.");
  });
});

describe("claudeSchema", () => {
  it("haalt grenzen weg die Claude niet kent en laat minItems tot 1 staan", () => {
    const schema = claudeSchema(planSchema(3)) as {
      properties: { workouts: Record<string, unknown> };
    };
    expect(schema.properties.workouts.minItems).toBeUndefined();
    expect(schema.properties.workouts.maxItems).toBeUndefined();
    const one = claudeSchema(planSchema(1)) as { properties: { workouts: Record<string, unknown> } };
    expect(one.properties.workouts.minItems).toBe(1);
  });

  it("laat de rest van het schema ongemoeid", () => {
    const input = { type: "object", properties: { n: { type: "number", minimum: 0, maximum: 9 }, s: { type: "string", enum: ["a"] } } };
    expect(claudeSchema(input)).toEqual({ type: "object", properties: { n: { type: "number" }, s: { type: "string", enum: ["a"] } } });
  });
});
