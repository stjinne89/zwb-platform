// Versie van deze mod; gelijk aan manifest.json (tests/unit/sauce-mod-version.test.ts).
export const MOD_VERSION = '0.4.0';

// Is `latest` nieuwer dan `current`? "0.10.0" is nieuwer dan "0.9.1".
export function isNewer(latest, current = MOD_VERSION) {
    const parts = (v) => String(v ?? '').split('.').map((n) => Number.parseInt(n, 10) || 0);
    const a = parts(latest);
    const b = parts(current);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
    }
    return false;
}
