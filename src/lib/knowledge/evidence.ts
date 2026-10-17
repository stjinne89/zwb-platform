// Het bewijsniveau van een kennisartikel: hoe gegrond het centrale advies is.
//
// Dezelfde schaal als de protocollen (PROTOCOL_EVIDENCE in
// src/lib/protocols/types.ts), plus "afgeraden" voor een artikel dat iets
// afraadt: "Ketonen — Sterk bewijs" leest als "ketonen werken". Het staat naast
// het label veelbelovend of experimenteel (method-label.ts): het niveau zegt
// hoeveel en hoe goed onderzoek er is, het label of het effect al vaststaat.
//
// De criteria en het niveau per artikel staan in docs/bewijsniveau-kennisbank.md
// (goedgekeurd door de eigenaar, 2026-10-17). Een nieuw artikel krijgt een
// niveau volgens die criteria; een test eist dat elk artikel er een heeft.

import { PROTOCOL_EVIDENCE_LABELS } from "@/lib/protocols/types";

export const ARTICLE_EVIDENCE = ["sterk", "matig", "beperkt", "afgeraden"] as const;
export type ArticleEvidence = (typeof ARTICLE_EVIDENCE)[number];

export const ARTICLE_EVIDENCE_LABELS: Record<ArticleEvidence, string> = {
  ...PROTOCOL_EVIDENCE_LABELS,
  afgeraden: "Afgeraden",
};

/** De legenda, in de volgorde van de schaal. */
export const ARTICLE_EVIDENCE_LEGEND: Record<ArticleEvidence, string> = {
  sterk: "consensus, richtlijn of meerdere meta-analyses die het eens zijn",
  matig: "een meta-analyse of meerdere proeven, maar klein, van één groep of niet bij duursporters",
  beperkt: "een paar kleine studies, of een afgeleid advies",
  afgeraden: "het onderzoek wijst uit dat het niet helpt",
};
