import type { ComponentType } from "react";
import type { HelpCategoryId } from "@/lib/help-categories";
import { BeginnenHelp } from "./beginnen";
import { BeheerHelp } from "./beheer";
import { ClubHelp } from "./club";
import { KennisHelp } from "./kennis";
import { KoppelenHelp } from "./koppelen";
import { LiveVolgenHelp } from "./live-volgen";
import { ProblemenHelp } from "./problemen";
import { RacenHelp } from "./racen";
import { SchemaHelp } from "./schema";
import { TrainingHelp } from "./training";
import { WedstrijdenHelp } from "./wedstrijden";
import { WorkoutsHelp } from "./workouts";

/** De inhoud van elke hulpcategorie; het bestand heet zoals de categorie. */
export const HELP_SECTIONS: Record<HelpCategoryId, ComponentType> = {
  beginnen: BeginnenHelp,
  koppelen: KoppelenHelp,
  club: ClubHelp,
  wedstrijden: WedstrijdenHelp,
  "live-volgen": LiveVolgenHelp,
  training: TrainingHelp,
  schema: SchemaHelp,
  workouts: WorkoutsHelp,
  racen: RacenHelp,
  kennis: KennisHelp,
  problemen: ProblemenHelp,
  beheer: BeheerHelp,
};
