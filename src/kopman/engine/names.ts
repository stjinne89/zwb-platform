// Fictional rider names. First and last names are drawn per country from common
// names; surnames of well-known professional riders are left out on purpose so a
// card never reads as a real pro.

type NameSet = { weight: number; first: string[]; last: string[] };

export const NAMES: Record<string, NameSet> = {
  BEL: { weight: 14, first: ["Jens", "Senne", "Arno", "Lander", "Ruben", "Bram", "Kobe", "Jarne", "Milan", "Emiel", "Wannes", "Robbe"], last: ["Peeters", "Claes", "Wouters", "Goossens", "Hermans", "Van Damme", "De Smet", "Verhulst", "Lambrechts", "Dierickx", "Vermeulen", "Van Hove", "De Ridder", "Coppens", "Van Gorp", "Bogaert", "Verstraeten", "Moens"] },
  NED: { weight: 12, first: ["Daan", "Sem", "Thijs", "Joris", "Ruud", "Lars", "Jesse", "Niek", "Bart", "Wessel", "Tijmen", "Floris"], last: ["de Wit", "Hoekstra", "Kuipers", "van Dijk", "Smit", "Meijer", "Bosman", "Visser", "van Leeuwen", "Brouwer", "Dekker", "Postma", "Veenstra", "Vink", "Hendriks", "Koster", "van Rijn", "Zwart"] },
  FRA: { weight: 13, first: ["Lucas", "Théo", "Hugo", "Mathis", "Bastien", "Quentin", "Clément", "Adrien", "Florian", "Maxime", "Julien", "Baptiste"], last: ["Lefèvre", "Moreau", "Girard", "Fontaine", "Rousseau", "Chevalier", "Garnier", "Perrin", "Blanchard", "Mercier", "Lemoine", "Dufour", "Brunet", "Marchand", "Faure", "Renaud", "Picard", "Colin"] },
  ITA: { weight: 12, first: ["Lorenzo", "Matteo", "Davide", "Simone", "Andrea", "Riccardo", "Tommaso", "Federico", "Giacomo", "Nicolò", "Pietro", "Edoardo"], last: ["Romano", "Ricci", "Marino", "Greco", "Bruno", "Gallo", "Conti", "Costa", "Mancini", "Lombardi", "Barbieri", "Fontana", "Moretti", "Rinaldi", "Testa", "Sala", "Ferri", "Leone"] },
  ESP: { weight: 10, first: ["Pablo", "Álvaro", "Sergio", "Diego", "Iker", "Unai", "Javier", "Rubén", "Marcos", "Adrián", "Jon", "Gorka"], last: ["Ortega", "Navarro", "Molina", "Delgado", "Castro", "Ramos", "Serrano", "Morales", "Iglesias", "Vidal", "Garrido", "Cano", "Prieto", "Méndez", "Lozano", "Etxeberria", "Arrieta", "Zubiri"] },
  COL: { weight: 7, first: ["Brayan", "Camilo", "Andrés", "Jhonatan", "Daniel", "Santiago", "Sebastián", "Duván", "Harold", "Yeison"], last: ["Ríos", "Cárdenas", "Rojas", "Vargas", "Muñoz", "Ospina", "Pineda", "Zapata", "Cortés", "Salazar", "Arango", "Mejía", "Londoño"] },
  DEN: { weight: 7, first: ["Frederik", "Magnus", "Rasmus", "Emil", "Oliver", "Kasper", "Anders", "Mikkel", "Søren", "Tobias"], last: ["Nørgaard", "Lund", "Holm", "Krogh", "Dahl", "Thygesen", "Bak", "Skov", "Juhl", "Bech", "Kjær", "Lindholm"] },
  GBR: { weight: 6, first: ["Ollie", "Harry", "Callum", "Jack", "Owen", "Rhys", "Finn", "Lewis", "Toby", "Alfie"], last: ["Whitmore", "Hughes", "Carter", "Fletcher", "Marsh", "Holloway", "Pritchard", "Sutton", "Barlow", "Kendall", "Ashworth", "Greaves"] },
  GER: { weight: 6, first: ["Jonas", "Lukas", "Felix", "Niklas", "Tim", "Moritz", "Paul", "Jannik", "Leon", "Fabian"], last: ["Brandt", "Krüger", "Hoffmann", "Vogel", "Scholz", "Lorenz", "Busch", "Engel", "Hartmann", "Winkler", "Seidel", "Kühn"] },
  NOR: { weight: 4, first: ["Sindre", "Eirik", "Håkon", "Torstein", "Vegard", "Jørgen", "Sander", "Aksel"], last: ["Haugen", "Solberg", "Bakken", "Strand", "Lie", "Moen", "Berge", "Nygård", "Aas", "Dahle"] },
  AUS: { weight: 4, first: ["Mitch", "Zac", "Lachlan", "Cooper", "Riley", "Bailey", "Kai", "Hamish"], last: ["Whitfield", "Barrett", "O'Connell", "Lockyer", "Pearce", "Hadley", "Fraser", "McKenna"] },
  SLO: { weight: 5, first: ["Luka", "Žiga", "Matej", "Nejc", "Tilen", "Gašper", "Domen", "Anže"], last: ["Kovač", "Zupan", "Krajnc", "Horvat", "Mlakar", "Potočnik", "Golob", "Vidmar", "Kranjc"] },
};

const COUNTRIES = Object.entries(NAMES).flatMap(([code, set]) => Array<string>(set.weight).fill(code));

export function drawName(random: () => number, taken: Set<string>) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const country = COUNTRIES[Math.floor(random() * COUNTRIES.length)];
    const set = NAMES[country];
    const first = set.first[Math.floor(random() * set.first.length)];
    const last = set.last[Math.floor(random() * set.last.length)];
    const key = `${first} ${last}`;
    if (!taken.has(key)) {
      taken.add(key);
      return { first, last, country };
    }
  }
  throw new Error("Geen vrije rennersnaam meer");
}
