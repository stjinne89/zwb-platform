// Het bewijsniveau van een kennisartikel: hoe gegrond het kernadvies is.
//
// Dezelfde schaal en woorden als de protocollen (PROTOCOL_EVIDENCE in
// src/lib/protocols/types.ts): Stevig onderbouwd, Onderbouwd, Eerste
// aanwijzingen. Is de conclusie dat iets niet helpt, dan staat die in de badge
// ("Stevig onderbouwd: geen effect"); "Ketonen — Stevig onderbouwd" zou je
// anders lezen als "ketonen werken". Het staat naast het kenmerk Nieuwe methode
// (method-label.ts), dat geen oordeel geeft.
//
// Het beleid, de criteria en het niveau per artikel staan in
// docs/beoordelingsbeleid-bewijsniveau.md (goedgekeurd door de eigenaar,
// 2026-10-18). Een test houdt code en tabel gelijk.

import { PROTOCOL_EVIDENCE, PROTOCOL_EVIDENCE_LABELS } from "@/lib/protocols/types";

export const ARTICLE_EVIDENCE = PROTOCOL_EVIDENCE;
export type ArticleEvidence = (typeof ARTICLE_EVIDENCE)[number];

export const ARTICLE_EVIDENCE_LABELS: Record<ArticleEvidence, string> = PROTOCOL_EVIDENCE_LABELS;

/** De conclusie van een artikel dat zegt dat iets niet helpt, of schaadt. */
export const ARTICLE_CONCLUSIONS = ["geen-effect", "nadelig"] as const;
export type ArticleConclusion = (typeof ARTICLE_CONCLUSIONS)[number];

export const ARTICLE_CONCLUSION_LABELS: Record<ArticleConclusion, string> = {
  "geen-effect": "geen effect",
  nadelig: "nadelig",
};

/** De tekst van de badge: het niveau, en de conclusie als die er is. */
export function evidenceText(evidence: ArticleEvidence, conclusion?: ArticleConclusion | null): string {
  const level = ARTICLE_EVIDENCE_LABELS[evidence];
  return conclusion ? `${level}: ${ARTICLE_CONCLUSION_LABELS[conclusion]}` : level;
}

/** De legenda, in de volgorde van de schaal. Gelijk voor alle kennisbanken. */
export const ARTICLE_EVIDENCE_LEGEND: Record<ArticleEvidence, string> = {
  sterk: "consensus, meta-analyses, of meerdere onafhankelijke groepen die het eens zijn",
  matig: "meerdere studies in dezelfde richting, maar klein of van één groep",
  beperkt: "een paar kleine studies, of het mechanisme klopt",
};

export const ARTICLE_CONCLUSION_LEGEND: Record<ArticleConclusion, string> = {
  "geen-effect": "het onderzoek vond dat het niet helpt",
  nadelig: "het onderzoek vond dat het je prestatie schaadt",
};
