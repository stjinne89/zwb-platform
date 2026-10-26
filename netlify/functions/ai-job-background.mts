// Netlify-achtergrondfunctie voor Claude-opdrachten (zie src/lib/ai/claude.ts).
//
// Het achtervoegsel "-background" maakt dit een achtergrondfunctie: de aanroeper
// krijgt meteen 202 terug en de functie mag tot 15 minuten doorlopen, lang
// genoeg voor een schema-bijwerking (4 tot 6 minuten). Wie hem aanroept kan
// alleen een opdracht laten draaien die al in de rij staat; processClaudeJob
// claimt hem eerst, dus een tweede aanroep doet niets.

import { processClaudeJob } from "../../src/lib/ai/claude";

const handler = async (req: Request): Promise<void> => {
  let id: unknown;
  try {
    ({ id } = (await req.json()) as { id?: unknown });
  } catch {
    return;
  }
  if (typeof id === "string") await processClaudeJob(id);
};

export default handler;
