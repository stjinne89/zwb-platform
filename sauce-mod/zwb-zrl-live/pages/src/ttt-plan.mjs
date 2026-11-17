// ZWB TTT-plan — Sauce for Zwift-venster.
//
// Toont het plan uit de Export JSON van zwiftgopher.com/TTT en licht per renner
// het vermogen op dat bij zijn plek in de rij hoort: op kop de kopbeurt, daarachter
// het wiel op plek 2, 3 of 4. De plek komt uit het `nearby`-kanaal van Sauce. Het
// plan blijft in dit venster bewaard tot er een ander wordt ingeladen; er gaat
// niets naar het ZWB-platform.

import * as common from '/pages/src/common.mjs';
import {PositionTracker, columnFor, parsePlan, powerStatus, targetFor} from './ttt-plan-core.mjs';

const STORE_KEY = 'zwb-ttt-plan';

const app = document.getElementById('app');
const fileInput = document.getElementById('file');
let plan = null;
let tracker = null;
let live = {riders: new Map(), watchingId: null};
let error = null;

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const cell = (value) => (value == null ? '–' : esc(value));

function save(text) {
    try {
        localStorage.setItem(STORE_KEY, text);
    } catch {
        // Zonder opslag werkt het venster, maar moet het plan na een herstart opnieuw.
    }
}

function load(text, store = true) {
    try {
        plan = parsePlan(text);
        tracker = new PositionTracker(plan.riders.map((r) => r.id));
        live = {riders: new Map(), watchingId: null};
        error = null;
        if (store) save(text);
    } catch (e) {
        error = e.message;
    }
    render();
}

function header() {
    const facts = [
        plan.route,
        plan.distanceKm != null ? `${plan.distanceKm} km` : null,
        plan.elevationM != null ? `${plan.elevationM} m` : null,
    ].filter(Boolean).map(esc).join(' · ');
    return `
        <header>
            <div>
                <h1>${esc(plan.team || 'Ploegentijdrit')}</h1>
                <div class="muted">${facts}</div>
            </div>
            <div class="finish">
                ${plan.estimatedTime ? `<strong>${esc(plan.estimatedTime)}</strong>` : ''}
                <div class="muted">${plan.avgSpeedKmh != null ? `${plan.avgSpeedKmh} km/u` : ''}</div>
            </div>
            <button type="button" class="swap" data-action="pick" title="Ander plan">Plan</button>
        </header>`;
}

function row(rider) {
    const now = live.riders.get(rider.id);
    const column = columnFor(now?.position);
    const target = targetFor(rider, now?.position);
    const status = powerStatus(now?.power, target);
    const on = (col) => (column === col ? ' on' : '');
    const classes = [now ? '' : 'gone', rider.id === live.watchingId ? 'watch' : ''].filter(Boolean).join(' ');
    const sock = rider.color ? `<i class="sock" style="background:${rider.color}"></i>` : '';
    return `
        <tr class="${classes}">
            <td class="order">${rider.order}</td>
            <td class="name">${sock}${esc(rider.name)}</td>
            <td class="pull big${on(1)}">${cell(rider.pullWatts)}</td>
            <td class="pull">${cell(rider.pullWkg?.toFixed(1))}</td>
            <td class="pull">${cell(rider.pullSeconds)}</td>
            <td class="wheel${on(2)}">${cell(rider.wheel[2])}</td>
            <td class="wheel${on(3)}">${cell(rider.wheel[3])}</td>
            <td class="wheel${on(4)}">${cell(rider.wheel[4])}</td>
            <td>${cell(rider.intensityFactor)}</td>
            <td class="now ${status ?? ''}">${now ? `<span class="pos">${now.position}</span>${cell(now.power)}` : ''}</td>
        </tr>`;
}

function render() {
    if (!plan) {
        app.innerHTML = `
            <header><h1>ZWB TTT-plan</h1></header>
            <div class="drop" data-action="pick">
                <p>Sleep de Export JSON van ZwiftGopher hierheen of plak hem</p>
                <button type="button" data-action="pick">Bestand kiezen</button>
                ${error ? `<p class="error">${esc(error)}</p>` : ''}
            </div>`;
        return;
    }
    app.innerHTML = `
        ${header()}
        ${error ? `<p class="error">${esc(error)}</p>` : ''}
        <table>
            <thead>
                <tr class="group">
                    <th colspan="2"></th>
                    <th colspan="3" class="pull">Kopbeurt</th>
                    <th colspan="3" class="wheel">Wiel</th>
                    <th colspan="2"></th>
                </tr>
                <tr>
                    <th class="order">#</th>
                    <th class="name">Renner</th>
                    <th class="pull">W</th>
                    <th class="pull">W/kg</th>
                    <th class="pull">s</th>
                    <th class="wheel">2</th>
                    <th class="wheel">3</th>
                    <th class="wheel">4+</th>
                    <th>IF</th>
                    <th class="now">Nu</th>
                </tr>
            </thead>
            <tbody>${plan.riders.map(row).join('')}</tbody>
        </table>`;
}

function readFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => load(String(reader.result));
    reader.onerror = () => {
        error = 'Het bestand is niet te lezen.';
        render();
    };
    reader.readAsText(file);
}

app.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="pick"]')) fileInput.click();
});
fileInput.addEventListener('change', () => {
    readFile(fileInput.files?.[0]);
    fileInput.value = '';
});
document.addEventListener('dragover', (event) => event.preventDefault());
document.addEventListener('drop', (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) readFile(file);
    else {
        const text = event.dataTransfer?.getData('text');
        if (text) load(text);
    }
});
document.addEventListener('paste', (event) => {
    const text = event.clipboardData?.getData('text');
    if (text) load(text);
});

try {
    const stored = localStorage.getItem(STORE_KEY);
    if (stored) load(stored, false);
} catch {
    // Geen opslag: begin leeg.
}
render();

common.subscribe('nearby', (nearby) => {
    if (!tracker) return;
    live = tracker.update(nearby);
    render();
});
