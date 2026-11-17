// ZWB TTT-plan — de rekenkant, zonder Sauce en zonder DOM, zodat hij te testen
// is (tests/unit/sauce-ttt-plan.test.ts).
//
// Export JSON van zwiftgopher.com/TTT, gemeten op versie 1.34.1 (2026-11-17):
// `riders` is een object per Zwift-ID met `name`, `order` (vanaf 0), `color`,
// `sIndex`, `pull_power`, `pull_power_wkg`, `pull_duration`, `pull_ftp_percent`,
// `IF` en `wheel_power` met de watt in het wiel op plek 2, 3 en 4. `plan` heeft
// route, afstand, hoogtemeters, geschatte tijd en gemiddelde. Getallen staan er
// soms als tekst in.

/** Hoe lang een renner op een nieuwe plek moet liggen voor die telt (metingen, één per seconde). */
export const SETTLE_SAMPLES = 2;
/** Over hoeveel metingen op dezelfde plek het live vermogen wordt gemiddeld. */
export const POWER_SAMPLES = 5;
/** Binnen deze marge rond het doel is het vermogen goed. */
export const POWER_MARGIN = 0.05;

function num(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const match = /^\s*(-?\d+(?:[.,]\d+)?)\s*$/.exec(String(value ?? ''));
    return match ? Number(match[1].replace(',', '.')) : null;
}

function positive(value) {
    const n = num(value);
    return n != null && n > 0 ? n : null;
}

function round(value, digits = 0) {
    if (value == null) return null;
    const f = 10 ** digits;
    return Math.round(value * f) / f;
}

/** Teamtags zoals "[ZWB]" en "(ZWB)" weg, zoals in de TTT Planner. */
function cleanName(name) {
    const clean = String(name ?? '').replace(/\[[^\]]*\]|\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
    return clean || String(name ?? '').trim();
}

/**
 * Het plan uit de Export JSON van ZwiftGopher. Gooit een fout met een korte
 * Nederlandse melding als het geen bruikbare export is.
 */
export function parsePlan(input) {
    const text = String(input ?? '').replace(/^﻿/, '').trim();
    if (!text.startsWith('{')) throw new Error('Dit is geen Export JSON van ZwiftGopher.');
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error('Dit is geen geldige JSON.');
    }
    const rows = data?.riders;
    if (typeof rows !== 'object' || !rows || Array.isArray(rows)) {
        throw new Error('Dit is geen Export JSON van ZwiftGopher.');
    }
    const riders = Object.entries(rows)
        .filter(([, r]) => typeof r === 'object' && r)
        .sort(([, a], [, b]) => (num(a.order) ?? 0) - (num(b.order) ?? 0))
        .map(([id, r], index) => {
            const wheel = {};
            for (const pos of [2, 3, 4]) wheel[pos] = round(positive(r.wheel_power?.[pos]));
            const pullWatts = round(positive(r.pull_power));
            const weight = positive(r.weight);
            return {
                id: /^\d+$/.test(id) ? Number(id) : null,
                order: index + 1,
                name: cleanName(r.alt_name || r.name) || `Renner ${index + 1}`,
                color: /^#[0-9a-f]{6}$/i.test(r.color ?? '') ? r.color : null,
                sIndex: round(num(r.sIndex)),
                pullWatts,
                pullWkg: round(positive(r.pull_power_wkg) ?? (pullWatts && weight ? pullWatts / weight : null), 1),
                pullSeconds: round(num(r.pull_duration)) ?? 0,
                ftpPercent: round(positive(r.pull_ftp_percent)),
                wheel,
                intensityFactor: round(positive(r.IF)),
            };
        });
    if (riders.length === 0) throw new Error('Geen renners gevonden in de export.');
    if (!riders.some((r) => r.id != null)) throw new Error('De export heeft geen Zwift-ID’s.');

    const plan = data.plan && typeof data.plan === 'object' ? data.plan : {};
    return {
        team: typeof data.team?.name === 'string' && data.team.name.trim() ? data.team.name.trim() : null,
        route: typeof plan.route === 'string' && plan.route.trim() ? plan.route.trim() : null,
        distanceKm: round(positive(plan.distance_km), 1),
        elevationM: round(positive(plan.elevation_m)),
        estimatedTime: typeof plan.estimated_time === 'string' ? plan.estimated_time : null,
        avgSpeedKmh: round(positive(plan.estimated_avg_speed), 1),
        riders,
    };
}

