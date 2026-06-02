import type { Metadata } from "next";
import { StoryExperience } from "./story-experience";

export const metadata: Metadata = {
  title: "Het verhaal van ZWB | ZWB Cycling",
  description:
    "Een visuele tijdlijn van ZWB: van het eerste indoor-shirt naar de huidige clubidentiteit.",
};

export default function VerhaalPage() {
  return <StoryExperience />;
}
