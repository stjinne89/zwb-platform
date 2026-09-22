import Link from "next/link";
import {
  fitsDivision,
  parseDivision,
  recommendedDivision,
  wtrlCategory,
} from "@/lib/teams/wtrl-roster";

export type WtrlRosterTeam = {
  trcRef: string;
  name: string;
  division: string | null;
  importedAt: string;
  riders: Array<{
    zwiftId: string;
    name: string;
    status: "member" | "invited";
    zftpW: number | null;
    zftpWkg: number | null;
    zmapWkg: number | null;
    profileId: string | null;
  }>;
};

function fmt(value: number | null, digits: number) {
  if (value == null) return "-";
  return value.toLocaleString("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function WtrlRoster({ team }: { team: WtrlRosterTeam }) {
  const division = parseDivision(team.division);
  const women = division?.women ?? false;
  const riders = [...team.riders].sort(
    (a, b) => (b.zftpWkg ?? 0) - (a.zftpWkg ?? 0),
  );

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">
          WTRL · {team.name}
          {team.division && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {team.division}
            </span>
          )}
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {new Date(team.importedAt).toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "short",
            timeZone: "Europe/Amsterdam",
          })}
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-1 pr-3 font-medium">Renner</th>
              <th className="py-1 pr-3 font-medium">Cat</th>
              <th className="py-1 pr-3 text-right font-medium">zFTP</th>
              <th className="py-1 pr-3 text-right font-medium">w/kg</th>
              <th className="py-1 pr-3 text-right font-medium">zMAP w/kg</th>
              <th className="py-1 pr-3 font-medium">Advies</th>
              {division && <th className="py-1 font-medium">Divisie</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {riders.map((rider) => {
              const category = wtrlCategory(rider, women);
              const fits = division ? fitsDivision(rider, division) : null;
              return (
                <tr key={rider.zwiftId}>
                  <td className="py-1.5 pr-3">
                    {rider.profileId ? (
                      <Link href={`/leden/${rider.profileId}`} className="hover:underline">
                        {rider.name}
                      </Link>
                    ) : (
                      rider.name
                    )}
                    {rider.status === "invited" && (
                      <span className="ml-2 text-xs text-muted-foreground">uitgenodigd</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 font-medium">{category ?? "-"}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {rider.zftpW != null ? `${rider.zftpW} W` : "-"}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(rider.zftpWkg, 2)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(rider.zmapWkg, 2)}</td>
                  <td className="py-1.5 pr-3">{recommendedDivision(rider, women) ?? "-"}</td>
                  {division && (
                    <td className="py-1.5">
                      {fits === false ? (
                        <span className="font-medium text-destructive">Te sterk</span>
                      ) : fits ? (
                        <span className="text-muted-foreground">Past</span>
                      ) : (
                        "-"
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
