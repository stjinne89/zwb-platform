// Gram naar schepjes, voor poeder dat je met de schep van de verpakking
// afmeet. Hoeveel gram één schep is, vult het lid in bij het recept (0305).

const HALF = "½";

/** "½ schep", "1 schep", "1½ schep", "2 scheppen"; null zonder schepmaat. */
export function scoopsLabel(grams: number, scoopG: number | null | undefined): string | null {
  if (!scoopG || scoopG <= 0 || grams <= 0) return null;
  const halves = Math.max(1, Math.round((grams / scoopG) * 2));
  const whole = Math.floor(halves / 2);
  const text = `${whole > 0 ? whole : ""}${halves % 2 ? HALF : ""}`;
  return `${text} ${halves > 3 ? "scheppen" : "schep"}`;
}
