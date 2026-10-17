// Het signaal als de laatste FTP-test niet past bij de vermogenscurve: voor het
// lid op Vermogen en voor de trainer op het rennerscherm. De rekenregel staat in
// ftpCheck() (lib/training/ftp-test.ts); de uitleg in de kennisbank.

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Power } from "@/components/power-unit";
import type { FtpCheck } from "@/lib/training/ftp-test";

export function FtpCheckNotice({
  check,
  ftpWatts,
  own,
}: {
  check: FtpCheck | null;
  ftpWatts: number;
  /** Op het eigen scherm van het lid "je", bij de trainer "de". */
  own: boolean;
}) {
  if (!check) return null;
  const pct = Math.abs(Math.round(check.deviation * 100));
  const references = [
    check.cpWatts != null ? (
      <span key="cp">
        CP <Power watts={check.cpWatts} />
      </span>
    ) : null,
    check.eftpWatts != null ? (
      <span key="eftp">
        eFTP <Power watts={check.eftpWatts} />
      </span>
    ) : null,
  ].filter(Boolean);

  return (
    <p className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <span>
        {own ? "Je laatste" : "De laatste"} FTP-test (<Power watts={ftpWatts} />) ligt {pct} %{" "}
        {check.deviation > 0 ? "boven" : "onder"} {own ? "je" : "de"} vermogenscurve (
        {references.map((node, index) => (
          <span key={index}>
            {index > 0 ? ", " : ""}
            {node}
          </span>
        ))}
        ).{" "}
        <Link href="/zwbeter-worden/kennis/ftp-test" className="underline">
          Wat de test meet
        </Link>
      </span>
    </p>
  );
}
