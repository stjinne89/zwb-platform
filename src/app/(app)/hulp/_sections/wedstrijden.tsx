import { GuideCards } from "./guide-cards";
import { RacefitHelp } from "./racefit";
import { SauceModHelp } from "./sauce-mod";

export function WedstrijdenHelp() {
  return (
    <>
      <GuideCards ids={["events", "teams"]} />
      <RacefitHelp id="racefit" />
      <GuideCards ids={["zwb-ds", "livestreamen", "zwbgame", "voorzpwelbokaal"]} />
      <SauceModHelp id="sauce-mod" />
    </>
  );
}
