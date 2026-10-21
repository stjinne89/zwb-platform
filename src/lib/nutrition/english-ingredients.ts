// Engelse ingrediëntnamen (Jamie Oliver, BBC Good Food) naar een zoekterm voor
// NEVO, dat alleen Nederlandse namen kent. Zonder dit vond "coconut milk" een
// milkshake en "tin" gelatine of pastinaak, en de rest niets.
//
// De zoekterm volgt de NEVO-volgorde ("olie olijf" voor "Olie olijf-"); elk
// woord moet in de naam staan. Alleen woorden die geen Nederlands zijn: een
// Nederlandse regel ("1 rode paprika", "100 g bacon") blijft zoals hij was.
// Wat NEVO niet heeft (koriander, tijm), krijgt toch de Nederlandse naam, zodat
// het lid in het formulier op een Nederlands woord zoekt.

const EN_NL: Record<string, string> = {
  // Groente
  onion: "ui",
  "red onion": "ui rode",
  "white onion": "ui",
  "spring onion": "bosui",
  shallot: "sjalot",
  garlic: "knoflook",
  "garlic clove": "knoflook",
  ginger: "gemberwortel",
  chilli: "peper spaanse",
  chili: "peper spaanse",
  "red chilli": "peper spaanse",
  "green chilli": "peper spaanse",
  "chilli flake": "chilipoeder",
  "chilli powder": "chilipoeder",
  tomato: "tomaat",
  "cherry tomato": "tomaat kers",
  "plum tomato": "tomaat blik",
  "chopped tomato": "tomaat blik",
  passata: "tomaat blik",
  "tomato purée": "puree tomaten",
  "tomato puree": "puree tomaten",
  "tomato paste": "puree tomaten",
  potato: "aardappel",
  "new potato": "aardappel",
  "sweet potato": "aardappel zoete",
  carrot: "wortel",
  celery: "selderij bleek",
  leek: "prei",
  zucchini: "courgette",
  eggplant: "aubergine",
  "red pepper": "paprika rode",
  "yellow pepper": "paprika gele",
  "green pepper": "paprika groene",
  "bell pepper": "paprika",
  mushroom: "champignon",
  spinach: "spinazie",
  cauliflower: "kool bloem",
  cabbage: "kool witte",
  "red cabbage": "kool rode",
  pea: "doperwten",
  "green bean": "bonen sperzie",
  chickpea: "erwten kikker",
  "kidney bean": "bonen kidney",
  "black bean": "bonen zwarte",
  "cannellini bean": "bonen witte",
  "butter bean": "bonen witte",
  "white bean": "bonen witte",
  lentil: "linzen",
  lettuce: "sla",
  rocket: "sla rucola",
  cucumber: "komkommer",
  sweetcorn: "mais",
  beetroot: "biet rode",
  squash: "pompoen",
  "butternut squash": "pompoen",
  pumpkin: "pompoen",
  fennel: "venkel",
  asparagus: "asperge",
  kale: "boerenkool",
  // Fruit
  lemon: "citroen",
  "lemon juice": "sap citroen",
  lime: "limoen",
  orange: "sinaasappel",
  apple: "appel",
  banana: "banaan",
  pear: "peer",
  strawberry: "aardbeien",
  blueberry: "bessen blauwe",
  raspberry: "frambozen",
  raisin: "rozijnen",
  // Kruiden en specerijen
  coriander: "koriander",
  parsley: "peterselie vers",
  basil: "basilicum vers",
  mint: "munt vers",
  thyme: "tijm",
  rosemary: "rozemarijn",
  dill: "dille",
  chive: "bieslook",
  "bay leaf": "laurier",
  cumin: "komijnzaad",
  "cumin seed": "komijnzaad",
  "coriander seed": "koriander",
  cayenne: "peper cayenne",
  "cayenne pepper": "peper cayenne",
  "smoked paprika": "paprikapoeder",
  "sweet paprika": "paprikapoeder",
  turmeric: "kurkuma",
  cinnamon: "kaneel",
  nutmeg: "nootmuskaat",
  "curry powder": "kerrie",
  pepper: "peper zwarte",
  "black pepper": "peper zwarte",
  salt: "zout zee",
  "sea salt": "zout zee",
  lemongrass: "citroengras",
  // Zuivel en ei
  egg: "ei kippen rauw",
  butter: "boter ongezouten",
  milk: "melk halfvolle",
  "whole milk": "melk volle",
  cream: "room kook",
  "single cream": "room kook",
  "double cream": "room slag",
  "whipping cream": "room slag",
  "sour cream": "room zure",
  "soured cream": "room zure",
  yoghurt: "yoghurt volle",
  yogurt: "yoghurt volle",
  "greek yoghurt": "yoghurt griekse",
  "greek yogurt": "yoghurt griekse",
  cheese: "kaas",
  parmesan: "kaas parmezaanse",
  // Vlees en vis
  chicken: "kip z vel rauw",
  "chicken breast": "kipfilet",
  "chicken thigh": "kip z vel rauw",
  "minced beef": "gehakt runder",
  "beef mince": "gehakt runder",
  mince: "gehakt runder",
  "pork mince": "gehakt varkens",
  beef: "rundvlees",
  pork: "varkensvlees",
  salmon: "zalm",
  cod: "kabeljauw",
  prawn: "garnalen",
  "king prawn": "garnalen",
  tuna: "tonijn",
  anchovy: "ansjovis",
  // Voorraadkast
  oil: "olie plantaardig",
  "olive oil": "olie olijf",
  "vegetable oil": "olie plantaardig",
  "sunflower oil": "olie zonnebloem",
  "groundnut oil": "olie arachide",
  "peanut oil": "olie arachide",
  "sesame oil": "olie sesam",
  vinegar: "azijn",
  "balsamic vinegar": "azijn balsamico",
  "soy sauce": "saus soja",
  honey: "honing",
  sugar: "suiker kristal",
  "coconut milk": "kokosmelk",
  "desiccated coconut": "kokos geraspt",
  almond: "noten amandelen ongezouten",
  "ground almond": "meel amandel",
  cashew: "noten cashew ongezouten",
  walnut: "noten wal ongezouten",
  "pine nut": "pijnboompitten",
  "sesame seed": "sesamzaad",
  flour: "bloem tarwe",
  "plain flour": "bloem tarwe",
  rice: "rijst witte",
  "basmati rice": "rijst witte",
  "brown rice": "rijst zilvervlies",
  mustard: "mosterd",
  chocolate: "chocolade puur",
  "dark chocolate": "chocolade puur",
  "cocoa powder": "cacaopoeder",
  olive: "olijven",
  caper: "kappertjes",
  wine: "wijn",
  "red wine": "wijn rode",
};

