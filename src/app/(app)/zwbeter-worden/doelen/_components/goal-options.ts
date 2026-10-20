// Keuzes in het doelformulier, gedeeld door nieuw doel en bewerken. De eerste
// optie is de standaard.

export const MODE_OPTIONS = [
  ["mixed", "Mix"],
  ["indoor", "Indoor"],
  ["outdoor", "Outdoor"],
] as const;

export const LEVEL_OPTIONS = [
  ["intermediate", "Gemiddeld"],
  ["beginner", "Beginner"],
  ["advanced", "Gevorderd"],
] as const;

export const INTENSITY_OPTIONS = [
  ["balanced", "Gebalanceerd"],
  ["easy", "Voorzichtig"],
  ["hard", "Ambitieus"],
] as const;
