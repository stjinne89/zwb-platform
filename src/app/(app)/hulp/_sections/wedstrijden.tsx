import { GuideCards } from "./guide-cards";
import { RacefitHelp } from "./racefit";

export function WedstrijdenHelp() {
  return (
    <>
      <GuideCards ids={["events", "teams"]} />
      <RacefitHelp id="racefit" />
      <GuideCards ids={["zwb-ds", "livestreamen", "zwbgame", "voorzpwelbokaal"]} />
    </>
  );
}
