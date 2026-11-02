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

export function fixtureRow(
  time: string,
  home: string,
  away: string,
  route = "",
  powerups: string[] = [],
  today = true,
  ids: { fixtureId?: number; homeId?: number; awayId?: number } = {},
) {
  const pups = powerups
    .map((p) => `<img class="pup-small" src="/img/powerups/${p}.png"\ndata-bs-toggle="tooltip"\ntitle="${p}" alt="${p}">`)
    .join("\n");
  return `<tr class="${today ? "fixToday" : "fixFuture"}" data-id="${ids.fixtureId ?? 1}">
<td class="">${time}</td>
<td class="homeTeam text-end"><span class="teamOpener" data-team-id="${ids.homeId ?? 1}">${home}</span></td>
<td class="awayTeam"><span class="teamOpener" data-team-id="${ids.awayId ?? 2}">${away}</span></td>
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

type SignupRider = { zwiftId: number; name: string; position: number | null };

function signupRows(riders: SignupRider[], side: "home" | "away") {
  return riders
    .map(
      (rider) => `<tr data-rider-id="${rider.zwiftId}" data-is-nonladder="false" data-riderplayedyet="21" id="row_${rider.zwiftId}" class="hoverMe

" data-dq-reason="">
<td class="
rider-position-cell
sticky-col
" data-sticky-col="0" data-rider-id="${rider.zwiftId}" data-team="${side}" data-fixture-id="17729">${
        rider.position === null
          ? `<span class="position-indicator not-racing" title="Not racing - click to set as racing">-</span>`
          : `<span class="position-indicator" title="Position ${rider.position} - click to set as not racing">${rider.position}</span>`
      }</td>
<td data-goto="/rider/${rider.zwiftId}" class="text-nowrap sticky-col linkTo sticky-col" data-sticky-col="1"><div class="sticky-truncate">${rider.name}</div></td>
<td class=""><div class="d-flex flex-row position-relative gap-2"><div class="">✅</div></div></td>
<td class="text-center p-0 m-0" data-format="wkg" data-time="30" data-power-time="5">-</td>
</tr>`,
    )
    .join("\n");
}

function signupSection(cls: string, riders: SignupRider[], side: "home" | "away") {
  return `<section class="${cls} p-2 px-0 border rounded bg-light"><div class="powerTable-scroll-wrapper">
<table id="pt_${side}" class="table-sm newPowerTable sortable w-100  has-sticky-cols"><thead class="table-dark"><tr><th></th><th>Rider</th></tr></thead>
<tbody>${signupRows(riders, side)}</tbody></table></div></section>`;
}

/** Wedstrijdpagina achter login (/fixture/<id>, november 2026), ingekort tot wat de parser leest. */
export function fixturePage(opts: { route: string; laps: number; km: number; home: SignupRider[]; away: SignupRider[]; zwiftEventId?: number }) {
  return `<html><head><title>ZWBeasts v Galaxy Avengers</title></head><body>
<input type="hidden" name="zwiftEventId" id="fixture_zid" value="${opts.zwiftEventId ?? 5772909}">
<div class="tab-pane fade" id="pane-info" role="tabpanel">
<div class="card-img-overlay text-start">
<div class="ribbon resultRibbon card-title"><b>Scotland</b></div>
<div class="h2 card-text">${opts.route}</div>
<div class="h3">laps <span class="badge bg-danger">${opts.laps}</span></div>
<div class="lapsConv">Calculated at ${opts.km} km</div>
</div></div>
<div class="tab-pane fade active show" id="pane-signups" role="tabpanel">
<div class="downloadContainer"><section class="signups mt-4 container"></section>
<section class="modernSignins container overflow-auto">
${signupSection("homeTeamSignins", opts.home, "home")}
${signupSection("awayTeamSignins", opts.away, "away")}
<section class="mergeTeamSignins p-2 px-0 border rounded bg-light d-none"><table><tbody>${signupRows(opts.home, "home")}${signupRows(opts.away, "away")}</tbody></table></section>
</section></div></div>
</body></html>`;
}

/** Uitslagen van één team (/matchlist/results/<team>, achter login, november 2026). */
export function teamResultRow(opts: {
  id: number;
  time: string;
  home: string;
  homeScore: number;
  awayScore: number;
  away: string;
  route: string;
  stage?: string;
}) {
  const color = (mine: number, theirs: number) => (mine > theirs ? "text-success" : "text-secondary");
  return `<tr class="expandor" data-id="${opts.id}" data-region="1">
<td class="datecol">${opts.time}</td><td></td>
<td class="homeTeam text-end fw-bold">${opts.home}</td>
<td class="score lscore ${color(opts.homeScore, opts.awayScore)}">${opts.homeScore}</td><td class="text-center"></td>
<td class="score rscore ${color(opts.awayScore, opts.homeScore)}">${opts.awayScore}</td>
<td class="awayTeam noVersus fw-bold">${opts.away}</td>
<td class="text-muted small">${opts.route}</td>
<td class="text-muted small text-center">${opts.stage ?? "Finished"}</td>
</tr>
<tr class="d-none expandedResult text-center" data-race-id="${opts.id}"></tr>`;
}

export function teamResultsPage(days: Array<{ label: string; rows: string[] }>) {
  return `<html><body><div class="container w-100 matchlist-scroll"><table class="table resTable table-striped"><tbody id="thebody">
<tr class="headRow"><th>Date</th><th></th><th>Challenger</th><th></th><th></th><th></th><th>Opponent</th></tr>
${days.map((day) => `<tr class="dayBounds"><td colspan="50">${day.label}</td></tr>\n${day.rows.join("\n")}`).join("\n")}
</tbody></table></div></body></html>`;
}