/** Het woord en zijn mogelijke enkelvouden ("chillies", "berries", "leaves"). */
function englishForms(word: string): string[] {
  const forms = [word];
  if (/ies$/.test(word)) forms.push(`${word.slice(0, -3)}y`);
  if (/ves$/.test(word)) forms.push(`${word.slice(0, -3)}f`);
  if (/es$/.test(word)) forms.push(word.slice(0, -2));
  if (/[^s]s$/.test(word)) forms.push(word.slice(0, -1));
  return forms;
}

/**
 * De NEVO-zoekterm voor een Engelse naam, of de naam zelf als er geen Engels
 * ingrediënt in staat. Het laatste ingrediënt telt: in het Engels staat het
 * hoofdwoord achteraan ("groundnut or vegetable oil", "salt and pepper").
 */
export function translateIngredient(name: string): string {
  const words = name.toLowerCase().split(/[\s-]+/).filter(Boolean);
  let found: string | null = null;
  for (let index = 0; index < words.length; ) {
    let length = Math.min(3, words.length - index);
    for (; length >= 1; length--) {
      const part = words.slice(index, index + length);
      const hit = englishForms(part[part.length - 1])
        .map((last) => [...part.slice(0, -1), last].join(" "))
        .map((key) => (Object.hasOwn(EN_NL, key) ? EN_NL[key] : null))
        .find(Boolean);
      if (hit) {
        found = hit;
        break;
      }
    }
    index += Math.max(length, 1);
  }
  return found ?? name;
}
