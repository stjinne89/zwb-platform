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

export function summaryPage(fixtures: string[], sections: string[]) {
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
</body></html>`;
}
