// WTRL-waarden (migr. 0180) als invoer voor de TTT-planner. Een renner zonder
// account heeft geen vermogensprofiel; zFTP en zMAP van WTRL zijn dan het enige
// wat ZWB van hem weet. Zwift zelf geeft via het Zwift-ID geen zFTP of
// vermogenscurve van anderen (gemeten 2026-09-22).

export type WtrlTttRow = {
  trc_ref: string;
  zwift_id: string;
  zftp_w: number | string | null;
  zftp_wkg: number | string | null;
  zmap_wkg: number | string | null;
};

export type WtrlTttPower = {
  ftpWatts: number | null;
  /** Volgt uit zFTP in watt en in W/kg. */
  weightKg: number | null;
  /** zMAP in watt, als schatting van het 5-minutenvermogen. */
  power300Watts: number | null;
  /** De ZWB-teams waar de renner via WTRL in staat. */
  teamIds: string[];
};

function positive(value: number | string | null | undefined) {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function wtrlTttPower(
  rows: WtrlTttRow[],
  teamIdByRef: Map<string, string>,
): Map<string, WtrlTttPower> {
  const byZwiftId = new Map<string, WtrlTttPower>();
  for (const row of rows) {
    const zwiftId = row.zwift_id.trim();
    if (!zwiftId) continue;
    const zftpW = positive(row.zftp_w);
    const zftpWkg = positive(row.zftp_wkg);
    const zmapWkg = positive(row.zmap_wkg);
    const weight = zftpW && zftpWkg ? zftpW / zftpWkg : null;
    const previous = byZwiftId.get(zwiftId);
    const teamId = teamIdByRef.get(row.trc_ref);
    byZwiftId.set(zwiftId, {
      ftpWatts: previous?.ftpWatts ?? (zftpW ? Math.round(zftpW) : null),
      weightKg: previous?.weightKg ?? (weight ? Math.round(weight * 10) / 10 : null),
      power300Watts:
        previous?.power300Watts ?? (weight && zmapWkg ? Math.round(zmapWkg * weight) : null),
      teamIds:
        teamId && !previous?.teamIds.includes(teamId)
          ? [...(previous?.teamIds ?? []), teamId]
          : (previous?.teamIds ?? []),
    });
  }
  return byZwiftId;
}
