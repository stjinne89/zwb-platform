// ZWB ZRL Live — Sauce for Zwift-mod.
//
// Volgt de renner die je in Zwift bekijkt, leidt uit diens subgroep het
// Zwift-event af en haalt elke 15 s de WTRL-puntenstand op bij het ZWB-platform
// (/api/live/zrl/[zwiftEventId]/[subgroupId]). Het platform rekent; deze mod
// toont alleen. Zie docs/live-zrl-dashboard.md.

import * as common from '/pages/src/common.mjs';

// ?server=http://localhost:3000 om tegen een lokale ontwikkelserver te testen.
const SERVER = new URLSearchParams(location.search).get('server') || 'https://zwb-platform.netlify.app';
const POLL_MS = 15_000;
const TEAM_ROWS = 8;

const app = document.getElementById('app');
let watchingId = null;
let subgroupId = null;
let target = null;
let data = null;
let timer = null;

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Racetijd vanaf de eigen start: "28:02.5".
function raceTime(ms) {
    if (ms == null) return '—';
    const tenths = Math.floor(ms / 100);
    return `${Math.floor(tenths / 600)}:${((tenths % 600) / 10).toFixed(1).padStart(4, '0')}`;
}

// Verschil met de ploeg waarmee vergeleken wordt: "+0:12", "-0:05".
function gapTime(ms) {
    const seconds = Math.round(Math.abs(ms) / 1000);
    return `${ms < 0 ? '-' : '+'}${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// Laatste tussentijd waar de eigen ploeg (anders de ploeg in beeld) doorheen is,
// met de andere ploegen ten opzichte daarvan. Zonder zo'n ploeg: de snelste.
function splitBlock(splits, watchTeam) {
    const isRef = (t) => t.own || (watchTeam && t.team === watchTeam);
    const split = [...splits].reverse().find((s) => s.teams.some((t) => t.own)) ||
        [...splits].reverse().find((s) => s.teams.some(isRef)) || splits.at(-1);
    if (!split) return '';
    const ref = split.teams.find((t) => t.own) || split.teams.find(isRef) || split.teams[0];
    const refAt = split.teams.indexOf(ref);
    // Rond de eigen ploeg, als die buiten de bovenste rijen valt.
    const from = Math.max(0, Math.min(refAt - TEAM_ROWS + 2, split.teams.length - TEAM_ROWS));
    const rows = split.teams.slice(from, from + TEAM_ROWS).map((t) => {
        const cls = t.own ? 'own' : t === ref ? 'watch' : '';
        return `<li class="${cls}"><span class="rank">${split.teams.indexOf(t) + 1}</span>` +
            `<span class="name">${esc(t.team)}</span><span class="pts">${t === ref ? '' : gapTime(t.gap - ref.gap)}</span></li>`;
    }).join('');
    return `<h2>Tussentijd · ${esc(split.name)}${split.lap > 1 ? ` ${split.lap}` : ''}</h2><ol>${rows}</ol>`;
}

function clock(ms) {
    return new Date(ms).toLocaleTimeString('nl-NL', {hour: '2-digit', minute: '2-digit'});
}

function render() {
    if (!subgroupId) {
        app.innerHTML = '<p class="empty">Geen race in beeld</p>';
        return;
    }
    if (!data) {
        app.innerHTML = '<p class="empty">Stand laden…</p>';
        return;
    }
    if (data.status !== 'ok') {
        const text = data.status === 'error' ? 'Stand niet bereikbaar' : 'Geen ZWB-race';
        app.innerHTML = `<p class="empty">${text}</p>`;
        return;
    }
    const me = data.riders.find((r) => r.id === watchingId);
    const myRank = me ? data.riders.indexOf(me) + 1 : null;
    const started = data.fetchedAt >= data.startAt;
    const ttt = data.format === 'ttt';
    const status = data.final ? 'Eindstand' : started ? 'Voorlopig' : `Start ${clock(data.startAt)}`;

    // In een TTT heeft een ploeg pas een tijd als de vierde renner binnen is.
    const teams = data.teams.filter((t) => !ttt || t.time != null).slice(0, TEAM_ROWS).map((t) => {
        const cls = t.own ? 'own' : me && t.team === me.team ? 'watch' : '';
        return `<li class="${cls}"><span class="rank">${t.rank}</span>` +
            `<span class="name">${esc(t.team)}</span><span class="pts">${ttt ? raceTime(t.time) : t.total}</span></li>`;
    }).join('');

    const splits = data.final ? '' : splitBlock(data.splits || [], me?.team);

    const rider = me ? `
        <h2>In beeld</h2>
        <div class="rider watch">
            <span class="name">${myRank}. ${esc(me.name)}</span>
            <span class="pts">${ttt ? raceTime(me.time) : me.total}</span>
        </div>
        <div class="muted">${ttt ? '' : `${data.format === 'scratch' ? '' : `FAL ${me.fal} · FTS ${me.fts} · `}FIN ${me.fin}`}${me.team ? `${ttt ? '' : ' · '}${esc(me.team)}` : ''}</div>` : '';

    const pass = data.lastPass ? `
        <h2>${esc(data.lastPass.name)}${data.lastPass.lap > 1 ? ` ${data.lastPass.lap}` : ''}</h2>
        <ol>${data.lastPass.top.map((c) => `<li class="${c.id === watchingId ? 'watch' : ''}">` +
            `<span class="rank">${c.fal}</span><span class="name">${esc(c.name)}</span></li>`).join('')}</ol>` : '';

    app.innerHTML = `
        <header>
            <h1>ZRL · ${esc(data.subgroup)}</h1>
            <span class="muted">${status} · ${data.starters} gestart</span>
        </header>
        ${teams ? `<h2>Teams</h2><ol>${teams}</ol>` : splits ? '' : `<p class="empty">${ttt ? 'Nog geen tijden' : 'Nog geen punten'}</p>`}
        ${splits}
        ${rider}
        ${pass}`;
}

async function poll() {
    clearTimeout(timer);
    if (target) {
        try {
            const r = await fetch(`${SERVER}/api/live/zrl/${target.eventId}/${target.subgroupId}`, {cache: 'no-store'});
            data = await r.json();
        } catch {
            data = {status: 'error'};
        }
    }
    render();
    timer = setTimeout(poll, POLL_MS);
}

async function retarget() {
    target = null;
    data = null;
    render();
    if (!subgroupId) {
        return;
    }
    try {
        const sg = await common.getEventSubgroup(subgroupId);
        if (sg?.eventId) {
            target = {eventId: sg.eventId, subgroupId};
        } else {
            data = {status: 'not-found'};
        }
    } catch {
        data = {status: 'error'};
    }
    await poll();
}

common.subscribe('athlete/watching', (watching) => {
    watchingId = watching?.athleteId ?? null;
    const next = watching?.state?.eventSubgroupId || null;
    if (next !== subgroupId) {
        subgroupId = next;
        retarget();
    } else if (data) {
        render();
    }
});

render();
