import type { Metadata } from "next";
import { BrochureExperience } from "./brochure-experience";

export const metadata: Metadata = {
  title: "ZWB Trainingsweekend Warsberg | ZWB Cycling",
  description:
    "Conceptbrochure voor een ZWB trainingsweekend op Landal Warsberg: routes, programma, kosten en eigen invulling.",
};

export default function BrochurePage() {
  return <BrochureExperience />;
}
