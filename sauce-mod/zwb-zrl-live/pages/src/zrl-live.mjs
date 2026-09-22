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
    const status = data.final ? 'Eindstand' : started ? 'Voorlopig' : `Start ${clock(data.startAt)}`;

    const teams = data.teams.slice(0, TEAM_ROWS).map((t) => {
        const cls = t.own ? 'own' : me && t.team === me.team ? 'watch' : '';
        return `<li class="${cls}"><span class="rank">${t.rank}</span>` +
            `<span class="name">${esc(t.team)}</span><span class="pts">${t.total}</span></li>`;
    }).join('');

    const rider = me ? `
        <h2>In beeld</h2>
        <div class="rider watch">
            <span class="name">${myRank}. ${esc(me.name)}</span>
            <span class="pts">${me.total}</span>
        </div>
        <div class="muted">FAL ${me.fal} · FTS ${me.fts} · FIN ${me.fin}${me.team ? ` · ${esc(me.team)}` : ''}</div>` : '';

    const pass = data.lastPass ? `
        <h2>${esc(data.lastPass.name)}${data.lastPass.lap > 1 ? ` ${data.lastPass.lap}` : ''}</h2>
        <ol>${data.lastPass.top.map((c) => `<li class="${c.id === watchingId ? 'watch' : ''}">` +
            `<span class="rank">${c.fal}</span><span class="name">${esc(c.name)}</span></li>`).join('')}</ol>` : '';

    app.innerHTML = `
        <header>
            <h1>ZRL · ${esc(data.subgroup)}</h1>
            <span class="muted">${status} · ${data.starters} gestart</span>
        </header>
        <h2>Teams</h2>
        ${teams ? `<ol>${teams}</ol>` : '<p class="empty">Nog geen punten</p>'}
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
