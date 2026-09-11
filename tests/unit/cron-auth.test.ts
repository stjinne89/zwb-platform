import { describe, expect, it } from "vitest";
import { checkCronSecret } from "@/lib/cron/auth";

function req(authorization?: string) {
  return new Request("https://example.test/api/cron", {
    headers: authorization ? { authorization } : {},
  });
}

const ENV = "TEST_CRON_SECRET";

function withSecret<T>(value: string | undefined, fn: () => T): T {
  const previous = process.env[ENV];
  if (value === undefined) delete process.env[ENV];
  else process.env[ENV] = value;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env[ENV];
    else process.env[ENV] = previous;
  }
}

describe("checkCronSecret", () => {
  it("laat een kloppend secret door", () => {
    withSecret("geheim", () => {
      expect(checkCronSecret(req("Bearer geheim"), ENV)).toEqual({ ok: true });
    });
  });

  it("onderscheidt een ontbrekende serverwaarde van een verkeerde header", () => {
    // Dit is de hele reden dat deze helper bestaat: één 403 voor beide gevallen
    // kost bij het inrichten van een cron zomaar een uur zoeken.
    const notConfigured = withSecret(undefined, () =>
      checkCronSecret(req("Bearer wat dan ook"), ENV),
    );
    expect(notConfigured.ok).toBe(false);
    expect(notConfigured.ok === false && notConfigured.reason).toBe("not_configured");

    const mismatch = withSecret("geheim", () => checkCronSecret(req("Bearer fout"), ENV));
    expect(mismatch.ok).toBe(false);
    expect(mismatch.ok === false && mismatch.reason).toBe("mismatch");
  });

  it("noemt de variabelenaam als hij niet gezet is", () => {
    const result = withSecret(undefined, () => checkCronSecret(req("Bearer x"), ENV));
    expect(result.ok === false && result.message).toContain(ENV);
  });

  it("verklapt niets over de waarde bij een verkeerd secret", () => {
    const result = withSecret("geheim", () => checkCronSecret(req("Bearer fout"), ENV));
    expect(result.ok === false && result.message).not.toContain("geheim");
  });

  it("overleeft een newline of spatie uit het plakwerk", () => {
    // Netlify en cron-diensten slepen bij kopiëren zomaar witruimte mee; een
    // exacte vergelijking faalde daarop met een 403 die nergens naar wees.
    withSecret("geheim\n", () => {
      expect(checkCronSecret(req("Bearer geheim"), ENV).ok).toBe(true);
    });
    withSecret("geheim", () => {
      expect(checkCronSecret(req("Bearer geheim "), ENV).ok).toBe(true);
    });
  });

  it("accepteert Bearer ongeacht hoofdletters, en weigert een lege header", () => {
    withSecret("geheim", () => {
      expect(checkCronSecret(req("bearer geheim"), ENV).ok).toBe(true);
      expect(checkCronSecret(req(), ENV).ok).toBe(false);
      expect(checkCronSecret(req("Bearer "), ENV).ok).toBe(false);
    });
  });
});
