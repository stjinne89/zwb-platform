// Waarden en labels zonder verdere imports, zodat client components ze kunnen
// gebruiken zonder de trainingsbibliotheek mee te trekken.

export const DIET_TAGS = ["vegetarisch", "vegan", "glutenvrij", "lactosevrij"] as const;
export type DietTag = (typeof DIET_TAGS)[number];

export const DIET_TAG_LABELS: Record<DietTag, string> = {
  vegetarisch: "Vegetarisch",
  vegan: "Vegan",
  glutenvrij: "Glutenvrij",
  lactosevrij: "Lactosevrij",
};

export const FUEL_PROFILES = ["hoog_kh", "gemengd", "eiwitrijk"] as const;
export type FuelProfile = (typeof FUEL_PROFILES)[number];

export const FUEL_PROFILE_LABELS: Record<FuelProfile, string> = {
  hoog_kh: "Koolhydraatrijk",
  gemengd: "Gemengd",
  eiwitrijk: "Eiwitrijk",
};
