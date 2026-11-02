// Nagebouwd naar de opmaak van ladder.cycleracing.club/summary (oktober 2026).

type Result = "WIN" | "DEFEND" | "LOSS" | "";

function formSquare(result: Result) {
  const letter = result === "LOSS" ? "L" : result ? "W" : "";
  const inner = result === "DEFEND" ? `<span style="font-size:0.9em; text-decoration:underline">${letter}</span>` : letter;
  return `<div class="formSquare d-inline-block position-relative text-center" style="; color:white; background:var(--form-${result.toLowerCase()})" title="${result}">\n             ${inner}\n     </div>`;
}

export function ladderRow(
  position: number,
  name: string,
  form: Result[],
  move: { cls: "upMove" | "downMove" | "staticMove"; steps?: number; zombie?: boolean },
) {
  const symbol = move.cls === "upMove" ? "▲" : move.cls === "downMove" ? "▼" : "=";
  return `<tr data-team-region="1"
data-team-id="${position}"
data-group="1"
data-position="${position}"
class="ladderRow ${move.zombie ? " zombieTeamRow " : "  "}" >
<td class="text-start nposCol" data-bs-toggle="tooltip" data-bs-title="% 0.0">
${position}
</td>
<td class="highlightBold">
${name}
</td>
<td class="expandedShow text-nowrap tableWidth-3 position-relative">
    <span class="d-flex" onclick="locationOpen('/teamStats/${position}')">
    ${form.map(formSquare).join("\n")}
     </span>
</td>
<td class="text-center posCol movePoss">
<div class="me-4 position-relative">
<div class="movebubble ${move.cls}">
<span class="position-absolute top-0 start-100 translate-middle badge" data-bs-toggle="tooltip" data-bs-title="Dead in 29 days">
${move.zombie ? " 🧟 " : ""}
</span>
${symbol}
${move.steps ?? ""}
</div>
</div>
</td>
</tr>`;
}

export function ladderSection(region: string, rows: string[], world = false) {
  const cls = world ? "aLadder pLadder world m-4" : `aLadder col-3 m-0 p-0 ${region}`;
  return `<section class="${cls} disable-scrollbars position-relative">
<h2 class="titlespan position-sticky top-0" style="background-color:var(--${region})">${region}</h2>
<table class="table template-ladder newladderTable table-borderless table-striped ">
<thead class="d-none"><tr><th>Pos</th><th>Name</th><th class="d-none d-md-table-cell">Avg</th><th class="d-none d-md-table-cell">Med</th><th class="d-none d-md-table-cell">Club</th><th>MOVE</th><th>actions</th></tr></thead>
<tbody class="ladderBody">
${rows.join("\n")}
</tbody></table></section>`;
}

export function dayRow(label: string) {
  return `<tr class="dayBounds"> <td colspan=50>${label}</td> </tr>`;
}

export function fixtureRow(time: string, home: string, away: string, route = "", powerups: string[] = [], today = true) {
  const pups = powerups
    .map((p) => `<img class="pup-small" src="/img/powerups/${p}.png"\ndata-bs-toggle="tooltip"\ntitle="${p}" alt="${p}">`)
    .join("\n");
  return `<tr class="${today ? "fixToday" : "fixFuture"}" data-id="1">
<td class="">${time}</td>
<td class="homeTeam text-end"><span class="teamOpener" data-team-id="1">${home}</span></td>
<td class="awayTeam"><span class="teamOpener" data-team-id="2">${away}</span></td>
<td>${route}</td>
<td>
${pups}
</td>
</tr>`;
}

export function resultRow(
  id: number,
  time: string,
  route: string,
  challenger: string,
  challengerScore: number,
  opponentScore: number,
  opponent: string,
) {
  const color = (mine: number, theirs: number) => (mine > theirs ? "text-success" : "text-secondary");
  return `<tr class="pubResultOpener" data-id="${id}">
<td class="datecol">${time}</td>
<td class="text-muted small">${route} </td> <td class="homeTeam text-end"><span class="teamOpener ">${challenger}</span></td>
<td class="score ${color(challengerScore, opponentScore)}">${challengerScore}</td>
<td class="score ${color(opponentScore, challengerScore)}">${opponentScore}</td>
<td class="awayTeam noVersus"><span class="teamOpener ">${opponent}</span></td>
<td class="text-muted small">Final</td>
</tr>`;
}

export function resultDay(date: string, rows: string[]) {
  return `<tbody class="dateBundle" data-date="${date}">
<tr class="dayBounds"><td colspan="50">${date}</td></tr>
${rows.join("\n")}
</tbody>`;
}

/** Openbare uitslagpagina (/public/result/<id>, november 2026), ingekort tot wat de parser leest. */
export function resultPage(opts: {
  eventId: number;
  routeId: number;
  route: string;
  laps: number;
  riders: Array<{ name: string; points: number; win: boolean; time: number; wkg: number }>;
}) {
  const rows = opts.riders
    .map(
      (rider, index) => `<tr data-finish-group="${index}" data-riderId="${300000 + index}" data-eventId="${opts.eventId}" class="analyse  ">
<td class="riderPos text-muted" > ${index + 1} </td>
<td class="riderScore ${rider.win ? "riderWinScore" : "riderLoseScore"}">
${rider.points}
</td>
<td class="riderName">
${rider.name}
</td>
<td class="riderRank" data-rider-score="1500">undefined undefined</td>
<td class="timeFormat text-end"    >${rider.time}</td>
<td class="powerFormat"   >${rider.wkg}</td>
<td class="hrFormat"      >140</td>
</tr>
<tr class="grpdivider" data-finish-group="${index + 1}"><td class="grpdefault" colspan=100></td></tr>`,
    )
    .join("\n");
  return `<html><body>
<div class="resultInfoSection container d-flex">
<div class="card text-bg-light w-100 specialBackground mobileExtend-200">
<div class="specialBackgroundBefore" style="background-image:url('/routeMap/${opts.routeId}')"> </div>
<div class="card-img-overlay text-start">
<div class="ribbon resultRibbon card-title"><b> Watopia </b></div>
<div class="h2 card-text">${opts.route}</div>
 <div class="h3">laps      <span class="dataFld">${opts.laps}</span></div>
<div class="resultLinks">
<a class="col btn" href="https://zwiftpower.com/events.php?zid=${opts.eventId}" target="_blank">ZwiftPower Result</a>
</div></div></div></div>
<table class="table resultTable presortable"><tbody>
${rows}
</tbody></table></body></html>`;
}

export function summaryPage(fixtures: string[], sections: string[], resultDays: string[] = []) {
  return `<html><body>
<div class="col aTab fixtureTab d-none py-4">
<table class="table">
<thead><tr><th>Time <span class="small">(UTC)</span></th><th></th><th></th><th>Route</th><th><img src="/img/powerup.png"></th></tr></thead>
<tbody>
${fixtures.join("\n")}
</tbody></table></div>
<div class="col aTab ladderTab py-4"><div class=""><div class="row gap-2 flex-nowrap m-2">
${sections.join("\n")}
</div></div></div>
<div class="col aTab resultsTab d-none py-4">
<table class="table resTable">
<thead><tr><th class="text-center datecol">Time</th><th></th><th class="text-end">Challenger</th><th class="score"></th><th class="score"></th><th>Opponent</th><th></th></tr></thead>
${resultDays.join("\n")}
</table></div>
</body></html>`;
}