/**
 * Het doelvermogen van een renner op een plek in de rij: op kop zijn
 * kopbeurtvermogen, daarachter het wiel op plek 2, 3 of 4. Op plek 5 en verder
 * geldt plek 4: ZwiftGopher rekent niet verder en de draft verschilt daar weinig.
 */
export function targetFor(rider, position) {
    if (!rider || !position) return null;
    if (position === 1) return rider.pullWatts;
    return rider.wheel[Math.min(position, 4)] ?? null;
}

/** Plek als kolom: 1 is de kop, 2 tot 4 de wielkolommen. */
export function columnFor(position) {
    return position ? Math.min(position, 4) : null;
}

/** Live vermogen ten opzichte van het doel: 'ok', 'low' of 'high'. */
export function powerStatus(power, target, margin = POWER_MARGIN) {
    if (power == null || !target) return null;
    if (power < target * (1 - margin)) return 'low';
    if (power > target * (1 + margin)) return 'high';
    return 'ok';
}

/**
 * Volgt de plek van elke renner uit het plan in de rij. `update` krijgt elk
 * bericht van het `nearby`-kanaal van Sauce: per renner in de buurt
 * `athleteId`, `gap` in seconden ten opzichte van de renner in beeld (negatief
 * is ervoor) en `state.power`. Alleen renners uit het plan tellen mee.
 *
 * Een nieuwe plek telt pas als hij `SETTLE_SAMPLES` metingen dezelfde blijft:
 * renners die naast elkaar rijden, wisselen anders elke seconde van plek.
 */
export class PositionTracker {
    constructor(ids) {
        this.ids = new Set(ids.filter((id) => id != null));
        this.state = new Map();
        this.watchingId = null;
    }

    update(nearby) {
        const seen = [];
        let watchingId = null;
        for (const entry of Array.isArray(nearby) ? nearby : []) {
            const id = num(entry?.athleteId);
            if (entry?.watching && id != null) watchingId = id;
            if (id == null || !this.ids.has(id)) continue;
            const gap = num(entry.gap);
            if (gap == null) continue;
            seen.push({id, gap, power: num(entry.state?.power)});
        }
        if (watchingId != null) this.watchingId = watchingId;
        seen.sort((a, b) => a.gap - b.gap);

        const present = new Set();
        seen.forEach((rider, index) => {
            const raw = index + 1;
            present.add(rider.id);
            const s = this.state.get(rider.id) ?? {position: null, candidate: null, count: 0, powers: []};
            if (raw === s.position) {
                s.candidate = null;
                s.count = 0;
            } else if (raw === s.candidate) {
                s.count += 1;
            } else {
                s.candidate = raw;
                s.count = 1;
            }
            if (s.position == null || (s.candidate != null && s.count >= SETTLE_SAMPLES)) {
                s.position = raw;
                s.candidate = null;
                s.count = 0;
                s.powers = [];
            }
            if (rider.power != null) {
                s.powers.push(rider.power);
                if (s.powers.length > POWER_SAMPLES) s.powers.shift();
            }
            this.state.set(rider.id, s);
        });
        for (const id of [...this.state.keys()]) {
            if (!present.has(id)) this.state.delete(id);
        }
        return this.snapshot();
    }

    /** Per Zwift-ID de plek en het gemiddelde vermogen op die plek. */
    snapshot() {
        const riders = new Map();
        for (const [id, s] of this.state) {
            const power = s.powers.length ? Math.round(s.powers.reduce((a, b) => a + b, 0) / s.powers.length) : null;
            riders.set(id, {position: s.position, power});
        }
        return {riders, watchingId: this.watchingId};
    }
}
